from pydantic import BaseModel, EmailStr
from typing import List, Optional

# Input schema for registration
class UserCreate(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    role: str

# Input schema for login
class UserLogin(BaseModel):
    email: str
    password: str
    role: str

# Output schema for responses
class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

# Sensor Data Schema
class ReadingInput(BaseModel):
    reading: List[float]  # [X, Y, Z, HR, TEMP]
    ch4_ppm: float
    co_ppm: float