import os
# Fix CUDA errors on CPU-only machines
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
class SensorInput(BaseModel):
    helmet_id: str
    body_temp: float
    env_temp: float
    pressure: float
    co_ppm: float
    ch4_ppm: float
    heart_rate: int

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
        reading = [data.heart_rate, data.body_temp]

        # Add to buffer
        sequence = add_reading(reading)

        if sequence is None:
            return {
                "status": "collecting",
                "message": "Waiting for 100 readings from ESP32..."
            }

        # Predict fatigue level
        result = predict_fatigue(sequence)

        # Log reading with helmet ID
        log_data(reading, result["prediction"], data.helmet_id)

        # Save for frontend
        latest_prediction = {
            "prediction": result["prediction"],
            "confidence": f"{result['confidence']:.2f}%",
            "raw_scores": result["raw_scores"],
            "heart_rate": data.heart_rate,
            "body_temp": data.body_temp,
            "ch4_ppm": data.ch4_ppm,
            "co_ppm": data.co_ppm,
            "helmet_id": data.helmet_id
        }

        return latest_prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Mount authentication routes
app.include_router(auth_router)
