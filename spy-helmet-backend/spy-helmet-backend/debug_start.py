
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

print("1. Importing app.main...")
try:
    from app.main import app
    print("2. Successfully imported app.main")
except Exception as e:
    print(f"FAILED to import app.main: {e}")
    import traceback
    traceback.print_exc()
