"""
MongoDB Database Configuration and Models
Alternative to SQLAlchemy for MongoDB usage
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import asyncio
from bson import ObjectId
from pydantic import BaseModel, Field

# MongoDB Connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://venkateshk:venkat*2005@cluster0.mujtrmk.mongodb.net/")
DATABASE_NAME = "cognitive_freight_network"

# Async MongoDB client for FastAPI
async_client = None
async_db = None

# Sync MongoDB client for regular operations
sync_client = None
sync_db = None


def init_mongodb():
    """Initialize MongoDB connections"""
    global async_client, async_db, sync_client, sync_db
    
    # Async client for FastAPI
    async_client = AsyncIOMotorClient(MONGODB_URL)
    async_db = async_client[DATABASE_NAME]
    
    # Sync client for regular operations
    sync_client = MongoClient(MONGODB_URL)
    sync_db = sync_client[DATABASE_NAME]
    
    print("✅ MongoDB connections initialized")
    return async_db, sync_db


async def get_mongodb():
    """Get async MongoDB database instance"""
    global async_db
    if async_db is None:
        init_mongodb()
    return async_db


def get_sync_mongodb():
    """Get sync MongoDB database instance"""
    global sync_db
    if sync_db is None:
        init_mongodb()
    return sync_db


class PyObjectId(ObjectId):
    """Custom ObjectId class for Pydantic models"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema


# Pydantic Models for MongoDB

