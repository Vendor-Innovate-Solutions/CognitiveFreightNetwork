from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from app.api import new_routes
from app.models.database import init_db, USE_MONGODB
from app.services.ml_models import cost_model

# Import error handling and monitoring
from app.core.error_handling import (
    correlation_id_middleware,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.core.monitoring import health_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Cognitive Freight Network API...")
    print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
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
    
    print("🔍 Health check available at /health")
    print("📊 Monitoring available at /health/detailed")
    print("✅ API ready to serve requests")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="Cognitive Freight Network API",
    description="AI-Powered Logistics Planning & Optimization Platform",
    version="2.0.0",
    lifespan=lifespan
)

# Add error handling middleware (must be first)
app.middleware("http")(correlation_id_middleware)

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

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

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
        "monitoring": {
            "health_check": "/health",
            "detailed_health": "/health/detailed",
            "readiness": "/health/ready",
            "liveness": "/health/live"
        },
        "features": [
            "Company authentication & profiles",
            "AI-powered route optimization",
            "Real-time cost prediction with ML",
            "Multi-objective path finding",
            "Weather-aware routing",
            "Risk assessment & mitigation",
            "Historical data learning",
            "Google Maps & Weather API integration",
            "Comprehensive error handling with correlation IDs",
            "System health monitoring and metrics"
        ]
    }

# Enhanced health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return health_service.perform_health_check(detailed=False)

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with system metrics"""
    return health_service.perform_health_check(detailed=True)

@app.get("/health/ready")
async def readiness_check():
    """Kubernetes-style readiness probe"""
    return health_service.get_readiness()

@app.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe"""
    return health_service.get_liveness()
