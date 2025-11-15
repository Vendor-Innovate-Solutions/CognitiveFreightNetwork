"""
System Monitoring and Health Check Module
Provides comprehensive system health monitoring and metrics
"""

import os
import psutil
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.models.database import USE_MONGODB
import sys


class HealthStatus(BaseModel):
    """Health check status model"""
    status: str  # healthy, degraded, unhealthy
    timestamp: str
    uptime_seconds: float
    version: str
    environment: str


class SystemMetrics(BaseModel):
    """System resource metrics"""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float


class DatabaseHealth(BaseModel):
    """Database health status"""
    status: str
    type: str  # mongodb or sqlalchemy
    connected: bool
    response_time_ms: Optional[float] = None


class ExternalServiceHealth(BaseModel):
    """External service health status"""
    name: str
    status: str
    available: bool
    response_time_ms: Optional[float] = None


class MLModelHealth(BaseModel):
    """ML model health status"""
    name: str
    trained: bool
    last_trained: Optional[str] = None
    sample_count: Optional[int] = None


class DetailedHealthResponse(BaseModel):
    """Detailed health check response"""
    status: str
    timestamp: str
    uptime_seconds: float
    version: str
    environment: str
    system: SystemMetrics
    database: DatabaseHealth
    external_services: List[ExternalServiceHealth]
    ml_models: List[MLModelHealth]
    checks: Dict[str, Any]


class HealthCheckService:
    """Service for system health monitoring"""
    
    def __init__(self):
        self.start_time = time.time()
        self.version = "2.0.0"
        self.environment = os.getenv("ENVIRONMENT", "development")
    
    def get_uptime(self) -> float:
        """Get application uptime in seconds"""
        return time.time() - self.start_time
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get system resource metrics"""
        try:
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return SystemMetrics(
                cpu_percent=psutil.cpu_percent(interval=0.1),
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                memory_total_mb=memory.total / (1024 * 1024),
                disk_percent=disk.percent,
                disk_used_gb=disk.used / (1024 * 1024 * 1024),
                disk_total_gb=disk.total / (1024 * 1024 * 1024)
            )
        except Exception as e:
            # Return mock data if psutil fails
            return SystemMetrics(
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_mb=0.0,
                memory_total_mb=0.0,
                disk_percent=0.0,
                disk_used_gb=0.0,
                disk_total_gb=0.0
            )
    
    def check_database_health(self) -> DatabaseHealth:
        """Check database connectivity and health"""
        try:
            start_time = time.time()
            
            if USE_MONGODB:
                # Check MongoDB connection
                from app.models.mongodb import get_sync_mongodb
                db = get_sync_mongodb()
                # Perform a simple operation to verify connection
                db.command('ping')
                response_time = (time.time() - start_time) * 1000
                
                return DatabaseHealth(
                    status="healthy",
                    type="mongodb",
                    connected=True,
                    response_time_ms=response_time
                )
            else:
                # Check SQLAlchemy connection
                from app.models.database import SessionLocal
                db = SessionLocal()
                db.execute("SELECT 1")
                db.close()
                response_time = (time.time() - start_time) * 1000
                
                return DatabaseHealth(
                    status="healthy",
                    type="sqlalchemy",
                    connected=True,
                    response_time_ms=response_time
                )
        except Exception as e:
            return DatabaseHealth(
                status="unhealthy",
                type="mongodb" if USE_MONGODB else "sqlalchemy",
                connected=False
            )
    
    def check_external_services(self) -> List[ExternalServiceHealth]:
        """Check external service availability"""
        services = []
        
        # Check Google Maps API
        google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
        services.append(ExternalServiceHealth(
            name="google_maps",
            status="configured" if google_maps_key else "not_configured",
            available=bool(google_maps_key)
        ))
        
        # Check Weather API
        weather_key = os.getenv("WEATHER_API_KEY")
        services.append(ExternalServiceHealth(
            name="weather_api",
            status="configured" if weather_key else "not_configured",
            available=bool(weather_key)
        ))
        
        # Check Mapbox Token
        mapbox_token = os.getenv("MAPBOX_TOKEN")
        services.append(ExternalServiceHealth(
            name="mapbox",
            status="configured" if mapbox_token else "not_configured",
            available=bool(mapbox_token)
        ))
        
        return services
    
    def check_ml_models(self) -> List[MLModelHealth]:
        """Check ML model status"""
        models = []
        
        try:
            from app.services.ml_models import cost_model, time_model
            
            models.append(MLModelHealth(
                name="cost_predictor",
                trained=cost_model.is_trained,
                sample_count=cost_model.training_samples
            ))
            
            models.append(MLModelHealth(
                name="time_predictor",
                trained=True,  # Time model is always available
                sample_count=None
            ))
        except Exception as e:
            models.append(MLModelHealth(
                name="ml_models",
                trained=False
            ))
        
        return models
    
    def perform_health_check(self, detailed: bool = False) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        
        if not detailed:
            # Simple health check
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": self.get_uptime(),
                "version": self.version
            }
        
        # Detailed health check
        system_metrics = self.get_system_metrics()
        db_health = self.check_database_health()
        external_services = self.check_external_services()
        ml_models = self.check_ml_models()
        
        # Determine overall status
        checks = {
            "database": db_health.connected,
            "system_resources": system_metrics.cpu_percent < 90 and system_metrics.memory_percent < 90,
            "external_services_configured": any(s.available for s in external_services),
            "ml_models_available": any(m.trained for m in ml_models)
        }
        
        all_healthy = all(checks.values())
        some_degraded = not all_healthy and any(checks.values())
        
        overall_status = "healthy" if all_healthy else ("degraded" if some_degraded else "unhealthy")
        
        return DetailedHealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            uptime_seconds=self.get_uptime(),
            version=self.version,
            environment=self.environment,
            system=system_metrics,
            database=db_health,
            external_services=external_services,
            ml_models=ml_models,
            checks=checks
        ).dict()
    
    def get_readiness(self) -> Dict[str, Any]:
        """Check if application is ready to serve requests"""
        db_health = self.check_database_health()
        
        is_ready = db_health.connected
        
        return {
            "ready": is_ready,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "database": db_health.connected
            }
        }
    
    def get_liveness(self) -> Dict[str, Any]:
        """Check if application is alive"""
        return {
            "alive": True,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": self.get_uptime()
        }


# Global health check service instance
health_service = HealthCheckService()
