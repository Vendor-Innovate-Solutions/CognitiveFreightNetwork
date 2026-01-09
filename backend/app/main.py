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
from app.core.rate_limit import rate_limit_middleware, RateLimits, cache
from app.core.security import security_headers_middleware, get_cors_config

# Get environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Cognitive Freight Network API...")
    print(f"📍 Environment: {ENVIRONMENT}")
    
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
    
    print("🔒 Security features enabled")
    print("🚦 Rate limiting enabled")
    print("💾 In-memory caching enabled")
    print("🔍 Health check available at /health")
    print("📊 Monitoring available at /health/detailed")
    print("✅ API ready to serve requests")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")
    print("💾 Clearing cache...")
    cache.clear()

app = FastAPI(
    title="Cognitive Freight Network API",
    description="AI-Powered Logistics Planning & Optimization Platform",
    version="2.0.0",
    lifespan=lifespan
)

# Add error handling middleware (must be first)
app.middleware("http")(correlation_id_middleware)

# Add security headers middleware
app.middleware("http")(security_headers_middleware)

# Add rate limiting middleware
async def apply_rate_limiting(request: Request, call_next):
    """Apply rate limiting with environment-specific limits"""
    # Use generous limits for development, standard for production
    limits = RateLimits.GENEROUS if ENVIRONMENT == "development" else RateLimits.STANDARD
    return await rate_limit_middleware(request, call_next, **limits)

app.middleware("http")(apply_rate_limiting)

# Configure CORS based on environment
cors_config = get_cors_config(ENVIRONMENT)
app.add_middleware(CORSMiddleware, **cors_config)

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include routers
app.include_router(new_routes.router)

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    db_type = "MongoDB" if USE_MONGODB else "SQLAlchemy"
    return {
        "message": "Cognitive Freight Network API - AI-Powered Logistics",
        "version": "2.0.0",
        "environment": ENVIRONMENT,
        "database": db_type,
        "docs": "/docs",
        "health": "/health",
        "monitoring": {
            "health_check": "/health",
            "detailed_health": "/health/detailed",
            "readiness": "/health/ready",
            "liveness": "/health/live",
            "cache_stats": "/health/cache"
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
            "System health monitoring and metrics",
            "API rate limiting (100 req/min)",
            "In-memory caching with TTL",
            "Security headers (OWASP recommendations)",
            "CORS configuration per environment"
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

@app.get("/health/cache")
async def cache_stats():
    """Get cache statistics"""
    return {
        "cache": cache.get_stats(),
        "timestamp": datetime.utcnow().isoformat()
    }
