from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class TrafficData(Base):
    __tablename__ = "traffic_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    intersection_id = Column(String, default="INT-001", index=True)
    lane_id = Column(String, index=True) # "North", "South", "East", "West"
    vehicle_count = Column(Integer)
    queue_length = Column(Float) # In meters (estimated)
    pred_queue_length = Column(Float) # Predicted queue length for next cycle
    density = Column(Float) # Percentage 0-100
    avg_speed = Column(Float) # Estimated km/h

class SignalLog(Base):
    __tablename__ = "signal_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    intersection_id = Column(String, default="INT-001", index=True)
    active_lane = Column(String) # The lane that just turned GREEN
    green_duration = Column(Integer) # How long it stayed green
    red_duration = Column(Integer) # How long it was red before this
    mode = Column(String) # "Adaptive", "Fixed", "Manual"

class Violation(Base):
    """
    Stores automated traffic violation records with ANPR data.
    """
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, index=True) # Extracted by OCR
    violation_type = Column(String) # "Red Light Violation", "Speeding"
    timestamp = Column(DateTime, default=datetime.now)
    intersection_id = Column(String, default="INT-001")
    lane_id = Column(String) # "North", "South", "East", "West"
    fine_amount = Column(Float) # e.g. 500.00
    status = Column(String, default="Pending") # "Pending", "Paid", "Cancelled", "Disputed"
    evidence_image_path = Column(String) # Path to saved violation snapshot
    detection_confidence = Column(Float, nullable=True) # From YOLO
    ocr_confidence = Column(Float, nullable=True) # From EasyOCR
    source_type = Column(String, default="AI") # "AI" or "MANUAL"
    officer_id = Column(Integer, index=True, nullable=True) # Foreign key equivalent for User.id
    remarks = Column(String, nullable=True) # Manual entry notes
    speed_detected = Column(Float, nullable=True) # Specifically for speeding
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class ViolationRule(Base):
    __tablename__ = "violation_rules"

    id = Column(Integer, primary_key=True, index=True)
    violation_type = Column(String, unique=True, index=True)
    speed_min = Column(Float, nullable=True)
    speed_max = Column(Float, nullable=True)
    fine_amount = Column(Float)
    active_status = Column(String, default="Active")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String) # "CREATED", "STATUS_UPDATED"
    violation_id = Column(Integer, index=True)
    officer_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    changes_made = Column(String) # JSON string of changes



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Viewer") # "Admin", "Operator", "Viewer"
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    ip_address = Column(String)
    status = Column(String) # "Success", "Failed", "Locked"

class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    intersection_id = Column(String, default="INT-001", index=True)
    lane_id = Column(String, index=True)
    severity = Column(String) # "Low", "Medium", "High"
    involved_vehicles = Column(Integer, default=1)
    resolved_status = Column(String, default="Active") # "Active", "Resolved"
    evidence_path = Column(String, nullable=True)

class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    intersection_id = Column(String, default="INT-001", index=True)
    slot_id = Column(String, index=True)
    status = Column(String, default="Empty") # "Empty", "Occupied", "Violation"
    vehicle_plate = Column(String, nullable=True)
    entry_time = Column(DateTime, nullable=True)

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    report_type = Column(String) # "Traffic", "Accident", "Violation", "System"
    data_payload = Column(String) # JSON payload of report data
    generated_by = Column(String)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    component = Column(String, index=True) # "YOLO", "LSTM", "API", "DB"
    status = Column(String) # "Info", "Warning", "Error"
    message = Column(String)
    cpu_latency = Column(Float, nullable=True) # ms
