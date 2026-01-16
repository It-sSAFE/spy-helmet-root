from sqlalchemy import Column, String
from app.db.database import Base  # ✅ Corrected import

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Custom Helmet/User ID
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)



