import os
import time
import json
import redis
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import WorkSession, Reading, Helmet, Company

print("🚀 Historical Data Worker Starting up...", flush=True)

# Connect to Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
print(f"Connecting to Redis at {REDIS_URL}", flush=True)

retry_count = 0
while retry_count < 10:
    try:
        redis_client = redis.from_url(REDIS_URL)
        redis_client.ping()
        print("✅ Redis Connected Successfully!", flush=True)
        break
    except Exception as e:
        print(f"⌛ Waiting for Redis... ({e})", flush=True)
        time.sleep(2)
        retry_count += 1

db: Session = SessionLocal()

def process_reading(payload: dict):
    # Payload contains: helmet_ID, HR, BodyTemp, etc.
    helmet_code = payload.get("helmet_ID")
    
    # Check if Helmet exists
    helmet = db.query(Helmet).filter(Helmet.helmet_code == helmet_code).first()
    if not helmet:
        # SECURITY OVERRIDE: Auto-create missing helmets on the fly
        default_company = db.query(Company).filter(Company.username == "system_auto").first()
        if not default_company:
            default_company = Company(username="system_auto", password_hash="auto_generated")
            db.add(default_company)
            db.commit()
            db.refresh(default_company)
            
        helmet = Helmet(helmet_code=helmet_code, company_id=default_company.id)
        db.add(helmet)
        db.commit()
        db.refresh(helmet)
        print(f"🌟 Auto-registered missing Helmet {helmet_code}", flush=True)

    # Check for Active WorkSession
    active_session = db.query(WorkSession).filter(
        WorkSession.helmet_id == helmet.id,
        WorkSession.is_active == True
    ).first()

    # If no active session, automatically start one!
    if not active_session:
        active_session = WorkSession(helmet_id=helmet.id, is_active=True)
        db.add(active_session)
        db.commit()
        db.refresh(active_session)
        print(f"⚡ Created new WorkSession for Helmet {helmet_code}", flush=True)

    # Insert Reading
    new_reading = Reading(
        session_id=active_session.id,
        helmet_id=helmet.id,
        temperature=payload.get("BodyTemp"),
        env_temp=payload.get("EnvTemp"),
        humidity=payload.get("Humidity"),
        hr=payload.get("HR"),
        spo2=payload.get("SpO2"),
        co_ppm=payload.get("CO_ppm"),
        ch4_ppm=payload.get("CH4_ppm"),
        fatigue_state=payload.get("fatigue_state")
    )
    
    db.add(new_reading)
    db.commit()

print("🎧 Worker listening to 'helmet_data_queue'...", flush=True)

while True:
    try:
        # blpop blocks indefinitely (timeout=0) until a payload is pushed by FastAPI
        result = redis_client.blpop("helmet_data_queue", timeout=0)
        if result:
            queue_name, data_bytes = result
            payload = json.loads(data_bytes.decode('utf-8'))
            process_reading(payload)
            
    except Exception as e:
        print(f"⚠️ Worker Error: {e}", flush=True)
        db.rollback()
        time.sleep(1) # Prevent CPU spinning on DB crash
