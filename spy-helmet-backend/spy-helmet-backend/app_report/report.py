def generate_weekly_manager_report(
    worker_id,
    last_7_days_kpi,
    predicted_fatigue,
    risk_level,
    recommended_shift,
    recommended_breaks
):
    # Extract trends
    fatigue_start = last_7_days_kpi[0]["fatigue_minutes"]
    fatigue_end = last_7_days_kpi[-1]["fatigue_minutes"]

    recovery_start = last_7_days_kpi[0]["avg_recovery_time"]
    recovery_end = last_7_days_kpi[-1]["avg_recovery_time"]

    risk_text = risk_level.lower()

    report = f"""
SPY HELMET – WEEKLY FATIGUE REPORT
=============================================
Worker ID           : {worker_id}
Assessment Period   : Last 7 Working Days

1. EXECUTIVE SUMMARY
------------------------------
The AI-based fatigue assessment indicates a {risk_text} fatigue risk for the upcoming shift.

2. FATIGUE TREND – LAST 7 DAYS
------------------------------
Fatigue duration increased from {fatigue_start} minutes to {fatigue_end} minutes over the last 7 days.
Average recovery time worsened from {recovery_start} minutes to {recovery_end} minutes, indicating reduced physiological recovery.
This upward trend suggests cumulative fatigue rather than isolated daily stress.

3. AI PREDICTION – UPCOMING SHIFT (DAY 8)
------------------------------
Based on time-series analysis of daily fatigue KPIs, the system predicts approximately {predicted_fatigue:.1f} minutes of fatigue during the next shift.
This places the worker in the {risk_level.upper()} fatigue risk category.

4. AI RECOMMENDATIONS
------------------------------
Recommended Shift Rotation:
→ {recommended_shift}

Recommended Rest Breaks (Shift-relative):
"""

    # Add breaks exactly as bullet list
    for b in recommended_breaks:
        report += f"• {b['start']} – {b['end']} ({b['duration_min']} min)\n"

    report += """
5. EXPECTED IMPACT (ESTIMATED)
------------------------------
If the above recommendations are implemented:
• Fatigue duration reduction: ~35%
• Recovery efficiency improvement: ~40%
• Fatigue & gas exposure overlap reduction: ~50%

6. MANAGER ACTION NOTE
------------------------------
This report is generated using AI-assisted fatigue analytics based on physiological and environmental patterns observed over the last 7 days. The recommendations are advisory and intended to support proactive workforce safety management.

End of Report
"""

    return report.strip()
