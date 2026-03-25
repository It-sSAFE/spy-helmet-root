import requests
import time
import json

url = "https://itssafe.site/api/submit_reading"
headers = {"Content-Type": "application/json"}

print(f"🚀 Simulating ESP32: Sending 100 packets to {url}...\n")

for i in range(1, 101):
    payload = {
        "helmet_ID": "TEST-HELMET-001",
        "BodyTemp": 36.5,
        "EnvTemp": 25.0,
        "Humidity": 40.0,
        "CO_ppm": 0.5,
        "CH4_ppm": 0.1,
        "HR": 80,
        "SpO2": 98,
        "Packet_no": i
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=5)
        print(f"Packet {i}/100 sent! | Response: {response.text}")
    except Exception as e:
        print(f"Failed to send Packet {i}: {e}")
        
    # Sleep slightly (10ms) to ensure they arrive in proper sequence without flooding
    time.sleep(0.01)
    
print("\n✅ Simulation Complete! The AI Prediction should now be triggered.")
