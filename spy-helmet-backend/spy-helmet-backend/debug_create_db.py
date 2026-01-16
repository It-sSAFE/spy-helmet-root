
print("1. Start")
from app.core.predictor import predict_fatigue
print("2. Predictor imported")
from app.db.database import engine, Base
from app.db import models
print("3. DB Engine imported")
Base.metadata.create_all(bind=engine)
print("4. DB Tables Created")
