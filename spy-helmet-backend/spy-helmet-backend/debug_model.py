
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
print("1. Start script")

import tensorflow as tf
from tensorflow.keras.models import load_model
print("2. TF Imported. Loading model...")

try:
    path = "app/model/helmet2.keras"
    print(f"Path exists: {os.path.exists(path)}")
    model = load_model(path)
    print("3. Model loaded successfully!")
except Exception as e:
    print(f"ERROR: {e}")

print("4. Done")
