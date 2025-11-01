from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database URL - supports SQLite for dev, PostgreSQL for production, MongoDB for cloud
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./logistics.db")
MONGODB_URL = os.getenv("MONGODB_URL")

# Determine database type
USE_MONGODB = DATABASE_URL.startswith("mongodb") or MONGODB_URL is not None

if not USE_MONGODB:
    # SQLAlchemy configuration for SQL databases
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
else:
    # MongoDB configuration
    from .mongodb_simple import init_mongodb
    print("🔄 Using MongoDB database configuration")
    engine = None
    SessionLocal = None
    Base = None


# SQLAlchemy Models (only used when not using MongoDB)
if not USE_MONGODB:
    class Company(Base):
        """Company/Organization using the platform"""
        __tablename__ = "companies"
        
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String, unique=True, index=True, nullable=False)
        email = Column(String, unique=True, index=True, nullable=False)
        hashed_password = Column(String, nullable=False)
        company_type = Column(String)  # Shipper, Transporter, Both
        
        phone = Column(String)
        address = Column(Text)
        gstin = Column(String, unique=True)  # GST Number
        
        subscription_tier = Column(String, default="free")  # free, basic, premium
        is_active = Column(Boolean, default=True)
        
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        shipments = relationship("Shipment", back_populates="company")
        routes = relationship("CustomRoute", back_populates="company")
        api_keys = relationship("APIKey", back_populates="company")


class APIKey(Base):
    """Store external API keys per company"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    google_maps_key = Column(String)
    weather_api_key = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="api_keys")


class Shipment(Base):
    """Historical and planned shipments"""
    __tablename__ = "shipments"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    # Shipment details
    shipment_ref = Column(String, unique=True, index=True)
    status = Column(String)  # planned, in_transit, completed, cancelled
    
    # Origin & Destination
    origin_city = Column(String, nullable=False)
    origin_state = Column(String)
    origin_lat = Column(Float)
    origin_lng = Column(Float)
    
    destination_city = Column(String, nullable=False)
    destination_state = Column(String)
    destination_lat = Column(Float)
    destination_lng = Column(Float)
    
    # Transport details
    transport_mode = Column(String)  # Road, Rail, Air, Coastal
    vehicle_type = Column(String)  # Truck type, container size
    distance_km = Column(Float)
    
    # Cargo details
    cargo_type = Column(String)
    cargo_weight_tons = Column(Float)
    cargo_value = Column(Float)
    is_fragile = Column(Boolean, default=False)
    is_perishable = Column(Boolean, default=False)
    requires_refrigeration = Column(Boolean, default=False)
    
    # Timing
    pickup_datetime = Column(DateTime)
    planned_delivery_datetime = Column(DateTime)
    actual_delivery_datetime = Column(DateTime)
    
    # Costs (for completed shipments)
    fuel_cost = Column(Float)
    toll_charges = Column(Float)
    labor_cost = Column(Float)
    maintenance_cost = Column(Float)
    other_costs = Column(Float)
    total_cost = Column(Float)
    
    # Revenue
    freight_charge = Column(Float)
    
    # Performance metrics
    dwell_time_hours = Column(Float)
    idle_time_hours = Column(Float)
    delay_hours = Column(Float)
    
    # External conditions
    weather_condition = Column(String)
    traffic_level = Column(String)
    
    # Incidents
    had_breakdown = Column(Boolean, default=False)
    had_damage = Column(Boolean, default=False)
    had_theft = Column(Boolean, default=False)
    damage_cost = Column(Float, default=0)
    
    # ML predictions (for planned shipments)
    predicted_cost = Column(Float)
    predicted_time_hours = Column(Float)
    risk_score = Column(Float)
    recommended_route = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="shipments")


class CustomRoute(Base):
    """Company-defined custom routes"""
    __tablename__ = "custom_routes"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    route_name = Column(String, nullable=False)
    origin_city = Column(String, nullable=False)
    destination_city = Column(String, nullable=False)
    
    waypoints = Column(JSON)  # List of intermediate cities
    preferred = Column(Boolean, default=False)
    notes = Column(Text)
    
    # Historical performance
    avg_cost = Column(Float)
    avg_time_hours = Column(Float)
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="routes")


class RouteCache(Base):
    """Cache Google Maps route data"""
    __tablename__ = "route_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    
    origin = Column(String, nullable=False, index=True)
    destination = Column(String, nullable=False, index=True)
    
    distance_km = Column(Float)
    duration_hours = Column(Float)
    route_geometry = Column(JSON)
    waypoints = Column(JSON)
    
    cached_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)  # Cache for 30 days


class WeatherCache(Base):
    """Cache weather data"""
    __tablename__ = "weather_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    
    city = Column(String, nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    temperature_c = Column(Float)
    precipitation_mm = Column(Float)
    weather_condition = Column(String)
    wind_speed_kmh = Column(Float)
    
    cached_at = Column(DateTime, default=datetime.utcnow)


class MLModel(Base):
    """Track ML model versions and performance"""
    __tablename__ = "ml_models"
    
    id = Column(Integer, primary_key=True, index=True)
    
    model_name = Column(String, nullable=False)  # cost_predictor, route_optimizer
    version = Column(String, nullable=False)
    
    training_samples = Column(Integer)
    accuracy_score = Column(Float)
    rmse = Column(Float)
    
    model_file_path = Column(String)
    is_active = Column(Boolean, default=False)
    
    trained_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Initialize database tables"""
    if USE_MONGODB:
        # Initialize MongoDB
        init_mongodb()
        print("✅ MongoDB database initialized")
    else:
        # Initialize SQLAlchemy tables
        Base.metadata.create_all(bind=engine)
        print("✅ SQLAlchemy database tables created")


def get_db():
    """Dependency for database session"""
    if USE_MONGODB:
        # For MongoDB, return None as we'll use direct database access
        return None
    else:
        # SQLAlchemy session
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
