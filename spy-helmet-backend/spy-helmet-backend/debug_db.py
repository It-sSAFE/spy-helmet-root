
print("1. Start DB test")
try:
    import psycopg2
    print("2. Psycopg2 imported")
    from app.db.database import engine
    print("3. Engine created")
    from app.db.models import Base
    print("4. Models imported")
    # Try connecting
    with engine.connect() as conn:
        print("5. Connected to DB!")
except Exception as e:
    print(f"ERROR: {e}")
print("6. Done")
