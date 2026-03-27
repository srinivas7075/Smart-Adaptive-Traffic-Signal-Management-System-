import pandas as pd
import numpy as np
import datetime

def generate_synthetic_data(num_samples=10000, start_date=None, file_path="ml_training/prediction/synthetic_traffic_data.csv"):
    """
    Generates synthetic traffic data with realistic patterns (Rush hours, noise).
    Columns: timestamp, lane_id, vehicle_count, queue_length, density
    """
    if start_date is None:
        start_date = datetime.datetime.now()
        
    data = []
    
    # Simulation Parameters
    # Rush hours: 8am-10am (08-10), 5pm-7pm (17-19)
    # Normals: 0-15 vehicles
    # Peaks: 20-50 vehicles
    
    current_time = start_date
    lanes = ['North', 'South', 'East', 'West']
    
    print(f"Generating {num_samples} samples of synthetic traffic data...")
    
    for i in range(num_samples):
        # Time progression (e.g., every 1 min)
        current_time += datetime.timedelta(minutes=1)
        hour = current_time.hour
        
        # Base demand based on hour
        if (8 <= hour <= 10) or (17 <= hour <= 19):
            base_demand = np.random.randint(20, 45) # Heavy traffic
        elif (22 <= hour <= 5):
            base_demand = np.random.randint(0, 5)   # Night traffic
        else:
            base_demand = np.random.randint(5, 20)  # Normal traffic
            
        for lane in lanes:
            # Add some randomness per lane
            noise = np.random.randint(-3, 4)
            vehicle_count = max(0, base_demand + noise)
            
            # Derived metrics (approximate logic for consistency)
            # Queue Length approx proportional to count (in meters)
            # e.g., avg car length + gap = 6m. 
            # If count is high, queue is high.
            queue_length = round(vehicle_count * np.random.uniform(5.5, 6.5), 2)
            
            # Density (0-100%)
            # Max capacity of ROI ~ 50 cars?
            density = min(100.0, round((vehicle_count / 50.0) * 100, 2))
            
            data.append([current_time.isoformat(), lane, vehicle_count, queue_length, density])
            
    df = pd.DataFrame(data, columns=["timestamp", "lane_id", "vehicle_count", "queue_length", "density"])
    df.to_csv(file_path, index=False)
    print(f"Data saved to {file_path}")
    return file_path

if __name__ == "__main__":
    generate_synthetic_data()
