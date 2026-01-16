import requests
import time
import random
import uuid

# URL for the new endpoint
API_URL = "http://localhost:8000/submit_reading"

# Generate a static UUID for this session so we track one helmet
HELMET_ID = str(uuid.uuid4())
packet_counter = 0

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

print(f"🚀 Starting Simulation for Helmet ID: {HELMET_ID}")
print(f"📡 Sending to: {API_URL}")

while True:
    packet_counter += 1
    payload = generate_sensor_reading(packet_counter)
    
    try:
        res = requests.post(API_URL, json=payload)
        status_icon = "✅" if res.status_code == 200 else "⚠️"
        print(f"{status_icon} Packet #{packet_counter}: HR={payload['HR']} Temp={payload['BodyTemp']} | Res: {res.status_code}")
        
        # Print full response only on error or specific intervals to keep log clean
        if res.status_code != 200:
             print(f"   Response: {res.text}")

    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        time.sleep(2) # Wait longer on error
    
    time.sleep(0.5) # 2 Hz frequency


