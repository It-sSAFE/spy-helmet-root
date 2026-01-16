from fastapi import APIRouter, HTTPException

from app.auth import schemas, auth 
from app.core.buffer import reset_buffer
from app.db.db import get_db_connection  # Ensure this imports your psycopg2 connection function

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_user(user: schemas.UserCreate):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Check if Email already exists
        cur.execute("SELECT 1 FROM companies WHERE email = %s", (user.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already in use")

        # 2. Check if Company Name already exists
        cur.execute("SELECT 1 FROM companies WHERE company_name = %s", (user.company_name,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")

        # 3. Hash password
        hashed_pw = auth.hash_password(user.password)

        # 4. Insert user
        is_admin = (user.role == "admin")
        
        cur.execute("""
            INSERT INTO companies (
                id, 
                company_name, 
                email, 
                password_hash, 
                created_at, 
                is_active, 
                "isAdmin"
            )
            VALUES (gen_random_uuid(), %s, %s, %s, NOW(), TRUE, %s)
            RETURNING id;
        """, (
            user.company_name,
            user.email,
            hashed_pw,
            is_admin
        ))

        new_id = cur.fetchone()[0]
        conn.commit()
        
        return {"message": "User registered successfully", "user_id": str(new_id)}

    except HTTPException:
        conn.rollback()
        raise # Re-raise the HTTP exception (400)
    except Exception as e:
        conn.rollback()
        print(f"Database Error: {e}") # Print error to console for debugging
        raise HTTPException(status_code=500, detail="Internal server error"+str(e))
    finally:
        cur.close()
        conn.close()

@router.post("/login")
def login_user(user_data: schemas.UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check against 'email'
        cur.execute("""
            SELECT id, company_name, email, password_hash 
            FROM companies 
            WHERE email = %s
        """, (user_data.email,))
        
        user = cur.fetchone() # Returns tuple: (id, name, email, hash)

        # Verify User exists and Password matches
        # user[3] is password_hash based on the SELECT order above
        if not user or not auth.verify_password(user_data.password, user[3]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Reset buffer on successful login
        reset_buffer()

        # Create Token (user[0] is the UUID)
        token = auth.create_access_token(data={"sub": str(user[0])})
        
        # 🚀 TRIGGER SIMULATION (Fire & Forget)
        import subprocess
        try:
            # Run test_sender.py in the background
            subprocess.Popen(["python", "test_sender.py"])
            print("🚀 Simulation started by login!")
        except Exception as e:
            print(f"⚠️ Failed to start simulation: {e}")

        return {"access_token": token, "token_type": "bearer"}
        
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Login faailed: "+str(e))
    finally:
        cur.close()
        conn.close()