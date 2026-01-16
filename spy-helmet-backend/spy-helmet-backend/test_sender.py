import requests
import time
import random

API_URL = "http://localhost:8000/predict"

def generate_normal_reading():
    hr = random.uniform(150,155)
    temp = random.uniform(36.0, 37.5)
    
    # Simulated gas readings
    ch4_ppm = round(random.uniform(3.0, 3.3), 2)
    co_ppm = round(random.uniform(1.2, 1.4), 2)

    return {
        "reading": [ hr, temp],
        "ch4_ppm": ch4_ppm,
        "co_ppm": co_ppm
    }

while True:
    payload = generate_normal_reading()
    try:
        res = requests.post(API_URL, json=payload)
        print(f"✅ Sent reading: {payload} | Response: {res.status_code}", end=" ")
        print(res.json())
    except Exception as e:
        print(f"❌ Failed to send: {payload} | Error: {e}")
        time.sleep(2) # Wait longer on error
    time.sleep(0.5) # 2 readings per second

