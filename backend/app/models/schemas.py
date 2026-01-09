from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum


class TransportMode(str, Enum):
    ROAD = "Road"
    RAIL = "Rail"
    AIR = "Air"
    COASTAL = "Coastal"
    MULTIMODAL = "Multimodal"


class ShipmentStatus(str, Enum):
    PLANNED = "planned"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VehicleType(str, Enum):
    SMALL_TRUCK = "Small Truck (<7.5T)"
    MEDIUM_TRUCK = "Medium Truck (7.5-16T)"
    HEAVY_TRUCK = "Heavy Truck (16-25T)"
    MULTI_AXLE = "Multi-Axle (>25T)"
    CONTAINER_20FT = "20ft Container"
    CONTAINER_40FT = "40ft Container"
    RAIL_WAGON = "Rail Wagon"
    CARGO_AIRCRAFT = "Cargo Aircraft"


# ============ Authentication Schemas ============

class CompanyRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=50)
    company_type: str = Field(..., pattern="^(Shipper|Transporter|Both)$")
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    
    @validator('phone', 'gstin', pre=True)
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v
    
    @validator('gstin')
    def validate_gstin(cls, v):
        # GSTIN validation is relaxed for testing - ideally should be exactly 15 characters
        if v and len(v) < 10:
            raise ValueError('GSTIN must be at least 10 characters')
        return v


class CompanyLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company_name: str
    subscription_tier: str


class CompanyProfile(BaseModel):
    id: int
    name: str
    email: str
    company_type: str
    phone: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    subscription_tier: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Shipment Planning Schemas ============

class ShipmentPlanRequest(BaseModel):
    """Input for planning a new shipment"""
    
    # Origin & Destination
    origin_city: str = Field(..., description="e.g., Mumbai")
    origin_state: str = Field(..., description="e.g., Maharashtra")
    destination_city: str = Field(..., description="e.g., Delhi")
    destination_state: str = Field(..., description="e.g., Delhi")
    
    # Transport details
    transport_mode: TransportMode
    vehicle_type: VehicleType
    
    # Cargo details
    cargo_type: str = Field(..., description="Electronics, Textiles, Perishable, etc.")
    cargo_weight_tons: float = Field(..., gt=0, le=1000, description="Weight in metric tons (up to 1000t for bulk shipments)")
    cargo_value: float = Field(..., gt=0, description="Value in INR")
    
    is_fragile: bool = False
    is_hazardous: bool = False
    is_perishable: Optional[bool] = False
    requires_refrigeration: Optional[bool] = False
    
    # Timing
    pickup_datetime: datetime
    delivery_deadline: Optional[datetime] = None
    
    # Optional preferences
    preference: Optional[str] = "balanced"  # fastest, cheapest, safest, balanced
    prefer_fastest: Optional[bool] = True  # vs cheapest
    avoid_toll_roads: Optional[bool] = False
    prefer_highways: Optional[bool] = True
    
    # Custom waypoints
    waypoints: Optional[List[str]] = None


class RouteSegment(BaseModel):
    """A segment in the complete route"""
    from_location: str
    to_location: str
    distance_km: float
    duration_hours: float
    road_quality: str
    toll_count: int
    risk_score: float


class WeatherForecast(BaseModel):
    """Weather conditions along route"""
    city: str
    date: datetime
    temperature_c: float
    condition: str
    precipitation_mm: float
    wind_speed_kmh: float
    impact_on_transit: str  # Minimal, Moderate, Severe


class CostBreakdownResponse(BaseModel):
    """Detailed cost prediction"""
    
    fuel_cost: float
    toll_charges: float
    driver_wages: float
    vehicle_maintenance: float
    insurance_cost: float
    loading_unloading: float
    permits_and_docs: float
    contingency: float
    
    total_estimated_cost: float
    cost_per_km: float
    cost_per_ton: float
    
    confidence_level: float = Field(..., ge=0, le=1)


