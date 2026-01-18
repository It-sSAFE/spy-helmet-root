import requests
import sys

URL = "http://localhost:8000/generate_weekly_report"

try:
    print(f"Testing URL: {URL}")
    response = requests.get(URL)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(response.json())
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Exception: {e}")
