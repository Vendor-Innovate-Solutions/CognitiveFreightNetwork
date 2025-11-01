"""
Data models for the AI-Enabled Logistics Optimizer
Represents vessels, ports, plants, materials, and optimization constraints
"""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class MaterialType(str, Enum):
    COKING_COAL = "coking_coal"
    LIMESTONE = "limestone"


class VesselStatus(str, Enum):
    IN_TRANSIT = "in_transit"
    AT_PORT = "at_port"
    DELAYED = "delayed"
    DISCHARGED = "discharged"


class PortName(str, Enum):
    HALDIA = "Haldia"
    PARADIP = "Paradip"
    VIZAG = "Vizag"
    CHENNAI = "Chennai"
    ENNORE = "Ennore"


class PlantName(str, Enum):
    PLANT_A = "Plant A"
    PLANT_B = "Plant B"
    PLANT_C = "Plant C"
    PLANT_D = "Plant D"
    PLANT_E = "Plant E"


class Coordinate(BaseModel):
    latitude: float
    longitude: float


class Port(BaseModel):
    name: PortName
    location: Coordinate
    capacity_mt: float = Field(..., description="Storage capacity in metric tons")
    current_stock_mt: float = Field(0, description="Current stock level in metric tons")
    handling_cost_per_mt: float = Field(..., description="Port handling cost per metric ton")
    storage_cost_per_day_per_mt: float = Field(..., description="Storage cost per day per MT")
    discharge_rate_mt_per_day: float = Field(..., description="Discharge rate in MT per day")


class Plant(BaseModel):
    name: PlantName
    location: Coordinate
    capacity_mt: float = Field(..., description="Storage capacity in metric tons")
    current_stock_mt: float = Field(0, description="Current stock in metric tons")
    requirements: Dict[MaterialType, float] = Field(..., description="Monthly requirements by material type")
    quality_specs: Dict[str, float] = Field({}, description="Quality specifications (e.g., ash content, moisture)")


class Vessel(BaseModel):
    id: str
    name: str
    material_type: MaterialType
    cargo_mt: float = Field(..., description="Cargo quantity in metric tons")
    origin_port: str
    eta: datetime = Field(..., description="Estimated time of arrival")
    actual_eta: Optional[datetime] = Field(None, description="Predicted actual ETA with delays")
    status: VesselStatus = VesselStatus.IN_TRANSIT
    demurrage_rate_per_day: float = Field(..., description="Demurrage cost per day")
    free_time_days: int = Field(2, description="Free time before demurrage starts")
    current_location: Optional[Coordinate] = None
    quality_metrics: Dict[str, float] = Field({}, description="Material quality metrics")


class RailwayRake(BaseModel):
    id: str
    capacity_mt: float = Field(60, description="Capacity in metric tons (typical rake)")
    availability: bool = True
    current_location: Optional[PortName] = None
    cost_per_km_per_mt: float = Field(0.5, description="Railway freight cost per km per MT")


class PortDistance(BaseModel):
    port: PortName
    plant: PlantName
    distance_km: float


class CostBreakdown(BaseModel):
    ocean_freight: float = 0
    port_costs: float = 0
    railway_freight: float = 0
    demurrage: float = 0
    storage: float = 0
    total: float = 0


class VesselAssignment(BaseModel):
    vessel_id: str
    port: PortName
    discharge_quantity_mt: float
    visit_sequence: int = Field(..., description="1 for first port, 2 for second, etc.")
    eta: datetime
    expected_discharge_time_days: float


class RakeAssignment(BaseModel):
    rake_id: str
    port: PortName
    plant: PlantName
    quantity_mt: float
    departure_date: datetime
    arrival_date: datetime
    cost: float


class OptimizationSolution(BaseModel):
    solution_id: str
    timestamp: datetime
    total_cost: float
    cost_breakdown: CostBreakdown
    vessel_assignments: List[VesselAssignment]
    rake_assignments: List[RakeAssignment]
    unmet_demand: Dict[PlantName, Dict[MaterialType, float]] = {}
    is_feasible: bool = True
    optimization_time_seconds: float = 0
    constraints_satisfied: Dict[str, bool] = {}


class OptimizationRequest(BaseModel):
    vessels: List[Vessel]
    ports: List[Port]
    plants: List[Plant]
    available_rakes: List[RailwayRake]
    port_distances: List[PortDistance]
    time_horizon_days: int = Field(30, description="Planning horizon in days")
    use_ai_prediction: bool = Field(True, description="Use AI to predict vessel delays")
    optimization_timeout_seconds: int = Field(300, description="Max optimization time")


class DelayPredictionInput(BaseModel):
    vessel_id: str
    origin_port: str
    destination_port: PortName
    scheduled_eta: datetime
    cargo_mt: float
    material_type: MaterialType
    weather_conditions: Optional[Dict[str, float]] = Field(None, description="Weather data if available")
    historical_delay_hours: Optional[float] = Field(None, description="Historical average delay")


class DelayPredictionOutput(BaseModel):
    vessel_id: str
    predicted_delay_hours: float
    confidence_score: float = Field(..., ge=0, le=1, description="Prediction confidence 0-1")
    predicted_eta: datetime
    demurrage_risk: str = Field(..., description="low/medium/high")
    factors: Dict[str, float] = Field({}, description="Contributing factors to delay")


class WhatIfScenario(BaseModel):
    scenario_name: str
    description: str
    changes: Dict[str, float] = Field(..., description="Parameter changes, e.g., {'railway_cost_multiplier': 1.1}")
    port_closures: List[PortName] = []
    additional_vessels: List[Vessel] = []
    modified_demand: Dict[PlantName, Dict[MaterialType, float]] = {}


class WhatIfAnalysisRequest(BaseModel):
    base_request: OptimizationRequest
    scenarios: List[WhatIfScenario]


class WhatIfAnalysisResult(BaseModel):
    scenario_name: str
    solution: OptimizationSolution
    cost_difference: float
    cost_difference_percentage: float
    key_insights: List[str]
