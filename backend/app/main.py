from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="Backend Service", version="1.0.0")

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running!"}
