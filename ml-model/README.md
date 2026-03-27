# Smart Traffic ML Pipeline

This directory contains the complete Machine Learning pipeline for the Smart Adaptive Traffic Signal Management System.

## Architecture

1.  **Data Pipeline** (`data_prep/`): Handles dataset acquisition and processing.
2.  **Vehicle Detection** (`yolo_train/`): Fine-tunes YOLOv8 for vehicle detection.
3.  **Queue Analysis** (`queue_analysis/`): Estimates queue length using homography.
4.  **Traffic Prediction** (`prediction/`): Predicts future congestion using LSTM.

## 1. Data Preparation (Synthetic)

**Approach**: To enable immediate LSTM training without massive downloads, we generate realistic synthetic traffic data.

### Steps:
1.  **Generate Data**:
    ```bash
    python ml_training/prediction/generate_traffic_data.py
    ```
    -   Creates `ml_training/prediction/synthetic_traffic_data.csv`.
    -   Simulates 10,000 time-steps with rush hour patterns, noise, and night lulls.

## 2. Vehicle Detection (Pre-trained YOLOv8)

We use **YOLOv8 Nano (Pre-trained on COCO)**.
-   **Why?**: It already detects `car`, `bus`, `truck`, and `motorcycle` with high accuracy.
-   **No Training Needed**: We skip the fine-tuning step to save time/resources.
-   **Logic**: The `VehicleDetector` class filters detections for relevant classes (IDs 2, 3, 5, 7).

## 3. Queue Analysis

**Method**: ROI-based vehicle detection mapped to real-world distance via Homography.

### Usage:
```python
from ml_training.queue_analysis.homography_queue import QueueEstimator

estimator = QueueEstimator(lane_width_meters=3.5)
# ... inside interactive loop ...
# Click 4 points to calibrate view
# estimator.update_homography(src_points)
queue_length, density = estimator.calculate_queue_metrics(boxes, roi, stop_line_y)
```

## 4. Traffic Prediction (LSTM)

**Model**: 2-Layer LSTM (Long Short-Term Memory).
**Input**: Sequence of `[Vehicle Count, Queue Length, Density]`.
**Output**: Predicted Queue Length for next time step.

### Train:
```bash
python ml_training/prediction/lstm_model.py
```
This script trains the model on the generated `synthetic_traffic_data.csv` and saves `traffic_lstm.pth`.

## 5. Output Data Format

All modules communicate using the following JSON structure:

```json
{
  "timestamp": "2024-12-10T10:00:00",
  "lane_id": "North",
  "vehicle_count": 15,
  "queue_length": 45.5,    // Meters
  "density": 35.0,         // Percentage
  "predicted_queue": 50.2  // Meters (Next Step)
}
```

## 6. Optimization Logic

The backend `TrafficOptimizer` uses this data with:
-   **Proportional Allocation**: Green time $\propto$ Demand ($Q_{curr} + Q_{pred}$).
-   **Starvation Prevention**: Assigns $T_{min}$ to empty lanes to prevent skipping.
-   **Smoothing**: $T_{new} = \alpha T_{calc} + (1-\alpha) T_{prev}$ to avoid abrupt signal changes.
