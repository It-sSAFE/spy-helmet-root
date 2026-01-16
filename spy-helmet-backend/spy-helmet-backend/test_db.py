from app.db.db import get_db_connection

try:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO companies ( id, company_name, email, password_hash, created_at, is_active) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tech Solutions Ltd', 'admin@techsolutions.com', 'secure_hash_789', '2023-10-27 10:00:00', true) RETURNING id, created_at;")
    print(cur.fetchone())
    cur.execute("SELECT * from companies")
    print(cur.fetchone())
    conn.commit()
except Exception:
    conn.rollback()
    raise
finally:
    cur.close()
    conn.close()
