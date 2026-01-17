from datetime import datetime, timedelta

SHIFT_START = {
    "Morning": "06:00",
    "Evening": "14:00",
    "Night": "22:00"
}

BREAK_TEMPLATE = [
    {"offset": 2.0, "duration": 15},
    {"offset": 4.5, "duration": 10},
    {"offset": 6.5, "duration": 10},
]

def classify_risk(fatigue):
    if fatigue > 120:
        return "HIGH"
    elif fatigue > 80:
        return "MODERATE"
    return "LOW"

def recommend_shift(fatigue):
    if fatigue > 120:
        return "Morning (06:00–14:00)"
    elif fatigue > 80:
        return "Evening (14:00–22:00)"
    return "Night acceptable"

def generate_breaks(shift_label):
    shift = shift_label.split()[0]
    start = datetime.strptime(SHIFT_START[shift], "%H:%M")

    breaks = []
    for b in BREAK_TEMPLATE:
        s = start + timedelta(hours=b["offset"])
        e = s + timedelta(minutes=b["duration"])
        breaks.append({
            "start": s.strftime("%H:%M"),
            "end": e.strftime("%H:%M"),
            "duration_min": b["duration"]
        })

    return breaks
