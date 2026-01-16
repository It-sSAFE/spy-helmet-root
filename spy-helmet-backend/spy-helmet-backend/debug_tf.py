
print("1. Start script")
try:
    import os
    os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
    print("2. Importing tensorflow...")
    import tensorflow as tf
    print(f"3. Tensorflow imported. Version: {tf.__version__}")
    from tensorflow.keras.models import load_model
    print("4. Keras model loader imported")
except Exception as e:
    print(f"ERROR: {e}")
print("5. Done")
