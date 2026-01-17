import numpy as np
from scipy.stats import linregress

DAYS = 7
ALPHA = 0.4

def ewma(series, alpha=ALPHA):
    v = series[0]
    for x in series[1:]:
        v = alpha * x + (1 - alpha) * v
    return v

def extract_features(last_7_days_kpi):
    """
    last_7_days_kpi: list of dicts, length = 7
    """
    keys = [
        "fatigue_minutes",
        "avg_recovery_time",
        "co_exposure",
        "heat_stress",
        "avg_hr"
    ]

    days = np.arange(1, DAYS + 1)
    features = []

    for key in keys:
        s = np.array([d[key] for d in last_7_days_kpi])
        slope, _, _, _, _ = linregress(days, s)

        features.extend([
            s.mean(),
            s.max(),
            s.std(),
            s[-1],
            slope,
            ewma(s),
            s[-1] / (s[0] + 1e-6)
        ])

    return np.array(features).reshape(1, -1)
