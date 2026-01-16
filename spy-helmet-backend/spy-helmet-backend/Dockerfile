# 1. Base image (Python 3.10)
FROM python:3.10-slim

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy dependency file first (for caching)
COPY requirement.txt .

# 4. Install Python dependencies
RUN pip install --no-cache-dir -r requirement.txt

# 5. Copy the rest of the backend code
COPY . .

# 6. Expose port (documentation only)
EXPOSE 8000

# 7. Run FastAPI using custom runner (Handles CPU configs)
CMD ["python", "run_backend.py"]
