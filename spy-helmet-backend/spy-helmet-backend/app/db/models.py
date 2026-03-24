from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, BigInteger, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    is_active = Column(Boolean, default=True)
    isAdmin = Column(Boolean, default=False) 

class Helmet(Base):
    __tablename__ = "helmets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    helmet_code = Column(String, unique=True, nullable=False)
    model = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    is_active = Column(Boolean, default=True)

class WorkSession(Base):
    __tablename__ = "work_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    helmet_id = Column(UUID(as_uuid=True), ForeignKey("helmets.id"), nullable=False)
    start_time = Column(DateTime(timezone=False), server_default=func.now())
    end_time = Column(DateTime(timezone=False), nullable=True)
    is_active = Column(Boolean, default=True)

class Reading(Base):
    __tablename__ = "readings"

    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("work_sessions.id"), nullable=False, index=True)
    helmet_id = Column(UUID(as_uuid=True), ForeignKey("helmets.id"), nullable=False)
    temperature = Column(Float, nullable=True)
    env_temp = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    hr = Column(Float, nullable=True) # Heart Rate
    spo2 = Column(Float, nullable=True)
    co_ppm = Column(Float, nullable=True)
    ch4_ppm = Column(Float, nullable=True)
    fatigue_state = Column(String, nullable=True)
    inserted_at = Column(DateTime(timezone=False), server_default=func.now())