class RiskAssessment(BaseModel):
    """Risk analysis for shipment"""
    
    overall_risk_score: float = Field(..., ge=0, le=1)
    risk_level: str  # Low, Moderate, High, Critical
    
    delay_risk: float
    damage_risk: float
    theft_risk: float
    weather_risk: float
    
    risk_factors: List[str]
    mitigation_recommendations: List[str]


class RouteOption(BaseModel):
    """A route option with all details"""
    
    route_id: str
    route_name: str  # "Via NH48 (Fastest)" or "Via SH (Economic)"
    
    # Route details
    total_distance_km: float
    estimated_time_hours: float
    segments: List[RouteSegment]
    
    # Predictions
    cost_breakdown: CostBreakdownResponse
    risk_assessment: RiskAssessment
    weather_forecast: List[WeatherForecast]
    
    # Rankings
    cost_rank: int
    time_rank: int
    safety_rank: int
    overall_score: float
    
    # Recommendations
    is_recommended: bool
    recommendation_reason: str


class ShipmentPlanResponse(BaseModel):
    """Complete shipment plan with multiple route options"""
    
    plan_id: str
    created_at: datetime
    
    # Input summary
    origin: str
    destination: str
    cargo_summary: str
    
    # Route options (sorted by overall_score)
    route_options: List[RouteOption]
    
    # Best route
    recommended_route: RouteOption
    
    # Market insights
    similar_shipments_avg_cost: Optional[float]
    price_trend: str  # "Average", "Above Average", "Below Average"
    
    # Action items
    next_steps: List[str]


# ============ Historical Data Collection ============

class HistoricalShipmentSubmit(BaseModel):
    """Company submits past shipment data for ML training"""
    
    shipment_ref: str
    
    # Route
    origin_city: str
    destination_city: str
    distance_km: float
    
    # Transport
    transport_mode: TransportMode
    vehicle_type: VehicleType
    
    # Cargo
    cargo_type: str
    cargo_weight_tons: float
    cargo_value: float
    
    # Timing
    pickup_datetime: datetime
    delivery_datetime: datetime
    
    # Actual costs
    fuel_cost: float
    toll_charges: float
    labor_cost: float
    maintenance_cost: float
    other_costs: float
    total_cost: float
    
    # Revenue
    freight_charge: float
    
    # Incidents
    had_delays: bool = False
    delay_hours: Optional[float] = 0
    had_breakdown: bool = False
    had_damage: bool = False
    damage_cost: Optional[float] = 0
    
    # Conditions
    weather_condition: Optional[str] = None
    traffic_level: Optional[str] = None


class DataUploadStatus(BaseModel):
    """Status of bulk data upload"""
    
    total_records: int
    successful: int
    failed: int
    errors: List[Dict]
    
    message: str


# ============ Analytics Schemas ============

class CompanyAnalytics(BaseModel):
    """Company's logistics analytics"""
    
    period: str
    
    # Volume
    total_shipments: int
    total_distance_km: float
    total_cargo_tons: float
    
    # Financial
    total_cost: float
    total_revenue: float
    profit: float
    profit_margin_percentage: float
    avg_cost_per_shipment: float
    
    # Performance
    on_time_delivery_rate: float
    avg_delay_hours: float
    incident_rate: float
    
    # Trends
    cost_trend: str
    volume_trend: str
    
    # Top routes
    most_used_routes: List[Dict]
    most_profitable_routes: List[Dict]
    most_problematic_routes: List[Dict]


# ============ Real-time Tracking ============

class ShipmentUpdate(BaseModel):
    """Real-time update for in-transit shipment"""
    
    shipment_id: int
    current_location: str
    current_lat: float
    current_lng: float
    
    status: str
    estimated_arrival: datetime
    
    delay_hours: float = 0
    delay_reason: Optional[str] = None
    
    current_weather: Optional[str] = None


class TrackingResponse(BaseModel):
    """Shipment tracking info"""
    
    shipment_ref: str
    status: ShipmentStatus
    
    origin: str
    destination: str
    current_location: str
    
    progress_percentage: float
    distance_remaining_km: float
    
    planned_arrival: datetime
    estimated_arrival: datetime
    
    recent_updates: List[Dict]
    alerts: List[Dict]
