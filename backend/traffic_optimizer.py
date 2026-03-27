class TrafficOptimizer:
    def __init__(self, cycle_time=120, min_green=10, max_green=60, alpha=0.7):
        self.cycle_time = cycle_time
        self.min_green = min_green
        self.max_green = max_green
        self.alpha = alpha # Smoothing factor
        self.last_timings = {}

    def calculate_timings(self, lane_data):
        """
        lane_data: Dict {
            'North': {'count': 10, 'queue_len': 50, 'density': 0.2, 'pred_queue': 55},
            ...
        }
        Returns: Dict {'North': 25, ...} (Green times in seconds)
        """
        weights = {}
        total_weight = 0
        lanes = list(lane_data.keys())
        
        for lane in lanes:
            metrics = lane_data[lane]
            # queue_len is the primary demand metric
            q_curr = metrics.get('queue_len', 0)
            # Use prediction if available
            q_pred = metrics.get('pred_queue', q_curr) 
            
            # Robust Weight Calculation
            # w = Current Queue + Predicted Queue
            w = q_curr + q_pred
            weights[lane] = w
            total_weight += w
            
        # 1. Starvation Prevention Strategy
        # Distribute available "extra" time proportional to demand, ensuring everyone gets min_green.
        num_lanes = len(lanes)
        total_min_time = num_lanes * self.min_green
        
        # Available variable time to distribute
        variable_time = max(0, self.cycle_time - total_min_time)
        
        raw_timings = {}
        
        if total_weight == 0:
            # All queues empty -> Distribute equally
            equal_share = self.cycle_time // num_lanes
            for lane in lanes:
                raw_timings[lane] = equal_share
        else:
            for lane in lanes:
                # Base allocation
                t = self.min_green 
                
                # Additional allocation proportional to demand
                share = (weights[lane] / total_weight)
                t += share * variable_time
                
                # Clamp to max_green
                t = min(t, self.max_green)
                raw_timings[lane] = t

        # 2. Smoothing Constraint
        # Prevent abrupt changes: T_new = alpha * T_calc + (1 - alpha) * T_old
        final_timings = {}
        
        for lane, t_calc in raw_timings.items():
            t_prev = self.last_timings.get(lane, t_calc) # Default to current if first run
            
            t_smooth = (self.alpha * t_calc) + ((1 - self.alpha) * t_prev)
            
            # Ensure integer seconds for traffic light controller
            final_timings[lane] = int(round(t_smooth))
            
        # Update history
        self.last_timings = final_timings
        
        return final_timings
