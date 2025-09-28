# FastAPI Backend

## ⚡ Local Setup
```bash
cd backend

python3 -m venv venv
source venv/bin/activate   # (Windows: venv\Scripts\activate)
pip install -r requirements.txt

uvicorn app.main:app --reload
# visit http://127.0.0.1:8000/health

docker build -t fastapi-backend .
docker run -d -p 8000:8000 --name fastapi-backend fastapi-backend

# visit http://localhost:8000/health