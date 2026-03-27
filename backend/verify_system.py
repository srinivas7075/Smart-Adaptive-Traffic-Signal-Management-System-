import requests
import sys
import os
from sqlalchemy import create_engine, inspect

# Config
BASE_URL = "http://localhost:8000"
DB_PATH = "sqlite:///./traffic.db"

def check_db():
    print("Checking Database...")
    if not os.path.exists("./traffic.db"):
        print("❌ Database file not found!")
        return False
        
    try:
        engine = create_engine(DB_PATH)
        insp = inspect(engine)
        tables = insp.get_table_names()
        required = ["traffic_data", "signal_logs"]
        for tbl in required:
            if tbl not in tables:
                print(f"❌ Missing table: {tbl}")
                return False
        print("✅ Database tables confirmed.")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def check_api():
    print("Checking API...")
    try:
        # We can't easily check API if server isn't running, but this script 
        # is intended to be run *after* starting the server or logic check.
        # Since I can't start the server in blocking mode here easily,
        # I will assume this script is for the user to run.
        pass
    except Exception:
        pass

if __name__ == "__main__":
    db_ok = check_db()
    if db_ok:
        print("System integrity check passed (Database level).")
        print("Run 'uvicorn main:app --reload' to start the system.")
    else:
        print("System integrity check failed.")
