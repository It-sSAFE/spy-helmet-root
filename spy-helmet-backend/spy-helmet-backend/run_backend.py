import os
import uvicorn

if __name__ == "__main__":
    # Force CPU usage (Fixes CUDA errors)
    os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
    
    print("🚀 Starting Backend with CPU-only mode (CUDA Disabled)")

    # Run uvicorn (Reload disabled for stability with TF)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
