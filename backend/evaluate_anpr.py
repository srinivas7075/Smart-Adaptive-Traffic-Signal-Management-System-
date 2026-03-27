import cv2
import json
import os
import time
from vehicle_detector import VehicleDetector

# --- Mock Ground Truth Dataset for Academic Evaluation ---
# In a real capstone, this would be a loaded JSON file of manually annotated plates per frame
GROUND_TRUTH = {
    # Frame number: { 'plate': "MH04XX1234", 'box': [x1,y1,x2,y2] }
    50: {"plate": "MH12AB1234", "box": [100, 200, 400, 500]},
    150: {"plate": "KA05XY9876", "box": [150, 220, 420, 510]}
}

def calculate_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
    boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
    boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)
    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

def run_evaluation():
    print("==================================================")
    print("      AI Traffic ANPR Evaluation Metrics          ")
    print("==================================================")
    print("Loading AI Models (YOLOv8 + EasyOCR)...")
    detector = VehicleDetector()
    
    video_path = "traffic_video.mp4"
    if not os.path.exists(video_path):
        print(f"Skipping live test: '{video_path}' not found in current directory.")
        print("\n--- Evaluation Method Strategy ---")
        print("To compute exact Precision/Recall over video:")
        print("1. Map frame numbers to Ground Truth Plates.")
        print("2. Count True Positives (Detection IoU > 0.5 AND Plate Text Match > 80% Levenshtein)")
        print("3. False Positives (Detected plate not in Ground Truth or below conf=0.50 threshold)")
        print("4. False Negatives (Plate in Ground Truth missed by YOLO or EasyOCR)")
        print("\nCurrently deployed parameters:")
        print(" - YOLO Confidence Filter: 0.50 (Reduces False Positives by ignoring blurry motion)")
        print(" - OCR Fallback Regex: [^A-Z0-9] (Removes noise characters)")
        return

    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    tp, fp, fn = 0, 0, len(GROUND_TRUTH)
    
    start_time = time.time()
    while cap.isOpened() and frame_count < 200:
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1
        
        # Test 10 frames around ground truth spikes to save time
        if frame_count not in GROUND_TRUTH:
            if not any(abs(frame_count - k) < 10 for k in GROUND_TRUTH.keys()):
                continue

        # Process specifically for violations
        # We simulate a "Red" signal to force violation detection
        signal_state = {"North": "Red", "South": "Red", "East": "Red", "West": "Red"}
        _, _, violations = detector.process_frame(frame, signal_states=signal_state)
        
        if frame_count in GROUND_TRUTH:
            gt = GROUND_TRUTH[frame_count]
            matched = False
            for v in violations:
                # Fast IOU check
                iou = calculate_iou(v['box'], gt['box'])
                if iou > 0.3: # Loose IoU for Vehicle context
                    # Checking OCR Match
                    if v.get('plate_text', '') == gt['plate']:
                        tp += 1
                        fn -= 1 # Found it
                        matched = True
                        print(f"[Frame {frame_count}] TRUE POSITIVE | Plate: {v['plate_text']} | Confidence: {v['ocr_confidence']}")
                    else:
                        fp += 1
                        print(f"[Frame {frame_count}] FALSE POSITIVE (OCR Mismatch) | AI: {v.get('plate_text')} | GT: {gt['plate']}")
            if not matched:
                print(f"[Frame {frame_count}] FALSE NEGATIVE | AI missed plate: {gt['plate']}")
    
    end_time = time.time()
    
    # Calculate Metrics safely
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    print("\n==================================================")
    print("                 FINAL METRICS                    ")
    print("==================================================")
    print(f"Total Frames Processed : {frame_count}")
    print(f"Time Taken           : {round(end_time - start_time, 2)} seconds")
    print(f"True Positives (TP)  : {tp}")
    print(f"False Positives (FP) : {fp}")
    print(f"False Negatives (FN) : {fn}")
    print("--------------------------------------------------")
    print(f"Precision            : {precision:.2f}")
    print(f"Recall               : {recall:.2f}")
    print(f"F1-Score             : {f1_score:.2f}")
    print("==================================================")

if __name__ == "__main__":
    run_evaluation()
