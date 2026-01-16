from app.db.db import get_db_connection

def log_data(reading, prediction, helmet_id=None):
    """
    Logs a reading to the PostgreSQL database using raw SQL.
    reading: list [HR, TEMP]
    prediction: predicted label (str)
    helmet_id: UUID of the helmet (User ID)
    """
    if not helmet_id:
        print("⚠️ No helmet_id provided. Skipping DB log.")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        hr_val = reading[0]
        temp_val = reading[1]

        # Raw SQL Insert
        cur.execute("""
            INSERT INTO readings (helmet_id, hr, temperature, inserted_at)
            VALUES (%s, %s, %s, NOW())
        """, (helmet_id, hr_val, temp_val))
        
        conn.commit()
        print(f"✅ Saved reading for Helmet {helmet_id}: HR={hr_val}, Temp={temp_val}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to log to DB: {e}")
    finally:
        cur.close()
        conn.close()
