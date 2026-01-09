# Dockerfile at repo root for Render deployment
# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Expose port (Render uses $PORT)
EXPOSE 8000

# Run uvicorn - Render will provide $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
