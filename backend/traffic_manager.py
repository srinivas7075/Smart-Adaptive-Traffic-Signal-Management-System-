class TrafficManager:
    def __init__(self):
        # 4-way intersection state
        self.intersections = [
            {"id": 0, "label": "North", "signal": "Red", "timer": 0, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 0},
            {"id": 1, "label": "South", "signal": "Red", "timer": 0, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 1},
            {"id": 2, "label": "East", "signal": "Red", "timer": 0, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 2},
            {"id": 3, "label": "West", "signal": "Red", "timer": 0, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 3},
        ]
        self.current_green_index = -1
        self.lane_data_buffer = {} # Store latest data for next calculation

    def update_lane_data(self, lane_data):
        """
        lane_data: Dict {'North': {'count':..., 'queue':...}, ...}
        """
        for label, data in lane_data.items():
            count = data.get("count", 0)
            queue = data.get("queue_len", 0)
            
            # Update local state
            for lane in self.intersections:
                if lane["label"] == label:
                    lane["vehicle_count"] = count
                    lane["queue_len"] = queue
                    # Keep pred_queue to avoid breaking frontend immediately
                    lane["pred_queue"] = 0 
        
        self.lane_data_buffer = lane_data

    def next_cycle(self):
        """
        Switch to the next logic based on Highest Vehicle Count / Starvation Prevention.
        """
        # 1. Turn current Green to Red
        self.intersections[self.current_green_index]["signal"] = "Red"
        
        # 2. Increment waiting cycles for all other lanes (currently all are RED now)
        for i, lane in enumerate(self.intersections):
            if i != self.current_green_index:
                lane["waiting_cycles"] += 1
                
        # 3. Choose the next lane to be Green
        next_green_index = -1
        
        # Check for starvation (>= 3 cycles waiting)
        starved_lanes = [i for i, lane in enumerate(self.intersections) if lane["waiting_cycles"] >= 3 and i != self.current_green_index]
        if starved_lanes:
            # Pick the most starved lane, or if multiple, the one with highest count among them
            next_green_index = max(starved_lanes, key=lambda idx: self.intersections[idx]["vehicle_count"])
        else:
            # Pick the lane with the highest vehicle count that is currently RED
            red_lanes = [i for i, lane in enumerate(self.intersections) if i != self.current_green_index]
            if red_lanes:
                next_green_index = max(red_lanes, key=lambda idx: self.intersections[idx]["vehicle_count"])
            else:
                next_green_index = 0
            
            # Tie breaker: if all counts are 0, just pick the one that has been waiting the longest
            max_count = self.intersections[next_green_index]["vehicle_count"]
            if max_count == 0:
                next_green_index = max(red_lanes, key=lambda idx: self.intersections[idx]["waiting_cycles"])

        self.current_green_index = next_green_index
        
        # Calculate optimal time for THIS new green lane
        base_time = 10
        factor = 5 # 5 seconds per vehicle to aggressively scale up if traffic is heavy
        lane_count = self.intersections[self.current_green_index]["vehicle_count"]
        # Formula: T_d = base_time + (vehicle_count * factor). Clamped: 10 <= T_d <= 50
        new_time = base_time + (lane_count * factor)
        new_time = max(10, min(new_time, 50))
        
        # Set new Green
        self.intersections[self.current_green_index]["signal"] = "Green"
        self.intersections[self.current_green_index]["timer"] = new_time
        self.intersections[self.current_green_index]["waiting_cycles"] = 0
        
        return self.intersections

    def get_status(self):
        return {
            "intersections": self.intersections,
            "current_green": self.current_green_index
        }

    def reset(self):
        self.intersections = [
            {"id": 0, "label": "North", "signal": "Green", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 0},
            {"id": 1, "label": "South", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 1},
            {"id": 2, "label": "East", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 2},
            {"id": 3, "label": "West", "signal": "Red", "timer": 10, "vehicle_count": 0, "queue_len": 0, "pred_queue": 0, "waiting_cycles": 3},
        ]
        self.current_green_index = 0
