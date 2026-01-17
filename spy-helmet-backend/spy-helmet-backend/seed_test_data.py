
import os
import sys
import uuid

# Ensure app path is in sys.path
sys.path.append(os.getcwd())

from app.db.db import get_db_connection
from app.auth.auth import hash_password

def create_test_data():
    conn = get_db_connection()
    cur = conn.cursor()
    
    helmet_id = None
    
    try:
        # 1. Check/Insert Company
        test_email = "test@example.com"
        company_name = "Test Company"
        
        cur.execute("SELECT id FROM companies WHERE email = %s", (test_email,))
        res = cur.fetchone()
        
        if res:
            company_id = res[0]
            print(f"Using Test Company: {company_id}")
        else:
            hashed = hash_password("testpass")
            cur.execute("""
                INSERT INTO companies (id, company_name, email, password_hash, created_at, is_active, "isAdmin")
                VALUES (gen_random_uuid(), %s, %s, %s, NOW(), TRUE, TRUE)
                RETURNING id
            """, (company_name, test_email, hashed))
            company_id = cur.fetchone()[0]
            conn.commit()
            print(f"Created Test Company: {company_id}")

        # 2. Check/Insert Helmet
        helmet_code = "TEST_001"
        cur.execute("SELECT id FROM helmets WHERE helmet_code = %s", (helmet_code,))
        res = cur.fetchone()
        
        if res:
            helmet_id = res[0]
            print(f"Using Test Helmet: {helmet_id}")
        else:
            cur.execute("""
                INSERT INTO helmets (id, company_id, helmet_code, model, assigned_to, created_at, is_active)
                VALUES (gen_random_uuid(), %s, %s, 'V1', 'Test Worker', NOW(), TRUE)
                RETURNING id
            """, (company_id, helmet_code))
            helmet_id = cur.fetchone()[0]
            conn.commit()
            print(f"Created Test Helmet: {helmet_id}")
            
        return str(helmet_id)

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--get-id":
        hid = create_test_data()
        if hid:
            print(hid)
    else:
        create_test_data()
