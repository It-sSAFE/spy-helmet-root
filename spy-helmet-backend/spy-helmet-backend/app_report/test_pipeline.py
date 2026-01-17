# ============================================================
# SPY HELMET – FULL ML PIPELINE TEST
# ============================================================
from pipeline import weekly_fatigue_pipeline

# ------------------------------------------------------------
# 1. MOCK INPUT (LAST 7 DAYS KPI)
# ------------------------------------------------------------
last_7_days_kpi = [
    {
        "fatigue_minutes": 40,
        "avg_recovery_time": 10,
        "co_exposure": 5,
        "heat_stress": 12,
        "avg_hr": 78,
    },
    {
        "fatigue_minutes": 50,
        "avg_recovery_time": 12,
        "co_exposure": 6,
        "heat_stress": 15,
        "avg_hr": 80,
    },
    {
        "fatigue_minutes": 60,
        "avg_recovery_time": 14,
        "co_exposure": 7,
        "heat_stress": 18,
        "avg_hr": 82,
    },
    {
        "fatigue_minutes": 68,
        "avg_recovery_time": 17,
        "co_exposure": 8,
        "heat_stress": 20,
        "avg_hr": 83,
    },
    {
        "fatigue_minutes": 75,
        "avg_recovery_time": 19,
        "co_exposure": 9,
        "heat_stress": 22,
        "avg_hr": 85,
    },
    {
        "fatigue_minutes": 80,
        "avg_recovery_time": 21,
        "co_exposure": 10,
        "heat_stress": 24,
        "avg_hr": 86,
    },
    {
        "fatigue_minutes": 83,
        "avg_recovery_time": 23,
        "co_exposure": 11,
        "heat_stress": 26,
        "avg_hr": 88,
    },
]

# ------------------------------------------------------------
# 2. PIPELINE EXECUTION
# ------------------------------------------------------------
print("\n🚀 Running weekly fatigue pipeline test...\n")

result = weekly_fatigue_pipeline(
    worker_id="W1024",
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
print("Worker ID            :", result["worker_id"])
print("Predicted Day-8 Fatigue:", result["predicted_fatigue_day8"], "minutes")
print("Risk Level           :", result["risk_level"])
print("Recommended Shift    :", result["recommended_shift"])

print("\nRecommended Breaks:")
for b in result["recommended_breaks"]:
    print(f"• {b['start']} – {b['end']} ({b['duration_min']} min)")

print("\n===== MANAGER REPORT =====\n")
print(result["weekly_report"])

# ------------------------------------------------------------
# 5. FINAL STATUS
# ------------------------------------------------------------

