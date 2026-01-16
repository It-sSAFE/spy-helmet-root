from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, BigInteger, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
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

class Reading(Base):
    __tablename__ = "readings"

    id = Column(BigInteger, primary_key=True, index=True)
    helmet_id = Column(UUID(as_uuid=True), ForeignKey("helmets.id"), nullable=False)
    temperature = Column(Float, nullable=True)
    hr = Column(Float, nullable=True) # Heart Rate
    inserted_at = Column(DateTime(timezone=False), server_default=func.now())
