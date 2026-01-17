# ============================================================
# SPY HELMET – FULL ML PIPELINE TEST (RANDOMIZED INPUT)
# ============================================================

import random
from pipeline import weekly_fatigue_pipeline

# ------------------------------------------------------------
# 1. RANDOM KPI GENERATOR (REALISTIC)
# ------------------------------------------------------------

def generate_random_7_day_kpi():
    """
    Generates realistic, temporally-consistent 7-day KPI data
    """
    data = []

    fatigue = random.randint(30, 50)
    recovery = random.randint(8, 12)
    co = random.randint(3, 6)
    heat = random.randint(10, 14)
    hr = random.randint(70, 78)

    for day in range(7):
        fatigue += random.randint(4, 8)          # fatigue accumulates
        recovery += random.randint(1, 3)         # recovery worsens
        co += random.choice([0, 1])               # gas varies slowly
        heat += random.randint(1, 3)              # heat stress trend
        hr += random.randint(1, 2)                # HR drift

        data.append({
            "fatigue_minutes": fatigue,
            "avg_recovery_time": recovery,
            "co_exposure": co,
            "heat_stress": heat,
            "avg_hr": hr,
        })

    return data


# ------------------------------------------------------------
# 2. PIPELINE EXECUTION
# ------------------------------------------------------------

print("\n🚀 Running weekly fatigue pipeline test (RANDOM DATA)...\n")

last_7_days_kpi = generate_random_7_day_kpi()

result = weekly_fatigue_pipeline(
    worker_id=f"W{random.randint(1000,9999)}",
    last_7_days_kpi=last_7_days_kpi
)

# ------------------------------------------------------------
# 3. ASSERTIONS (FAIL FAST)
# ------------------------------------------------------------

assert "predicted_fatigue_day8" in result, "❌ Missing prediction"
assert "risk_level" in result, "❌ Missing risk level"
assert "recommended_shift" in result, "❌ Missing shift recommendation"
assert "recommended_breaks" in result, "❌ Missing breaks"
assert "weekly_report" in result, "❌ Missing report"

assert isinstance(result["recommended_breaks"], list), "❌ Breaks not list"
assert len(result["recommended_breaks"]) > 0, "❌ No breaks generated"

# ------------------------------------------------------------
# 4. PRINT RESULTS
# ------------------------------------------------------------

print("✅ PIPELINE OUTPUT SUMMARY\n")
print("Worker ID              :", result["worker_id"])
print("Predicted Day-8 Fatigue:", result["predicted_fatigue_day8"], "minutes")
print("Risk Level             :", result["risk_level"])
print("Recommended Shift      :", result["recommended_shift"])

print("\nRecommended Breaks:")
for b in result["recommended_breaks"]:
    print(f"• {b['start']} – {b['end']} ({b['duration_min']} min)")

print("\n===== MANAGER REPORT =====\n")
print(result["weekly_report"])


