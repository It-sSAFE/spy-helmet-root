from app.db.database import engine
from app.db.models import Base

print("🚀 Initializing Database Tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created successfully!")
