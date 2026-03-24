from pydantic import BaseModel
from typing import List, Optional

# Input schema for registration
class UserCreate(BaseModel):
    company_name: str
    username: str
    password: str
    role: str

# Input schema for login
class UserLogin(BaseModel):
    username: str
    password: str
    role: str

# Output schema for responses
class UserResponse(BaseModel):
    id: str
    username: str

    class Config:
        from_attributes = True

# Sensor Data Schema
class ReadingInput(BaseModel):
    reading: List[float]  # [X, Y, Z, HR, TEMP]
    ch4_ppm: float
    co_ppm: float