class Company(BaseModel):
    """Company/Organization using the platform"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=100)
    hashed_password: str
    company_type: Optional[str] = None  # Shipper, Transporter, Both
    
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None  # GST Number
    
    subscription_tier: str = "free"  # free, basic, premium
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class APIKey(BaseModel):
    """Store external API keys per company"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    company_id: PyObjectId
    
    google_maps_key: Optional[str] = None
    weather_api_key: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Shipment(BaseModel):
    """Historical and planned shipments"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    company_id: PyObjectId
    
    # Shipment details
    shipment_ref: str = Field(..., max_length=50)
    status: str  # planned, in_transit, completed, cancelled
    
    # Origin & Destination
    origin_city: str
    origin_state: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    
    destination_city: str
    destination_state: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    
    # Transport details
    transport_mode: Optional[str] = None  # Road, Rail, Air, Coastal
    vehicle_type: Optional[str] = None  # Truck type, container size
    distance_km: Optional[float] = None
    
    # Cargo details
    cargo_type: Optional[str] = None
    cargo_weight_tons: Optional[float] = None
    cargo_value: Optional[float] = None
    is_fragile: bool = False
    is_perishable: bool = False
    requires_refrigeration: bool = False
    
    # Timing
    pickup_datetime: Optional[datetime] = None
    planned_delivery_datetime: Optional[datetime] = None
    actual_delivery_datetime: Optional[datetime] = None
    
    # Costs (for completed shipments)
    fuel_cost: Optional[float] = None
    toll_charges: Optional[float] = None
    labor_cost: Optional[float] = None
    maintenance_cost: Optional[float] = None
    other_costs: Optional[float] = None
    total_cost: Optional[float] = None
    
    # Revenue
    freight_charge: Optional[float] = None
    
    # Performance metrics
    dwell_time_hours: Optional[float] = None
    idle_time_hours: Optional[float] = None
    delay_hours: Optional[float] = None
    
    # External conditions
    weather_condition: Optional[str] = None
    traffic_level: Optional[str] = None
    
    # Incidents
    had_breakdown: bool = False
    had_damage: bool = False
    had_theft: bool = False
    damage_cost: float = 0
    
    # ML predictions (for planned shipments)
    predicted_cost: Optional[float] = None
    predicted_time_hours: Optional[float] = None
    risk_score: Optional[float] = None
    recommended_route: Optional[Dict[str, Any]] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CustomRoute(BaseModel):
    """Company-defined custom routes"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    company_id: PyObjectId
    
    route_name: str
    origin_city: str
    destination_city: str
    
    waypoints: Optional[List[str]] = None  # List of intermediate cities
    preferred: bool = False
    notes: Optional[str] = None
    
    # Historical performance
    avg_cost: Optional[float] = None
    avg_time_hours: Optional[float] = None
    usage_count: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class RouteCache(BaseModel):
    """Cache Google Maps route data"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    origin: str
    destination: str
    
    distance_km: Optional[float] = None
    duration_hours: Optional[float] = None
    route_geometry: Optional[Dict[str, Any]] = None
    waypoints: Optional[List[str]] = None
    
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Cache for 30 days

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class WeatherCache(BaseModel):
    """Cache weather data"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    city: str
    date: datetime
    
    temperature_c: Optional[float] = None
    precipitation_mm: Optional[float] = None
    weather_condition: Optional[str] = None
    wind_speed_kmh: Optional[float] = None
    
    cached_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MLModel(BaseModel):
    """Track ML model versions and performance"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    model_name: str  # cost_predictor, route_optimizer
    version: str
    
    training_samples: Optional[int] = None
    accuracy_score: Optional[float] = None
    rmse: Optional[float] = None
    
    model_file_path: Optional[str] = None
    is_active: bool = False
    
    trained_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# MongoDB Repository Classes

class CompanyRepository:
    """Repository for Company operations"""
    
    def __init__(self):
        self.collection_name = "companies"
    
    async def create(self, company: Company) -> Company:
        """Create a new company"""
        db = await get_mongodb()
        company_dict = company.dict(by_alias=True, exclude_unset=True)
        company_dict.pop("id", None)  # Remove id if present
        result = await db[self.collection_name].insert_one(company_dict)
        company.id = result.inserted_id
        return company
    
    async def find_by_email(self, email: str) -> Optional[Company]:
        """Find company by email"""
        db = await get_mongodb()
        doc = await db[self.collection_name].find_one({"email": email})
        return Company(**doc) if doc else None
    
    async def find_by_id(self, company_id: str) -> Optional[Company]:
        """Find company by ID"""
        db = await get_mongodb()
        doc = await db[self.collection_name].find_one({"_id": ObjectId(company_id)})
        return Company(**doc) if doc else None


class ShipmentRepository:
    """Repository for Shipment operations"""
    
    def __init__(self):
        self.collection_name = "shipments"
    
    async def create(self, shipment: Shipment) -> Shipment:
        """Create a new shipment"""
        db = await get_mongodb()
        shipment_dict = shipment.dict(by_alias=True, exclude_unset=True)
        shipment_dict.pop("id", None)
        result = await db[self.collection_name].insert_one(shipment_dict)
        shipment.id = result.inserted_id
        return shipment
    
    async def find_by_company(self, company_id: str, limit: int = 10, offset: int = 0, status: Optional[str] = None) -> List[Shipment]:
        """Find shipments by company"""
        db = await get_mongodb()
        query = {"company_id": ObjectId(company_id)}
        if status:
            query["status"] = status
        
        cursor = db[self.collection_name].find(query).skip(offset).limit(limit).sort("created_at", -1)
        docs = await cursor.to_list(length=limit)
        return [Shipment(**doc) for doc in docs]
    
    async def find_by_id(self, shipment_id: str) -> Optional[Shipment]:
        """Find shipment by ID"""
        db = await get_mongodb()
        doc = await db[self.collection_name].find_one({"_id": ObjectId(shipment_id)})
        return Shipment(**doc) if doc else None
    
    async def get_analytics(self, company_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Get shipment analytics for company"""
        db = await get_mongodb()
        pipeline = [
            {"$match": {"company_id": ObjectId(company_id)}},
            {"$group": {
                "_id": None,
                "total_shipments": {"$sum": 1},
                "total_cost": {"$sum": "$total_cost"},
                "total_revenue": {"$sum": "$freight_charge"},
                "avg_cost_per_shipment": {"$avg": "$total_cost"},
                "avg_delay_hours": {"$avg": "$delay_hours"},
                "on_time_count": {"$sum": {"$cond": [{"$lte": ["$delay_hours", 0]}, 1, 0]}},
                "incident_count": {"$sum": {"$cond": [
                    {"$or": ["$had_breakdown", "$had_damage", "$had_theft"]}, 1, 0
                ]}}
            }}
        ]
        
        result = await db[self.collection_name].aggregate(pipeline).to_list(length=1)
        if not result:
            return {
                "total_shipments": 0,
                "total_cost": 0,
                "total_revenue": 0,
                "profit": 0,
                "profit_margin_percentage": 0,
                "avg_cost_per_shipment": 0,
                "on_time_delivery_rate": 0,
                "avg_delay_hours": 0,
                "incident_rate": 0,
                "period": f"{period_days}d"
            }
        
        data = result[0]
        total_cost = data.get("total_cost", 0) or 0
        total_revenue = data.get("total_revenue", 0) or 0
        profit = total_revenue - total_cost
        profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        on_time_rate = (data.get("on_time_count", 0) / data.get("total_shipments", 1)) if data.get("total_shipments", 0) > 0 else 0
        incident_rate = (data.get("incident_count", 0) / data.get("total_shipments", 1)) if data.get("total_shipments", 0) > 0 else 0
        
        return {
            "total_shipments": data.get("total_shipments", 0),
            "total_cost": total_cost,
            "total_revenue": total_revenue,
            "profit": profit,
            "profit_margin_percentage": profit_margin,
            "avg_cost_per_shipment": data.get("avg_cost_per_shipment", 0) or 0,
            "on_time_delivery_rate": on_time_rate,
            "avg_delay_hours": data.get("avg_delay_hours", 0) or 0,
            "incident_rate": incident_rate,
            "period": f"{period_days}d"
        }


# Initialize repositories
company_repo = CompanyRepository()
shipment_repo = ShipmentRepository()