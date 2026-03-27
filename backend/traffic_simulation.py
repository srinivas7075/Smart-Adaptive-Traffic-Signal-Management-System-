import cv2
import requests
import time
from vehicle_detector import VehicleDetector

# Configuration
API_URL = "http://localhost:8000/update_metrics"
CAMERA_ID = 0 # Default webcam. Change to video file path if needed.

import tkinter as tk
from tkinter import filedialog
import os

def run_simulation():
    print("--- Smart Traffic Simulation ---")
    print("1. Use Webcam (Live)")
    print("2. Select Video File")
    choice = input("Enter choice (1 or 2): ").strip()

    source = CAMERA_ID # Default 0
    is_video_file = False

    if choice == '2':
        print("Opening file dialog... Please check your taskbar if it doesn't appear on top.")
        try:
            root = tk.Tk()
            root.withdraw() # Hide the main window
            # Make it top most
            root.attributes('-topmost', True)
            file_path = filedialog.askopenfilename(
                title="Select Traffic Video File",
                filetypes=[("Video Files", "*.mp4 *.avi *.mov *.mkv"), ("All Files", "*.*")]
            )
            root.destroy()
            
            if file_path:
                source = file_path
                is_video_file = True
                print(f"Loaded Video: {source}")
            else:
                print("No file selected. Defaulting to Mock Mode.")
                source = None
        except Exception as e:
            print(f"Error opening file dialog: {e}")
            print("Please enter the full path to the video file manually:")
            source = input("Path: ").strip().strip('"')
            if os.path.exists(source):
                is_video_file = True
            else:
                source = None

    print("Initializing Vehicle Detector (YOLOv8)...")
    # detector = VehicleDetector() # Downloads model on first run
    
    use_mock_mode = False
    cap = None

    if source is not None:
        print(f"Opening Source: {source}...")
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print("Error: Could not open source. Switching to MOCK MODE.")
            use_mock_mode = True
    else:
        use_mock_mode = True

    if not use_mock_mode and cap is not None:
        print("Simulation Started. Press 'q' to exit.")
        detector = VehicleDetector()
        
        while True:
            ret, frame = cap.read()
            
            # Loop video if it ends
            if not ret and is_video_file:
                print("Video ended, restarting...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
                
            if not ret:
                print("Failed to grab frame (or end of stream).")
                break

            # Process frame
            annotated_frame, vehicle_count = detector.process_frame(frame)
            
            # Visualize
            cv2.imshow("Smart Traffic - AI View", annotated_frame)
            
            # Prepare payload
            payload = {
                "0": vehicle_count, 
                "1": max(0, vehicle_count - 2), # Mock
                "2": max(0, vehicle_count + 3), # Mock
                "3": 5 # Static
            }
            
            try:
                requests.post(API_URL, json=payload)
            except Exception as e:
                pass 

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        cap.release()
        cv2.destroyAllWindows()
    
    else:
        # MOCK MODE LOOP
        print("-" * 50)
        print("MOCK SIMULATION ACTIVE")
        print("Sending simulated random traffic data to backend...")
        print("Press Ctrl+C to stop.")
        print("-" * 50)
        
        import random
        try:
            while True:
                # Generate random realistic traffic counts
                count_main = random.randint(0, 15)
                payload = {
                    "0": count_main,
                    "1": random.randint(0, 10),
                    "2": random.randint(5, 20),
                    "3": random.randint(0, 5)
                }
                
                print(f"Simulating: {payload} vehicles")
                try:
                    requests.post(API_URL, json=payload)
                except Exception as e:
                    print(f"Failed to send update: {e}")
                
                time.sleep(1) # Update every second
        except KeyboardInterrupt:
            print("Mock simulation stopped.")

if __name__ == "__main__":
    run_simulation()
