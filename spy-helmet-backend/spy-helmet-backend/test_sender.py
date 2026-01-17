import requests
import time
import random
import uuid
import sys
import os

# Use 127.0.0.1 to avoid IPv6 resolution issues in some containers
# Inside the container, this points to the FastAPI app running on port 8000
API_URL = os.getenv("API_URL", "http://127.0.0.1:8000/submit_reading")



try:
    from seed_test_data import create_test_data
    # Dynamically get ID (creates it if missing)
    HELMET_ID = create_test_data()
    print(f"✅ Loaded Helmet ID: {HELMET_ID}")
except ImportError:
    print("⚠️ seed_test_data.py not found. Using fallback ID.")
    HELMET_ID = "a34ef6a1-b853-4da4-a004-5cdf7dfcb1eb"
except Exception as e:
    print(f"⚠️ Error fetching Helmet ID: {e}")
    HELMET_ID = str(uuid.uuid4())


packet_counter = 0

print(f"🚀 Starting Simulation for Helmet ID: {HELMET_ID}", flush=True)
print(f"📡 Sending to: {API_URL}", flush=True)

def generate_sensor_reading(packet_num):
    # Simulated physiological data (Normal Range)
    hr = int(random.uniform(70, 95))
    body_temp = round(random.uniform(36.5, 37.2), 2)
    spo2 = int(random.uniform(96, 99))
    
    # Simulated environmental data
    env_temp = round(random.uniform(25.0, 30.0), 2)
    humidity = round(random.uniform(40.0, 60.0), 2)
    
    # Simulated gas readings (Safe levels)
    ch4_ppm = round(random.uniform(0.0, 5.0), 2) # Low CH4
    co_ppm = round(random.uniform(0.0, 5.0), 2)  # Low CO

    return {
        "helmet_ID": HELMET_ID,
        "BodyTemp": body_temp,
        "EnvTemp": env_temp,
        "Humidity": humidity,
        "CO_ppm": co_ppm,
        "CH4_ppm": ch4_ppm,
        "HR": hr,
        "SpO2": spo2,
        "Packet_no": packet_num
    }

# Run for a limited time (e.g., 500 packets) to prevent infinite orphaned processes
MAX_PACKETS = 500

while packet_counter < MAX_PACKETS:
    packet_counter += 1
    payload = generate_sensor_reading(packet_counter)
    
    try:
        res = requests.post(API_URL, json=payload, timeout=5)
        status_icon = "✅" if res.status_code == 200 else "⚠️"
        print(f"{status_icon} Packet #{packet_counter}: HR={payload['HR']} Temp={payload['BodyTemp']} | Res: {res.status_code}", flush=True)
        
        if res.status_code != 200:
             print(f"   Response: {res.text}", flush=True)

    except Exception as e:
        print(f"❌ Connection Failed: {e}", flush=True)
        # If we can't connect, don't spam. Wait a bit.
        time.sleep(2)
    
    time.sleep(0.05) # Speed up for testing
