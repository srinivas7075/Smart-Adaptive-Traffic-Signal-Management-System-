import torch
import numpy as np
import sys
import os

# Add ml_training to path to import LSTM model definition
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ml_training.prediction.lstm_model import TrafficLSTM

from traffic_optimizer import TrafficOptimizer

class TrafficManager:
    def __init__(self):
        # 4-way intersection state
        self.intersections = [
            {"id": 0, "label": "North", "signal": "Green", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0},
            {"id": 1, "label": "South", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0},
            {"id": 2, "label": "East", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0},
            {"id": 3, "label": "West", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0},
        ]
        self.current_green_index = 0
        self.optimizer = TrafficOptimizer()
        self.lane_data_buffer = {} # Store latest data for next calculation
        
        # Load Prediction Model
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = TrafficLSTM().to(self.device)
        self.model_loaded = False
        try:
            model_path = os.path.join(os.path.dirname(__file__), '..', 'ml_training', 'prediction', 'traffic_lstm.pth')
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.eval()
            self.model_loaded = True
            print("LSTM Traffic Prediction Model Loaded Successfully!")
        except Exception as e:
            print(f"Warning: Could not load LSTM model. Prediction disabled. Error: {e}")

    def predict_next_queue(self, lane, count, queue, density):
        """ Run inference on single sample to predict next queue length """
        if not self.model_loaded:
            return queue # Fallback: Assume no change
            
        # Prepare input: Needs sequence (1, 10, 3). For real-time, we might not have 10 steps.
        # We can pad or repeat current state for demo purposes if history not tracked.
        # Ideally, TrafficManager should track history. For now, we repeat current state.
        
        input_feat = np.array([count, queue, density])
        # Min-Max Normalization (using approx known max values from synthetic gen)
        # count~50, queue~300, density~100
        norm_feat = input_feat / np.array([50.0, 300.0, 100.0])
        
        # Create sequence of 10 identical steps (or use actual history if available)
        sequence = np.tile(norm_feat, (10, 1)) 
        input_tensor = torch.FloatTensor(sequence).unsqueeze(0).to(self.device) # (1, 10, 3)
        
        with torch.no_grad():
            pred = self.model(input_tensor)
            pred_val = pred.item()
            
        # Denormalize (Queue length was normalized by ~300)
        pred_queue = pred_val * 300.0
        return max(0, round(pred_queue, 2))

    def update_lane_data(self, lane_data):
        """
        lane_data: Dict {'North': {'count':..., 'queue':...}, ...}
        """
        
        # Add predictions to buffer
        for label, data in lane_data.items():
            count = data.get("count", 0)
            queue = data.get("queue_len", 0)
            density = data.get("density", 0)
            
            pred_q = self.predict_next_queue(label, count, queue, density)
            data["pred_queue"] = pred_q
            
            # Update local state
            for lane in self.intersections:
                if lane["label"] == label:
                    lane["vehicle_count"] = count
                    lane["queue_len"] = queue
                    lane["pred_queue"] = pred_q
        
        self.lane_data_buffer = lane_data

    def next_cycle(self):
        """
        Switch to the next light in sequence.
        Calculate timings for the *upcoming* phases based on current data.
        """
        # Turn current Green to Red
        self.intersections[self.current_green_index]["signal"] = "Red"
        
        # Move to next
        self.current_green_index = (self.current_green_index + 1) % 4
        
        # Calculate optimal time for THIS new green lane (and others for future reference)
        # In a real cycle based system, we'd calc all 4 at start of cycle.
        # Here we do dynamic adjustment per phase.
        
        # Prepare data for optimizer
        # Map list to dict if needed, but we have lane_data_buffer
        if not self.lane_data_buffer:
             # Fallback if no data yet
             new_time = 15
        else:
            optimized_timings = self.optimizer.calculate_timings(self.lane_data_buffer)
            current_label = self.intersections[self.current_green_index]["label"]
            new_time = optimized_timings.get(current_label, 15)
        
        # Set new Green
        self.intersections[self.current_green_index]["signal"] = "Green"
        self.intersections[self.current_green_index]["timer"] = new_time
        
        return self.intersections

    def get_status(self):
        return {
            "intersections": self.intersections,
            "current_green": self.current_green_index
        }

    def reset(self):
        self.intersections = [
            {"id": 0, "label": "North", "signal": "Green", "timer": 10, "vehicle_count": 0, "queue_len": 0},
            {"id": 1, "label": "South", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0},
            {"id": 2, "label": "East", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0},
            {"id": 3, "label": "West", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0},
        ]
        self.current_green_index = 0

