import csv
import os
import datetime

class DataLogger:
    def __init__(self, filepath="ml_training/prediction/traffic_data.csv"):
        self.filepath = filepath
        self.ensure_file()

    def ensure_file(self):
        if not os.path.exists(self.filepath):
            # Create directory if needed
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(["timestamp", "lane_id", "vehicle_count", "queue_length", "density"])

    def log_metrics(self, lane_id, count, queue_len, density):
        timestamp = datetime.datetime.now().isoformat()
        with open(self.filepath, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, lane_id, count, queue_len, density])

if __name__ == "__main__":
    logger = DataLogger()
    logger.log_metrics("North", 15, 45.5, 35.0)
    print(f"Logged sample data to {logger.filepath}")
