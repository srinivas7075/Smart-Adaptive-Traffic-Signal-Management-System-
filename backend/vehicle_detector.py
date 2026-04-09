from ultralytics import YOLO
import cv2
import numpy as np
import easyocr
import re
import uuid

class VehicleDetector:
    def __init__(self, model_path="yolov8n.pt"):
        # Load a pretrained YOLOv8n model
        self.model = YOLO(model_path)
        # COCO class IDs for vehicles: car(2), motorcycle(3), bus(5), truck(7)
        self.vehicle_classes = [2, 3, 5, 7]
        # Load EasyOCR for ANPR (English)
        print("Loading EasyOCR Model for ANPR...")
        self.reader = easyocr.Reader(['en'], gpu=False) # Fallback to CPU for stability
        
        # Simple Tracking for Accidents/Violations
        self.vehicle_history = {} # {id: {'centroid': (x,y), 'speed': 0, 'stationary_frames': 0, 'violated': False}}
        self.next_id = 0

    def process_frame(self, frame, rois=None, signal_states=None):
        height, width = frame.shape[:2]
        mid_x, mid_y = width // 2, height // 2
        
        if rois is None:
            # Perspective-corrected Intersection Core bounds
            pt_TL = [int(width*0.35), int(height*0.3)]
            pt_TR = [int(width*0.65), int(height*0.3)]
            pt_BR = [int(width*0.8), int(height*0.7)]
            pt_BL = [int(width*0.2), int(height*0.7)]
            
            intersection_poly = np.array([pt_TL, pt_TR, pt_BR, pt_BL], np.int32)
            
            rois = {
                "North": np.array([[int(width*0.35), 0], [int(width*0.65), 0], pt_TR, pt_TL], np.int32),
                "South": np.array([[int(width*0.1), height], [int(width*0.9), height], pt_BR, pt_BL], np.int32),
                "East":  np.array([[width, int(height*0.2)], [width, int(height*0.8)], pt_BR, pt_TR], np.int32),
                "West":  np.array([[0, int(height*0.2)], [0, int(height*0.8)], pt_BL, pt_TL], np.int32),
            }
        else:
            # Fallback inner polygon for custom ROIs
            intersection_poly = np.array([
                [int(width*0.3), int(height*0.3)], [int(width*0.7), int(height*0.3)],
                [int(width*0.7), int(height*0.7)], [int(width*0.3), int(height*0.7)]
            ], np.int32)

        results = self.model(frame, conf=0.3, verbose=False)
        
        lane_data = {label: {'count': 0, 'queue_len': 0, 'density': 0} for label in rois.keys()}
        violations = []
        accidents = []
        
        overlay = frame.copy()
        for label, polygon in rois.items():
            color = (0, 255, 255)
            if signal_states and signal_states.get(label) == "Red":
                color = (0, 0, 255)
            elif signal_states and signal_states.get(label) == "Green":
                color = (0, 255, 0)
                
            cv2.polylines(overlay, [polygon], True, color, 2)
            cv2.putText(overlay, label, tuple(polygon[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            
        alpha = 0.3
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        vehicles_in_roi = {label: [] for label in rois.keys()}
        total_detected = 0
        current_centroids = {} # (cx, cy) -> {box, conf, lane}

        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) in self.vehicle_classes:
                    total_detected += 1
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    
                    detected_lane = None
                    for label, polygon in rois.items():
                        if cv2.pointPolygonTest(polygon, (cx, cy), False) >= 0:
                            detected_lane = label
                            break
                    
                    if detected_lane:
                        lane_data[detected_lane]['count'] += 1
                        vehicles_in_roi[detected_lane].append((x1, y1, x2, y2))
                        
                    current_centroids[(cx, cy)] = {'box': (x1, y1, x2, y2), 'conf': conf, 'lane': detected_lane}
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Tracking matches
        new_history = {}
        for cx, cy in current_centroids.keys():
            data = current_centroids[(cx, cy)]
            box = data['box']
            lane = data['lane']
            conf = data['conf']
            
            matched_id = None
            speed = 0
            violated = False
            
            for vid, vdata in self.vehicle_history.items():
                old_x, old_y = vdata['centroid']
                dist = np.sqrt((cx - old_x)**2 + (cy - old_y)**2)
                if dist < 100:
                    matched_id = vid
                    speed = dist
                    violated = vdata.get('violated', False)
                    break
                    
            if matched_id is None:
                matched_id = self.next_id
                self.next_id += 1
                origin_lane = lane
            else:
                origin_lane = self.vehicle_history[matched_id].get('origin_lane', lane)
                
            stationary_frames = 0
            if matched_id in self.vehicle_history:
                if speed < 2:
                    stationary_frames = self.vehicle_history[matched_id].get('stationary_frames', 0) + 1
            
            # Core status check
            is_in_intersection = (cv2.pointPolygonTest(intersection_poly, (cx, cy), False) >= 0)

            # RED LIGHT VIOLATION LOGIC
            # Use origin_lane for the signal state check, because the car might have crossed into another ROI.
            if signal_states and signal_states.get(origin_lane) == "Red" and not violated:
                if matched_id in self.vehicle_history:
                    was_in_intersection = self.vehicle_history[matched_id].get('in_intersection', False)
                    crossed = False
                    
                    # Target explicit explicit polygon bounding. If the car was NOT inside the dangerous intersection
                    # zone, but IS inside it now, and the light is Red => RED LIGHT VIOLATION.
                    if not was_in_intersection and is_in_intersection:
                        crossed = True
                        
                    if crossed:
                        violated = True
                        x1, y1, x2, y2 = box
                        plate_text = "UNKNOWN"
                        ocr_conf = 0.0

                        crop_img = frame[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
                        if crop_img.size > 0:
                            # Preprocess for better OCR (2x Upscale + Grayscale) -> removes destructive thresholding
                            crop_large = cv2.resize(crop_img, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
                            gray = cv2.cvtColor(crop_large, cv2.COLOR_BGR2GRAY)
                            
                            ocr_results = self.reader.readtext(gray)
                            if ocr_results:
                                best_res = max(ocr_results, key=lambda x: x[2])
                                raw_text = best_res[1]
                                clean_text = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
                                if len(clean_text) >= 3:
                                    plate_text = clean_text
                                    ocr_conf = float(best_res[2])

                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
                        cv2.putText(frame, f"VIOLATION", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                        
                        violations.append({
                            "lane": lane,
                            "box": [x1, y1, x2, y2],
                            "type": "Red Light Violation",
                            "timestamp": "now",
                            "confidence": round(conf, 3),
                            "plate_text": plate_text,
                            "ocr_confidence": round(ocr_conf, 3)
                        })

            new_history[matched_id] = {
                'centroid': (cx, cy),
                'speed': speed,
                'stationary_frames': stationary_frames,
                'box': box,
                'violated': violated,
                'origin_lane': origin_lane,
                'in_intersection': is_in_intersection
            }

        self.vehicle_history = new_history

        print(f"Detected vehicles: {total_detected}")
        cv2.putText(frame, f"TOTAL VEHICLES DETECTED: {total_detected}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
        
        # Accident Logic
        boxes_list = [v['box'] for v in current_centroids.values()]
        for i in range(len(boxes_list)):
            for j in range(i + 1, len(boxes_list)):
                boxA = boxes_list[i]
                boxB = boxes_list[j]
                
                xA = max(boxA[0], boxB[0])
                yA = max(boxA[1], boxB[1])
                xB = min(boxA[2], boxB[2])
                yB = min(boxA[3], boxB[3])
                interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
                
                if interArea > 0:
                    speedA = speedB = 0
                    for vdata in self.vehicle_history.values():
                        if vdata['box'] == boxA: speedA = vdata['speed']
                        if vdata['box'] == boxB: speedB = vdata['speed']
                        
                    if speedA < 2 and speedB < 2:
                        acc_lane = "Unknown"
                        for label, polygon in rois.items():
                            if cv2.pointPolygonTest(polygon, (xA, yA), False) >= 0:
                                acc_lane = label
                                break
                        
                        cv2.rectangle(frame, (xA, yA), (xB, yB), (0, 165, 255), -1)
                        cv2.putText(frame, "ACCIDENT ALERT", (xA, yA-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
                        
                        accidents.append({
                            "lane": acc_lane,
                            "box": [xA, yA, xB, yB],
                            "severity": "High",
                            "involved": 2
                        })

        # Calculate Queue Length and Density
        for label, boxes in vehicles_in_roi.items():
            roi_area = cv2.contourArea(rois[label])
            vehicle_area_sum = 0
            stopped_distances = []
            
            for (x1, y1, x2, y2) in boxes:
                vehicle_area_sum += (x2 - x1) * (y2 - y1)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                
                is_stopped = False
                for vdata in self.vehicle_history.values():
                    dist_to_hist = np.sqrt((cx - vdata['centroid'][0])**2 + (cy - vdata['centroid'][1])**2)
                    if dist_to_hist < 20: 
                        if vdata['speed'] < 2 or vdata['stationary_frames'] > 5:
                            is_stopped = True
                        break
                        
                if is_stopped:
                    dist = 0
                    if label == "North": dist = abs(cy - mid_y)
                    elif label == "South": dist = abs(cy - mid_y)
                    elif label == "East": dist = abs(cx - mid_x)
                    elif label == "West": dist = abs(cx - mid_x)
                    stopped_distances.append(dist)
                    
            density = (vehicle_area_sum / roi_area) * 100 if roi_area > 0 else 0
            lane_data[label]['density'] = round(density, 2)
            
            queue_dist_pixels = max(stopped_distances) if stopped_distances else 0
            lane_data[label]['queue_len'] = round(queue_dist_pixels * 0.15, 2)

        return frame, lane_data, violations, accidents

if __name__ == "__main__":
    # Test
    cap = cv2.VideoCapture("traffic_video.mp4") # Replace with valid path if testing locally
    detector = VehicleDetector()
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame, data, violations, accidents, parking = detector.process_frame(frame)
        cv2.imshow("Test", frame)
        if cv2.waitKey(1) == ord('q'): break
    cap.release()
    cv2.destroyAllWindows()
