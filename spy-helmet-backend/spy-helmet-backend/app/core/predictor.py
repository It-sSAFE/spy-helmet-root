# app/core/predictor.py

import os

# Disable GPU usage for CPU-only environments (Fixes CUDA errors)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2" # Reduce TF logging

print(f"DEBUG: CUDA_VISIBLE_DEVICES = {os.environ.get('CUDA_VISIBLE_DEVICES')}")

from tensorflow.keras.models import load_model
import numpy as np

# Load model only once
# Load model only once
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "app", "model", "helmet2.keras")

try:
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
        print(f"SUCCESS: Loaded fatigue model from {MODEL_PATH}")
    else:
        print(f"CRITICAL WARNING: Fatigue model not found at {MODEL_PATH}")
        model = None
except Exception as e:
    print(f"CRITICAL ERROR: Failed to load fatigue model: {e}")
    model = None

# Class index to label mapping
class_names = {0: "Normal", 1: "Stressed", 2: "Fatigue"}

def predict_fatigue(sequence: np.ndarray) -> dict:
    """
    Takes a (100, 5) sequence and returns the predicted class and confidence.
    """
    if sequence.shape != (100, 2):
        raise ValueError("Expected input shape (100, 2), got: " + str(sequence.shape))

    # Add batch dimension → (1, 100, 5)
    sequence = np.expand_dims(sequence, axis=0)

    # Run prediction
    if model is None:
        return {
            "prediction": "Error",
            "confidence": 0.0,
            "raw_scores": [0.0, 0.0, 0.0]
        }
    
    prediction = model.predict(sequence)
    predicted_index = int(np.argmax(prediction[0]))
    confidence = float(prediction[0][predicted_index] * 100)

    return {
        "prediction": class_names[predicted_index],
        "confidence": confidence,
        "raw_scores": prediction[0].tolist()
    }
