
print("1. Start")
from app.db.database import engine, Base
from app.db import models
print("2. DB Engine imported")
Base.metadata.create_all(bind=engine)
print("3. DB Tables Created")

from app.core.predictor import predict_fatigue
print("4. Predictor imported")
