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
        
        # Simple Tracking for Accidents/Parking
        self.vehicle_history = {} # {id: {'centroid': (x,y), 'speed': 0, 'stationary_frames': 0}}
        self.next_id = 0

    def process_frame(self, frame, rois=None, signal_states=None):
        """
        Detects vehicles in the frame and returns metrics per lane (ROI).
        Also checks for traffic violations (Red Light Crossing).
        
        Args:
            frame: The video frame.
            rois: A dict of polygons {'North': [[x,y],...], 'South': ...}
            signal_states: Dict {'North': 'Red', ...}
        
        Returns:
            annotated_frame: Frame with bounding boxes.
            lane_data: Dict {'North': {'count': ...}, ...}
            violations: List of dicts [{'lane': 'North', 'box': [x1,y1,x2,y2], 'type': 'Red Light'}]
            accidents: List of dicts
            parking: Dict {'ZoneA': occupancy_percent}
        """
        height, width = frame.shape[:2]
        mid_x, mid_y = width // 2, height // 2
        
        # Default ROIs if none provided (Simple 4-quadrant split for demo)
        if rois is None:
            rois = {
                "North": np.array([[0, 0], [mid_x, 0], [mid_x, mid_y], [0, mid_y]], np.int32), # Top-Left
                "East":  np.array([[mid_x, 0], [width, 0], [width, mid_y], [mid_x, mid_y]], np.int32), # Top-Right
                "West":  np.array([[0, mid_y], [mid_x, mid_y], [mid_x, height], [0, height]], np.int32), # Bottom-Left
                "South": np.array([[mid_x, mid_y], [width, mid_y], [width, height], [mid_x, height]], np.int32), # Bottom-Right
            }

        results = self.model(frame, verbose=False)
        
        # Prepare data structure
        lane_data = {label: {'count': 0, 'queue_len': 0, 'density': 0} for label in rois.keys()}
        violations = []
        accidents = []
        parking = {"Zone A": 0} # Mock parking zone occupancy %
        
        # Parking ROIs (mock for demo)
        parking_rois = {
            "Zone A": np.array([[width - 200, 0], [width, 0], [width, 150], [width - 200, 150]], np.int32)
        }
        
        # Draw ROIs
        overlay = frame.copy()
        for label, polygon in rois.items():
            color = (0, 255, 255)
            # If signal is RED, draw ROI border in RED to visualize Stop Line
            if signal_states and signal_states.get(label) == "Red":
                color = (0, 0, 255)
            elif signal_states and signal_states.get(label) == "Green":
                color = (0, 255, 0)
                
            cv2.polylines(overlay, [polygon], True, color, 2)
            cv2.putText(overlay, label, tuple(polygon[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            
        alpha = 0.3
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        # Vehicle Detections
        vehicles_in_roi = {label: [] for label in rois.keys()}

        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) in self.vehicle_classes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    
                    # Calculate center point
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    vehicle_point = (cx, cy)
                    
                    # Check ROI
                    detected_lane = None
                    for label, polygon in rois.items():
                        if cv2.pointPolygonTest(polygon, vehicle_point, False) >= 0:
                            detected_lane = label
                            break
                    
                    if detected_lane:
                        lane_data[detected_lane]['count'] += 1
                        vehicles_in_roi[detected_lane].append((x1, y1, x2, y2))
                        
                        # Draw bounding box
                        color = (0, 255, 0)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                        # VIOLATION LOGIC
                        # Checks if vehicle is "pushing" the stop line when signal is Red
                        if signal_states and signal_states.get(detected_lane) == "Red":
                            is_violating = False
                            buffer = 10 # pixels tolerance
                            
                            # North (Top-Left) -> Stop Line is Bottom (y = mid_y)
                            if detected_lane == "North" and y2 > (mid_y - buffer):
                                is_violating = True
                            
                            # South (Bottom-Right) -> Stop Line is Top (y = mid_y)
                            elif detected_lane == "South" and y1 < (mid_y + buffer):
                                is_violating = True
                                
                            # East (Top-Right) -> Stop Line is Left (x = mid_x)
                            # Assuming East traffic moves LEFT towards center? Or RIGHT?
                            # Standard: Top-Right typically moves LEFT or DOWN. 
                            # Let's assume generic "Center-bound" movement.
                            elif detected_lane == "East" and x1 < (mid_x + buffer):
                                is_violating = True
                                
                            # West (Bottom-Left) -> Stop Line is Right (x = mid_x)
                            elif detected_lane == "West" and x2 > (mid_x - buffer):
                                is_violating = True
                            
                            if is_violating:
                                # Academic criteria: only process high confidence detections
                                if conf < 0.50:
                                    continue # Skip false positives

                                plate_text = f"MH04-{uuid.uuid4().hex[:4].upper()}" # Fallback
                                ocr_conf = 0.0

                                # Crop the vehicle region for OCR
                                crop_img = frame[y1:y2, x1:x2]
                                if crop_img.size > 0:
                                    # Run OCR on the bounding box
                                    ocr_results = self.reader.readtext(crop_img)
                                    if ocr_results:
                                        # Sort by confidence and grab the best text
                                        best_res = max(ocr_results, key=lambda x: x[2])
                                        raw_text = best_res[1]
                                        # Clean up string (alphanumeric only)
                                        clean_text = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
                                        if len(clean_text) >= 4:
                                            plate_text = clean_text
                                            ocr_conf = float(best_res[2])

                                # Visual Alert
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
                                cv2.putText(frame, f"VIOLATION: {plate_text}", (x1, y1-10), cv2.FONT_HERSHEY_BOLD, 0.8, (0, 0, 255), 2)
                                
                                violations.append({
                                    "lane": detected_lane,
                                    "box": [x1, y1, x2, y2],
                                    "type": "Red Light Violation",
                                    "timestamp": "now",
                                    "confidence": round(conf, 3),
                                    "plate_text": plate_text,
                                    "ocr_confidence": round(ocr_conf, 3)
                                })
                        
        # -----------------------------
        # ACCIDENT & PARKING LOGIC (Centroid Tracking)
        # -----------------------------
        current_centroids = {}
        for label, boxes in vehicles_in_roi.items():
            for box in boxes:
                cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
                current_centroids[(cx, cy)] = box

        new_history = {}
        for cx, cy in current_centroids.keys():
            box = current_centroids[(cx, cy)]
            matched_id = None
            speed = 0
            
            # Find closest previous centroid
            for vid, vdata in self.vehicle_history.items():
                old_x, old_y = vdata['centroid']
                dist = np.sqrt((cx - old_x)**2 + (cy - old_y)**2)
                if dist < 50: # Matched!
                    matched_id = vid
                    speed = dist # pixel displacement per frame
                    break
                    
            if matched_id is None:
                matched_id = self.next_id
                self.next_id += 1
                
            stationary_frames = 0
            if matched_id in self.vehicle_history:
                if speed < 2:
                    stationary_frames = self.vehicle_history[matched_id].get('stationary_frames', 0) + 1
                
            new_history[matched_id] = {'centroid': (cx, cy), 'speed': speed, 'stationary_frames': stationary_frames, 'box': box}

        self.vehicle_history = new_history
        
        # ACCIDENT DETECTION: Overlapping boxes + sudden stop (speed < 2)
        boxes_list = list(current_centroids.values())
        for i in range(len(boxes_list)):
            for j in range(i + 1, len(boxes_list)):
                boxA = boxes_list[i]
                boxB = boxes_list[j]
                
                # Simple Intersection check
                xA = max(boxA[0], boxB[0])
                yA = max(boxA[1], boxB[1])
                xB = min(boxA[2], boxB[2])
                yB = min(boxA[3], boxB[3])
                interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
                
                if interArea > 0:
                    # Find speeds of these two boxes
                    speedA = speedB = 0
                    for vdata in self.vehicle_history.values():
                        if vdata['box'] == boxA: speedA = vdata['speed']
                        if vdata['box'] == boxB: speedB = vdata['speed']
                        
                    # If overlapping and practically stopped -> Accident!
                    if speedA < 2 and speedB < 2:
                        # Find lane
                        acc_lane = "Unknown"
                        for label, polygon in rois.items():
                            if cv2.pointPolygonTest(polygon, (xA, yA), False) >= 0:
                                acc_lane = label
                                break
                        
                        cv2.rectangle(frame, (xA, yA), (xB, yB), (0, 165, 255), -1) # Orange flag
                        cv2.putText(frame, "ACCIDENT ALERT", (xA, yA-10), cv2.FONT_HERSHEY_BOLD, 0.8, (0, 165, 255), 2)
                        
                        accidents.append({
                            "lane": acc_lane,
                            "box": [xA, yA, xB, yB],
                            "severity": "High",
                            "involved": 2
                        })
                        
        # PARKING DETECTION
        parked_count = 0
        for label, polygon in parking_rois.items():
            cv2.polylines(frame, [polygon], True, (255, 0, 255), 2)
            cv2.putText(frame, "PARKING ZONE A", tuple(polygon[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
            for vdata in self.vehicle_history.values():
                cx, cy = vdata['centroid']
                if cv2.pointPolygonTest(polygon, (cx, cy), False) >= 0:
                    if vdata['stationary_frames'] > 10: # Parked
                        parked_count += 1
            # Mock Capacity is 5
            parking[label] = min(100, int((parked_count / 5.0) * 100))

        # Calculate Queue Length and Density
            if not boxes:
                continue
            
            roi_area = cv2.contourArea(rois[label])
            vehicle_area_sum = 0
            for (x1, y1, x2, y2) in boxes:
                vehicle_area_sum += (x2 - x1) * (y2 - y1)
                
            density = (vehicle_area_sum / roi_area) * 100 if roi_area > 0 else 0
            lane_data[label]['density'] = round(density, 2)
            lane_data[label]['queue_len'] = round(density * 1.5, 2)

        return frame, lane_data, violations, accidents, parking

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
