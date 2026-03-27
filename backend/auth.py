from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
import bcrypt

from database import get_db
from models import User, LoginLog

# Security config
SECRET_KEY = "super-secret-key-for-sih-2024-traffic-system-change-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    role: str
    expires_in: int

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()

    # Log helper
    def log_attempt(status_str):
        try:
            log = LoginLog(user_id=user.id if user else None, ip_address="127.0.0.1", status=status_str)
            db.add(log)
            db.commit()
        except:
            db.rollback()

    if not user:
        log_attempt("Failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        log_attempt("Locked")
        ist_time = user.locked_until + timedelta(hours=5, minutes=30)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Account locked until {ist_time.strftime('%H:%M:%S')} IST"
        )
    
    # If time passed, unlock
    if user.locked_until and user.locked_until <= datetime.utcnow():
        user.locked_until = None
        user.failed_attempts = 0
        try:
            db.commit()
        except:
            db.rollback()

    if not verify_password(req.password, user.hashed_password):
        user.failed_attempts += 1
        if user.failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
            log_attempt("Locked")
        else:
            log_attempt("Failed")
        try:
            db.commit()
        except:
            db.rollback()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Success
    user.failed_attempts = 0
    user.locked_until = None
    log_attempt("Success")
    try:
        db.commit()
    except:
        db.rollback()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )

    return {"token": access_token, "role": user.role, "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60}

# ---------- Token Validation Dependency ----------

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_active_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
