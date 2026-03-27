import cv2
import numpy as np

class QueueEstimator:
    def __init__(self, lane_width_meters=3.5, roi_length_meters=50):
        self.lane_width = lane_width_meters
        self.roi_length = roi_length_meters
        self.homography_matrix = None
        
        # Default Homography Matrix (placeholder - needs calibration via clicks)
        # Assuming 640x480 frame.
        # Format: (Top-Left, Top-Right, Bottom-Right, Bottom-Left)
        # World Format: (0,0), (width,0), (width, length), (0, length)
        self.src_pts = np.float32([[200, 200], [440, 200], [640, 480], [0, 480]]) # Example View
        self.dst_pts = np.float32([[0, 0], [self.lane_width, 0], [self.lane_width, self.roi_length], [0, self.roi_length]])
        self.update_homography()

    def update_homography(self):
        self.homography_matrix = cv2.getPerspectiveTransform(self.src_pts, self.dst_pts)

    def pixel_to_meter(self, pixel_point):
        """
        Convert (x, y) pixel to (x_meter, y_meter) birds-eye view coordinates.
        """
        if self.homography_matrix is None:
            return (0, 0)
            
        point = np.array([[[pixel_point[0], pixel_point[1]]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(point, self.homography_matrix)
        return transformed[0][0]

    def calculate_queue_metrics(self, vehicle_boxes, roi_polygon, stop_line_y):
        """
        Calculate queue length and density for a specific lane.
        vehicle_boxes: List of (x1, y1, x2, y2)
        roi_polygon: List of (x, y) describing lane area
        stop_line_y: Y-coordinate of stop line in pixels
        """
        queue_length_meters = 0
        density_percent = 0
        
        roi_area_pixels = cv2.contourArea(np.array(roi_polygon))
        if roi_area_pixels == 0:
            return 0, 0
            
        vehicle_area_pixels = 0
        max_distance = 0
        
        for box in vehicle_boxes:
            x1, y1, x2, y2 = box
            # Vehicle Area
            vehicle_area_pixels += (x2 - x1) * (y2 - y1)
            
            # Queue Calculation: Distance from stop line to vehicle *bottom* (y2)
            # Assuming stop line is at the "bottom" of the ROI in image space (or top depending on view)
            # Let's verify standard camera view: objects further away have smaller Y (top of image).
            # If camera looks down the road, stop line is usually close to bottom (high Y).
            # Distance = stop_line_y - y2 (bottom of vehicle)
            
            # Convert both points to world coordinates (meters)
            p_stop = self.pixel_to_meter((0, stop_line_y))
            p_veh = self.pixel_to_meter((0, y2))
            
            # Distance in Y axis (longitudinal)
            dist = abs(p_stop[1] - p_veh[1])
            max_distance = max(max_distance, dist)
            
        density_percent = (vehicle_area_pixels / roi_area_pixels) * 100
        queue_length_meters = round(max_distance, 2)
        
        return queue_length_meters, round(density_percent, 2)

if __name__ == "__main__":
    estimator = QueueEstimator()
    print("Test Homography Transformation:")
    print("(320, 240) ->", estimator.pixel_to_meter((320, 240)))
