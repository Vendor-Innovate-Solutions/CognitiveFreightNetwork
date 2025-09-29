# Use official Python slim image
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app
COPY uvicorn_start.sh ./uvicorn_start.sh
RUN chmod +x ./uvicorn_start.sh

# Expose port
EXPOSE 8000

# Run app
CMD ["./uvicorn_start.sh"]
