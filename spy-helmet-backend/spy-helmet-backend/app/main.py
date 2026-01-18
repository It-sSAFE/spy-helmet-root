import os
# Fix CUDA errors on CPU-only machines
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

from app.core.buffer import add_reading
from app.core.buffer import return_progress

from app.utils.logger import log_data
from app.auth.routes import router as auth_router

# Import Predictor (TensorFlow) LAST to avoid Segfaults
from app.core.predictor import predict_fatigue


app = FastAPI(
    title="SPY Helmet Fatigue API",
    version="1.0",
    description="Real-time fatigue prediction for miners using 2-sensor input ⚡"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now; restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_prediction = None

# ✅ Input schema: Used by /predict
class ReadingInput(BaseModel):
    reading: List[float]  # [HR, TEMP]
    ch4_ppm: float
    co_ppm: float

# ✅ New input schema: Used by ESP32 /submit_reading
# ✅ New input schema: Used by ESP32 /submit_reading
class SensorInput(BaseModel):
    helmet_ID: str
    BodyTemp: float
    EnvTemp: float
    Humidity: float
    CO_ppm: float
    CH4_ppm: float
    HR: int
    SpO2: int
    Packet_no: int


@app.get("/")
def root():
    return {"message": "✅ SPY Helmet Fatigue API is running (2-input + gas sensors)"}

@app.post("/predict")
async def predict(input_data: ReadingInput):
    global latest_prediction
    try:
        reading = input_data.reading

        # Validate length = 2
        if len(reading) != 2:
            raise HTTPException(status_code=400, detail="Each reading must contain exactly 2 values: [HR, TEMP]")

        # Add to buffer
        sequence = add_reading(reading)  # should return (100, 2) or None

        if sequence is None:
            return {
                "status": "collecting",
                "message": "Waiting for 100 readings..."
            }

        # Predict
        result = predict_fatigue(sequence)

        # Log it
        log_data(reading, result["prediction"], None)

        # Store for frontend
        latest_prediction = {
            "prediction": result["prediction"],
            "confidence": f"{result['confidence']:.2f}%",
            "raw_scores": result["raw_scores"],
            "heart_rate": reading[0],
            "body_temp": reading[1],
            "ch4_ppm": input_data.ch4_ppm,
            "co_ppm": input_data.co_ppm
        }

        return latest_prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/live_predict")
async def live_prediction():
    global latest_prediction
    if latest_prediction is None:
        return {
            "status": "collecting",
            "message": "Waiting for 100 readings...",
            "reading_progress":return_progress()
        }
    return latest_prediction

# ✅ New: Sensor data directly from ESP32
@app.post("/submit_reading")
async def submit_sensor_data(data: SensorInput, request: Request):
    global latest_prediction
    try:
        # Convert to fatigue model input: [HR, TEMP]
        # Mapping new keys to model expected input
        reading = [data.HR, data.BodyTemp]

        # Add to buffer
        sequence = add_reading(reading)

        if sequence is None:
            return {
                "status": "collecting",
                "message": f"Waiting for 100 readings from ESP32... (Packet {data.Packet_no})"
            }

        # Predict fatigue level
        result = predict_fatigue(sequence)

        # Log reading with helmet ID (Skipped Writing to DB for now per request)
        log_data(reading, result["prediction"], data.helmet_ID) 

        # Save for frontend
        latest_prediction = {
            "prediction": result["prediction"],
            "confidence": f"{result['confidence']:.2f}%",
            # "raw_scores": result["raw_scores"],
             "raw_scores": [float(x) for x in result["raw_scores"]],
            "heart_rate": data.HR,
            "body_temp": data.BodyTemp,
            "ch4_ppm": data.CH4_ppm,
            "co_ppm": data.CO_ppm,
            "helmet_id": data.helmet_ID,
            "humidity": data.Humidity,
            "spo2": data.SpO2,
            "env_temp": data.EnvTemp,
             "packet_no": data.Packet_no
        }

        return latest_prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ WEEKLY REPORT PIPELINE (MOCKED DATA)
from app_report.pipeline import weekly_fatigue_pipeline

# Mock Data from test_pipeline.py
MOCK_LAST_7_DAYS_KPI = [
    {"fatigue_minutes": 40, "avg_recovery_time": 10, "co_exposure": 5, "heat_stress": 12, "avg_hr": 78},
    {"fatigue_minutes": 50, "avg_recovery_time": 12, "co_exposure": 6, "heat_stress": 15, "avg_hr": 80},
    {"fatigue_minutes": 60, "avg_recovery_time": 14, "co_exposure": 7, "heat_stress": 18, "avg_hr": 82},
    {"fatigue_minutes": 68, "avg_recovery_time": 17, "co_exposure": 8, "heat_stress": 20, "avg_hr": 83},
    {"fatigue_minutes": 75, "avg_recovery_time": 19, "co_exposure": 9, "heat_stress": 22, "avg_hr": 85},
    {"fatigue_minutes": 80, "avg_recovery_time": 21, "co_exposure": 10, "heat_stress": 24, "avg_hr": 86},
    {"fatigue_minutes": 83, "avg_recovery_time": 23, "co_exposure": 11, "heat_stress": 26, "avg_hr": 88},
]

@app.get("/generate_weekly_report")
async def get_weekly_report():
    try:
        # Run pipeline with static demo data
        result = weekly_fatigue_pipeline(
            worker_id="W1024-DEMO",
            last_7_days_kpi=MOCK_LAST_7_DAYS_KPI
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Mount authentication routes
app.include_router(auth_router)
