# db.py
import psycopg2
import os

def get_db_connection():
    # Use environment variables with defaults
    # When running in Docker, these should come from .env
    host = os.getenv("POSTGRES_HOST", "localhost") 
    database = os.getenv("POSTGRES_DB", "helmetDB")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "helmet_2026")
    
    return psycopg2.connect(
        host=host,
        port=5432,
        dbname=database,
        user=user,
        password=password
    )
