import os
import joblib

from .features import extract_features
from .decision import classify_risk, recommend_shift, generate_breaks
from .report import generate_weekly_manager_report

# --------------------------------------------------
# Load model ONCE (safe absolute path)
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "weekly_fatigue_model.pkl")

model = joblib.load(MODEL_PATH)


def weekly_fatigue_pipeline(worker_id, last_7_days_kpi):
    features = extract_features(last_7_days_kpi)

    predicted = float(model.predict(features)[0])
    predicted = round(predicted, 1)

    risk = classify_risk(predicted)
    shift = recommend_shift(predicted)
    breaks = generate_breaks(shift)

    report = generate_weekly_manager_report(
        worker_id,
        last_7_days_kpi,
        predicted,
        risk,
        shift,
        breaks
    )

    return {
        "worker_id": worker_id,
        "predicted_fatigue_day8": predicted,
        "risk_level": risk,
        "recommended_shift": shift,
        "recommended_breaks": breaks,
        "weekly_report": report
    }
