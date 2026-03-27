from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from typing import Optional
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from traffic_manager import TrafficManager
from vehicle_detector import VehicleDetector
from database import engine, SessionLocal, Base, get_db
from models import TrafficData, Violation, Accident, ParkingSlot, Report, SystemLog, User, ViolationRule, AuditLog
from auth import get_current_active_user

import asyncio
import cv2
import shutil
import os
import io
import datetime
import uuid

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",  # React Frontend
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import auth
app.include_router(auth.router)

import bcrypt

def seed_users(db: Session):
    from models import User
    users_to_seed = [
        {"username": "admin", "password": "admin123", "role": "Admin"},
        {"username": "operator", "password": "operator123", "role": "Operator"},
        {"username": "viewer", "password": "viewer123", "role": "Viewer"}
    ]
    for u in users_to_seed:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            hashed = bcrypt.hashpw(u["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_user = User(username=u["username"], hashed_password=hashed, role=u["role"])
            db.add(new_user)
            print(f"Default user created: {u['username']} (Role: {u['role']})")
    db.commit()

def seed_rules(db: Session):
    from models import ViolationRule
    rules_to_seed = [
        {"violation_type": "Speeding L1", "fine_amount": 1000.0, "speed_min": 1.0, "speed_max": 20.0},
        {"violation_type": "Speeding L2", "fine_amount": 2000.0, "speed_min": 21.0, "speed_max": 40.0},
        {"violation_type": "Speeding L3", "fine_amount": 5000.0, "speed_min": 41.0, "speed_max": 999.0},
        {"violation_type": "Red Light Violation", "fine_amount": 2000.0, "speed_min": None, "speed_max": None},
        {"violation_type": "No Helmet", "fine_amount": 1000.0, "speed_min": None, "speed_max": None},
        {"violation_type": "Seat Belt Violation", "fine_amount": 1000.0, "speed_min": None, "speed_max": None},
        {"violation_type": "Wrong Parking", "fine_amount": 500.0, "speed_min": None, "speed_max": None},
        {"violation_type": "Wrong Way", "fine_amount": 1500.0, "speed_min": None, "speed_max": None},
        {"violation_type": "Signal Obstruction", "fine_amount": 1500.0, "speed_min": None, "speed_max": None},
    ]
    for r in rules_to_seed:
        existing = db.query(ViolationRule).filter(ViolationRule.violation_type == r["violation_type"]).first()
        if not existing:
            new_rule = ViolationRule(**r)
            db.add(new_rule)
    db.commit()
# Mount static files for Violation images
os.makedirs("static/violations", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

manager = TrafficManager()

# Global variables
VIDEO_SOURCE = None
PROCESS_VIDEO = False
LATEST_FRAME_BYTES = None
VIDEO_TOTAL_FRAMES = 0
VIDEO_CURRENT_FRAME = 0
SEEK_TARGET_FRAME = -1

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        seed_users(db)
        seed_rules(db)
    finally:
        db.close()
        
    asyncio.create_task(run_traffic_cycle())
    asyncio.create_task(video_processing_loop())

# WebSocket Manager for Real-Time Alerts
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

ws_manager = ConnectionManager()
        
async def run_traffic_cycle():
    print("Starting Traffic Cycle Loop...")
    while True:
        status = manager.get_status()
        current_idx = status["current_green"]
        current_timer = status["intersections"][current_idx]["timer"]
        
        # Countdown helper (optional, just sleep for now)
        # We sleep in 1s intervals to check for interrupts if needed, but simple is fine
        if current_timer > 0:
            for i in range(current_timer):
                # Update status countdown for frontend
                manager.intersections[current_idx]["timer"] -= 1
                await asyncio.sleep(1)
        
        manager.next_cycle()
        # CRITICAL: Always yield to the event loop even if timer was 0
        await asyncio.sleep(0.1)

async def video_processing_loop():
    global VIDEO_SOURCE, PROCESS_VIDEO, LATEST_FRAME_BYTES, VIDEO_CURRENT_FRAME, SEEK_TARGET_FRAME
    print("Starting Video Processing Service...")
    detector = VehicleDetector()
    cap = None
    
    while True:
        if PROCESS_VIDEO and VIDEO_SOURCE:
            if cap is None or not cap.isOpened():
                print(f"Opening video source: {VIDEO_SOURCE}")
                cap = cv2.VideoCapture(VIDEO_SOURCE)
                VIDEO_TOTAL_FRAMES = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if SEEK_TARGET_FRAME != -1 and cap and cap.isOpened():
                cap.set(cv2.CAP_PROP_POS_FRAMES, SEEK_TARGET_FRAME)
                SEEK_TARGET_FRAME = -1

            ret, frame = cap.read()
            if not ret:
                if cap and cap.isOpened():
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                await asyncio.sleep(0.1)
                continue
            
            VIDEO_CURRENT_FRAME = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
            
            # Prepare Signal States for Detector
            status = manager.get_status()
            signal_states = {i['label']: i['signal'] for i in status['intersections']}

            # Process frame for detection and annotation
            annotated_frame, lane_data, violations, accidents, parking = detector.process_frame(frame, signal_states=signal_states)
            
            # Encode frame to memory for streaming
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            if ret:
                LATEST_FRAME_BYTES = buffer.tobytes()

            # Update Traffic Manager
            manager.update_lane_data(lane_data)
            
            db = SessionLocal()
            try:
                # Handle Violations
                if violations:
                    for v in violations:
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"violation_{v['lane']}_{timestamp}_{uuid.uuid4().hex[:6]}.jpg"
                        filepath = os.path.join("static/violations", filename)
                        x1, y1, x2, y2 = v['box']
                        h, w, _ = frame.shape
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(w, x2), min(h, y2)
                        crop = frame[y1:y2, x1:x2]
                        if crop.size > 0:
                            cv2.imwrite(filepath, crop)
                            new_violation = Violation(
                                lane_id=v['lane'],
                                violation_type=v['type'],
                                plate_number=v.get('plate_text', f"MH-{uuid.uuid4().hex[:4].upper()}"),
                                evidence_image_path=f"/static/violations/{filename}",
                                fine_amount=1000.0 if v['type'] == "Red Light Violation" else 500.0,
                                status="Pending",
                                detection_confidence=v.get('confidence', 0.85),
                                ocr_confidence=v.get('ocr_confidence', 0.0)
                            )
                            db.add(new_violation)
                            
                            # Broadcast Alert via WebSocket
                            await ws_manager.broadcast({
                                "type": "VIOLATION_ALERT",
                                "data": {
                                    "plate": new_violation.plate_number,
                                    "lane": v['lane'],
                                    "violation_type": v['type']
                                }
                            })
                            
                # Handle Accidents
                if accidents:
                    for a in accidents:
                        new_accident = Accident(
                            lane_id=a['lane'],
                            severity=a['severity'],
                            involved_vehicles=a['involved'],
                            resolved_status="Active"
                        )
                        db.add(new_accident)
                        
                        # Broadcast Alert
                        await ws_manager.broadcast({
                            "type": "ACCIDENT_ALERT",
                            "data": {
                                "lane": a['lane'],
                                "severity": a['severity']
                            }
                        })
                
                # Handle Parking (Mock Upsert)
                for zone, occupancy in parking.items():
                    # Simple Insert with occupancy percentage mapped to generic status for now
                    ps = ParkingSlot(
                        slot_id=zone,
                        status=f"{occupancy}% Occupied",
                        entry_time=datetime.datetime.utcnow()
                    )
                    db.add(ps)

                db.commit()
            except Exception as e:
                print(f"DB Error: {e}")
                db.rollback()
            finally:
                db.close()
            await asyncio.sleep(0.01) # Small delay to not hog CPU
        else:
            if cap:
                cap.release()
                cap = None
            await asyncio.sleep(1)

def generate_frames():
    global LATEST_FRAME_BYTES
    while True:
        if LATEST_FRAME_BYTES:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + LATEST_FRAME_BYTES + b'\r\n')
        else:
            pass
        import time
        time.sleep(0.05)

@app.get("/")
def read_root():
    return {"message": "Smart Traffic Management System API is Running"}

@app.get("/status")
def get_traffic_status():
    return manager.get_status()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/v1/violations")
def get_violations(db: Session = Depends(get_db)):
    return db.query(Violation).order_by(desc(Violation.timestamp)).limit(50).all()

@app.get("/api/v1/violations/search")
def search_violations(plate_number: str, db: Session = Depends(get_db)):
    # Case-insensitive partial search
    return db.query(Violation).filter(Violation.plate_number.ilike(f"%{plate_number}%")).order_by(desc(Violation.timestamp)).all()

@app.get("/api/v1/rules")
def get_violation_rules(db: Session = Depends(get_db)):
    return db.query(ViolationRule).filter(ViolationRule.active_status == "Active").all()

@app.put("/api/v1/violations/{id}/status")
def update_violation_status(id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    v = db.query(Violation).filter(Violation.id == id).first()
    if v:
        old_status = v.status
        v.status = status
        
        # Audit Log
        audit = AuditLog(
            action_type="STATUS_UPDATED",
            violation_id=v.id,
            officer_id=current_user.id,
            changes_made=f'{{"old_status": "{old_status}", "new_status": "{status}"}}'
        )
        db.add(audit)
        
        db.commit()
        return {"status": "Updated", "id": id, "new_status": status}
    return {"error": "Not found"}

@app.get("/api/v1/accidents")
def get_accidents(db: Session = Depends(get_db)):
    return db.query(Accident).order_by(desc(Accident.timestamp)).limit(20).all()

@app.put("/api/v1/accidents/{id}/resolve")
def resolve_accident(id: int, db: Session = Depends(get_db)):
    acc = db.query(Accident).filter(Accident.id == id).first()
    if acc:
        acc.resolved_status = "Resolved"
        db.commit()
        return {"status": "Resolved", "id": id}
    return {"error": "Not found"}

# ---------- New Manual E-Challan Endpoints ----------
@app.post("/api/v1/violations/manual", response_model=dict)
async def create_manual_violation(
    plate_number: str = Form(...),
    violation_type: str = Form(...),
    intersection_id: str = Form(...),
    lane_id: str = Form("Unknown"),
    remarks: Optional[str] = Form(""),
    speed_detected: Optional[float] = Form(None),
    evidence_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Enforce RBAC
    if current_user.role not in ["Admin", "Operator"]:
        raise HTTPException(status_code=403, detail="Not authorized to issue manual challans")

    # Image Validation
    if not evidence_image.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Invalid evidence format. JPG/PNG required.")
    
    file_bytes = await evidence_image.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Evidence image size exceeds 5MB limit.")

    # Duplicate Protection - 10 minutes
    ten_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
    duplicate = db.query(Violation).filter(
        Violation.plate_number == plate_number,
        Violation.violation_type == violation_type,
        Violation.timestamp >= ten_mins_ago
    ).first()
    
    if duplicate:
        raise HTTPException(status_code=409, detail=f"Duplicate violation for plate {plate_number} within 10 minutes.")

    # Rule Validation & Fine Calculation
    fine_amount = 0
    if violation_type == "Speeding" and speed_detected is not None:
        over_limit = max(0, speed_detected - 60) # Assuming 60km/h limit for example
        if over_limit <= 20: target_type = "Speeding L1"
        elif over_limit <= 40: target_type = "Speeding L2"
        else: target_type = "Speeding L3"
            
        rule = db.query(ViolationRule).filter(ViolationRule.violation_type == target_type).first()
        if rule: fine_amount = rule.fine_amount
        else: fine_amount = 1000 # Fallback
    else:
        rule = db.query(ViolationRule).filter(ViolationRule.violation_type == violation_type).first()
        if rule: fine_amount = rule.fine_amount
        else: fine_amount = 1000 # Fallback
        
    if fine_amount <= 0:
        raise HTTPException(status_code=400, detail="Could not calculate fine amount for given rule.")

    # Save evidence locally
    upload_dir = "static/violations"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(evidence_image.filename)[1]
    filename = f"manual_{uuid.uuid4().hex}{ext}"
    filepath = f"{upload_dir}/{filename}"
    
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # Insert DB
    new_violation = Violation(
        plate_number=plate_number,
        violation_type=violation_type,
        intersection_id=intersection_id,
        lane_id=lane_id,
        fine_amount=fine_amount,
        status="Pending",
        source_type="MANUAL",
        officer_id=current_user.id,
        remarks=remarks,
        speed_detected=speed_detected,
        evidence_image_path=filepath
    )
    db.add(new_violation)
    db.commit()
    db.refresh(new_violation)
    
    # Audit log
    audit = AuditLog(
        action_type="CREATED",
        violation_id=new_violation.id,
        officer_id=current_user.id,
        changes_made=f'{{"plate": "{plate_number}", "type": "{violation_type}", "fine": {fine_amount}}}'
    )
    db.add(audit)
    db.commit()

    # Broadcast Manual Alert
    try:
        await ws_manager.broadcast({
            "type": "VIOLATION_ALERT",
            "source": "MANUAL",
            "data": {
                "plate": new_violation.plate_number,
                "type": new_violation.violation_type,
                "fine": new_violation.fine_amount,
                "officer": current_user.username
            }
        })
    except:
        pass

    return {"status": "success", "id": new_violation.id, "message": "Manual violation logged successfully."}


@app.get("/api/v1/parking/occupancy")
def get_parking_occupancy(db: Session = Depends(get_db)):
    # Get latest parking data per slot
    latest_slots = db.query(ParkingSlot).order_by(desc(ParkingSlot.timestamp)).limit(10).all()
    return latest_slots

@app.get("/api/v1/system/kpi")
def get_system_kpis(db: Session = Depends(get_db)):
    from sqlalchemy import func
    today = datetime.datetime.utcnow().date()
    
    # 1. Total Violations Today
    total_violations = db.query(Violation).filter(func.date(Violation.timestamp) == today).count()
    
    # 2. Active Accidents
    active_accidents = db.query(Accident).filter(Accident.resolved_status == "Active").count()
    
    # 3. Average Parking Occupancy
    slots = db.query(ParkingSlot).order_by(desc(ParkingSlot.timestamp)).limit(10).all()
    avg_parking = 0
    if slots:
        occupancies = []
        for s in slots:
            try:
                # "80% Occupied" -> 80
                val = int(s.status.split('%')[0])
                occupancies.append(val)
            except:
                pass
        if occupancies:
            avg_parking = sum(occupancies) / len(occupancies)
            
    # 4. System Health (Mock / Simple)
    ai_accuracy = 94.5
    detection_latency = 45 # ms
    
    return {
        "total_violations_today": total_violations,
        "active_accidents": active_accidents,
        "parking_occupancy_percent": round(avg_parking, 1),
        "ai_model_accuracy": ai_accuracy,
        "detection_latency_ms": detection_latency,
        "system_status": "Online"
    }

@app.websocket("/ws/v1/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        
@app.post("/reset")
def reset_simulation():
    global VIDEO_SOURCE, PROCESS_VIDEO, LATEST_FRAME_BYTES
    VIDEO_SOURCE = None
    PROCESS_VIDEO = False
    LATEST_FRAME_BYTES = None
    manager.reset()
    return {"status": "Simulation Reset"}

class SeekRequest(BaseModel):
    progress: float

@app.post("/seek")
def seek_video(req: SeekRequest):
    global SEEK_TARGET_FRAME
    if VIDEO_TOTAL_FRAMES > 0:
        target = int((req.progress / 100) * VIDEO_TOTAL_FRAMES)
        target = max(0, min(target, VIDEO_TOTAL_FRAMES - 1))
        SEEK_TARGET_FRAME = target
        return {"status": "Seeking", "target_frame": SEEK_TARGET_FRAME}
    return {"status": "No video loaded"}

@app.get("/video-progress")
def get_video_progress():
    progress = 0
    if VIDEO_TOTAL_FRAMES > 0:
        progress = (VIDEO_CURRENT_FRAME / VIDEO_TOTAL_FRAMES) * 100
    
    return {
        "progress": progress,
        "current_frame": VIDEO_CURRENT_FRAME,
        "total_frames": VIDEO_TOTAL_FRAMES
    }

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    global VIDEO_SOURCE, PROCESS_VIDEO, VIDEO_TOTAL_FRAMES
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_location = f"{upload_dir}/{file.filename}"
        
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"Video uploaded: {file_location}")
        
        # Get frame count
        temp_cap = cv2.VideoCapture(file_location)
        VIDEO_TOTAL_FRAMES = int(temp_cap.get(cv2.CAP_PROP_FRAME_COUNT))
        temp_cap.release()
        
        VIDEO_SOURCE = file_location
        PROCESS_VIDEO = True
        
        return {"filename": file.filename, "status": "Video processing started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

