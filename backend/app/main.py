from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from app.api import new_routes
from app.models.database import init_db, USE_MONGODB
from app.services.ml_models import cost_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Cognitive Freight Network API...")
    init_db()
    
    if USE_MONGODB:
        print("📊 Using MongoDB database")
    else:
        print("📊 Using SQLAlchemy database")
    
    print("✅ Database initialized")
    
    # Try to load existing ML models
    try:
        cost_model.load_model()
        print("✅ ML models loaded")
    except:
        print("⚠️  No pre-trained models found - will train on first use")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="Cognitive Freight Network API",
    description="AI-Powered Logistics Planning & Optimization Platform",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*"  # For development - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(new_routes.router)

@app.get("/")
def read_root():
    db_type = "MongoDB" if USE_MONGODB else "SQLAlchemy"
    return {
        "message": "Cognitive Freight Network API - AI-Powered Logistics",
        "version": "2.0.0",
        "database": db_type,
        "docs": "/docs",
        "health": "/health",
        "features": [
            "Company authentication & profiles",
            "AI-powered route optimization",
            "Real-time cost prediction with ML",
            "Multi-objective path finding",
            "Weather-aware routing",
            "Risk assessment & mitigation",
            "Historical data learning",
            "Google Maps & Weather API integration"
        ]
    }
