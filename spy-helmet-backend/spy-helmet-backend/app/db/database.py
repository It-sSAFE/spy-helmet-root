# app/db/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Get DB URL from env or default to generic one (though env is better)
# Docker-compose sets DATABASE_URL=postgresql://postgres:helmet_2026@db:5432/helmetDB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:helmet_2026@localhost:5432/helmetDB")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to use in FastAPI routes to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
