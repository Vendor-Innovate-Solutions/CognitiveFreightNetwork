from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from app.models.database import get_db, USE_MONGODB
from app.services.unified_db import db_service
from app.services.google_maps_service import calculate_route_distance, get_direct_distance

# Only import SQLAlchemy models when not using MongoDB
if not USE_MONGODB:
    from app.models.database import Company, Shipment
from app.models.schemas import (
    CompanyRegister, CompanyLogin, Token, CompanyProfile,
    ShipmentPlanRequest, ShipmentPlanResponse, RouteOption,
    HistoricalShipmentSubmit, DataUploadStatus,
    CompanyAnalytics, ShipmentUpdate, TrackingResponse,
    CostBreakdownResponse, RiskAssessment, RouteSegment
)
from app.core.auth import AuthService, get_current_company
from pydantic import BaseModel

class RouteDistanceRequest(BaseModel):
    origin: str
    destination: str
    route_cities: List[str]

class RouteDistanceResponse(BaseModel):
    direct_distance_km: int
    direct_duration_min: int
    optimized_distance_km: int
    optimized_duration_min: int
    savings_distance_km: int
    savings_duration_min: int
from app.services.external_apis import GoogleMapsService, WeatherService
from app.services.route_optimizer import NovelRouteOptimizer
from app.services.ml_models import cost_model, time_model

router = APIRouter()

# Initialize services
maps_service = GoogleMapsService()
weather_service = WeatherService()
route_optimizer = NovelRouteOptimizer(maps_service, weather_service)


# ============ Health Check ============

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ml_models": {
            "cost_model": cost_model.is_trained,
            "time_model": True
        }
    }


# ============ Authentication Endpoints ============

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register_company(
    company_data: CompanyRegister,
    db: Session = Depends(get_db)
):
    """Register a new company account"""
    
    try:
        company = AuthService.create_company(
            db=db,
            name=company_data.name,
            email=company_data.email,
            password=company_data.password,
            company_type=company_data.company_type,
            phone=company_data.phone,
            address=company_data.address,
            gstin=company_data.gstin
        )
        
        # Create access token - handle both dict (MongoDB) and object (SQLAlchemy)
        company_email = company["email"] if isinstance(company, dict) else company.email
        access_token = AuthService.create_access_token(
            data={"sub": company_email}
        )
        
        # Format response - handle both dict and object
        if isinstance(company, dict):
            # MongoDB returns dict
            company_response = {
                "id": str(company["id"]) if company.get("id") else None,
                "name": company["name"],
                "email": company["email"],
                "company_type": company["company_type"],
                "phone": company.get("phone"),
                "gstin": company.get("gstin")
            }
        else:
            # SQLAlchemy returns object
            company_response = {
                "id": company.id,
                "name": company.name,
                "email": company.email,
                "company_type": company.company_type,
                "phone": company.phone,
                "gstin": company.gstin
            }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "company": company_response
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/auth/login", response_model=Token)
async def login_company(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    
    company = AuthService.authenticate_company(
        db=db,
        email=form_data.username,  # OAuth2 uses 'username' field
        password=form_data.password
    )
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Handle both dict (MongoDB) and object (SQLAlchemy) cases
    company_email = company["email"] if isinstance(company, dict) else company.email
    company_name = company["name"] if isinstance(company, dict) else company.name
    subscription_tier = company.get("subscription_tier", "free") if isinstance(company, dict) else company.subscription_tier
    
    access_token = AuthService.create_access_token(
        data={"sub": company_email}
    )
    
    return Token(
        access_token=access_token,
        company_name=company_name,
        subscription_tier=subscription_tier
    )


@router.get("/auth/me", response_model=CompanyProfile)
async def get_current_user(
    current_company = Depends(get_current_company)
):
    """Get current logged-in company profile"""
    
    # Handle both dict (MongoDB) and object (SQLAlchemy) cases
    if isinstance(current_company, dict):
        # MongoDB returns dict with _id, convert to id
        # Convert ObjectId to a simple integer ID for consistency
        company_id = current_company.get("_id", current_company.get("id"))
        if company_id:
            # Generate a simple numeric ID from the ObjectId string
            id_int = abs(hash(str(company_id))) % 1000000
        else:
            id_int = 1
            
        return CompanyProfile(
            id=id_int,
            name=current_company["name"],
            email=current_company["email"],
            company_type=current_company["company_type"],
            phone=current_company.get("phone"),
            address=current_company.get("address"),
            gstin=current_company.get("gstin"),
            subscription_tier=current_company.get("subscription_tier", "free"),
            is_active=current_company.get("is_active", True),
            created_at=current_company.get("created_at")
        )
    else:
        # SQLAlchemy object
        return current_company


# ============ Shipment Planning Endpoints ============

@router.post("/shipments/plan", response_model=ShipmentPlanResponse)
async def plan_shipment(
    plan_request: ShipmentPlanRequest,
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Plan a new shipment with AI-powered route optimization
    
    This endpoint:
    1. Fetches real-time route data from Google Maps
    2. Gets weather forecasts
    3. Runs ML cost prediction
    4. Applies novel multi-objective optimization
    5. Returns multiple ranked route options
    """
    
    try:
        # Handle both dict (MongoDB) and object (SQLAlchemy) cases
        company_name = current_company["name"] if isinstance(current_company, dict) else current_company.name
        print(f"📦 Planning shipment for {company_name}")
        
        # Find optimal routes
        routes = route_optimizer.find_optimal_routes(
            origin=plan_request.origin_city,
            destination=plan_request.destination_city,
            cargo_weight_tons=plan_request.cargo_weight_tons,
            cargo_value=plan_request.cargo_value,
            is_fragile=plan_request.is_fragile,
            pickup_datetime=plan_request.pickup_datetime,
            preferences={
                'prefer_fastest': getattr(plan_request, 'prefer_fastest', True),
                'avoid_toll_roads': getattr(plan_request, 'avoid_toll_roads', False),
                'prefer_highways': getattr(plan_request, 'prefer_highways', True)
            },
            num_alternatives=3
        )
        
        # Convert to response format
        route_options = []
        
        for route in routes:
            # Create cost breakdown object
            cost_breakdown = CostBreakdownResponse(
                fuel_cost=route['cost_breakdown']['fuel_cost'],
                toll_charges=route['cost_breakdown']['toll_charges'],
                driver_wages=route['cost_breakdown']['driver_wages'],
                vehicle_maintenance=route['cost_breakdown']['maintenance'],
                insurance_cost=route['cost_breakdown']['insurance'],
                loading_unloading=route['cost_breakdown']['loading_unloading'],
                permits_and_docs=500,
                contingency=route['cost_breakdown']['total'] * 0.05,
                total_estimated_cost=route['cost_breakdown']['total'],
                cost_per_km=route['cost_breakdown']['total'] / route['distance_km'],
                cost_per_ton=route['cost_breakdown']['total'] / plan_request.cargo_weight_tons,
                confidence_level=0.85
            )
            
            # Create risk assessment object
            risk_assessment = RiskAssessment(
                overall_risk_score=route['risk_assessment']['overall_risk_score'],
                risk_level=route['risk_assessment']['risk_level'],
                delay_risk=route['risk_assessment']['delay_risk'],
                damage_risk=route['risk_assessment']['damage_risk'],
                theft_risk=route['risk_assessment']['theft_risk'],
                weather_risk=route['risk_assessment']['weather_risk'],
                risk_factors=route['risk_assessment']['risk_factors'],
                mitigation_recommendations=route['risk_assessment']['mitigation_recommendations']
            )
            
            route_option = RouteOption(
                route_id=route['route_id'],
                route_name=route['route_name'],
                total_distance_km=route['distance_km'],
                estimated_time_hours=route['total_time_hours'],
                segments=[],  # Simplified for now
                cost_breakdown=cost_breakdown,
                risk_assessment=risk_assessment,
                weather_forecast=[],  # Can add detailed weather
                cost_rank=0,  # Will update below
                time_rank=0,
                safety_rank=0,
                overall_score=route['overall_score'],
                is_recommended=route['is_recommended'],
                recommendation_reason=route['recommendation_reason']
            )
            
            route_options.append(route_option)
        
        # Rank routes
        route_options.sort(key=lambda r: r.cost_breakdown.total_estimated_cost)
        for i, r in enumerate(route_options):
            r.cost_rank = i + 1

        route_options.sort(key=lambda r: r.estimated_time_hours)
        for i, r in enumerate(route_options):
            r.time_rank = i + 1

        route_options.sort(key=lambda r: r.risk_assessment.overall_risk_score)
        for i, r in enumerate(route_options):
            r.safety_rank = i + 1
        
        # Sort by overall score
        route_options.sort(key=lambda r: r.overall_score, reverse=True)
        
        # Generate plan ID
        plan_id = f"PLAN-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
        
        # Build response
        response = ShipmentPlanResponse(
            plan_id=plan_id,
            created_at=datetime.now(),
            origin=plan_request.origin_city,
            destination=plan_request.destination_city,
            cargo_summary=f"{plan_request.cargo_weight_tons}T {plan_request.cargo_type}",
            route_options=route_options,
            recommended_route=route_options[0] if route_options else None,
            similar_shipments_avg_cost=None,
            price_trend="Average",
            next_steps=[
                "Review recommended route and cost estimates",
                "Check weather forecasts before departure",
                "Ensure proper cargo insurance",
                "Brief driver on route and precautions",
                "Save this plan for future reference"
            ]
        )
        
        # Save planned shipment to database
        # Handle both dict (MongoDB) and object (SQLAlchemy) cases
        company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
        
        # Create shipment data for unified database service
        shipment_data = {
            "shipment_ref": plan_id,
            "status": "planned",
            "origin_city": plan_request.origin_city,
            "destination_city": plan_request.destination_city,
            "transport_mode": plan_request.transport_mode.value,
            "vehicle_type": plan_request.vehicle_type.value,
            "cargo_type": plan_request.cargo_type,
            "cargo_weight_tons": plan_request.cargo_weight_tons,
            "cargo_value": plan_request.cargo_value,
            "is_fragile": plan_request.is_fragile,
            "is_perishable": getattr(plan_request, 'is_perishable', False),
            "requires_refrigeration": getattr(plan_request, 'requires_refrigeration', False),
            "pickup_datetime": plan_request.pickup_datetime,
            "distance_km": route_options[0].total_distance_km if route_options else 0,
            "predicted_cost": route_options[0].cost_breakdown.total_estimated_cost if route_options else 0,
            "predicted_time_hours": route_options[0].estimated_time_hours if route_options else 0,
            "risk_score": route_options[0].risk_assessment.overall_risk_score if route_options else 0
        }
        
        # Save using unified database service
        print(f"🔧 Saving shipment for company_id: {company_id}")
        print(f"🔧 Shipment data: {shipment_data}")
        created_shipment = db_service.create_shipment(shipment_data, str(company_id), db)
        print(f"🔧 Created shipment result: {created_shipment}")
        
        return response
        
    except Exception as e:
        print(f"❌ Error planning shipment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shipment planning failed: {str(e)}"
        )


# ============ Historical Data Collection ============

@router.post("/shipments/historical", response_model=dict)
async def submit_historical_shipment(
    shipment: HistoricalShipmentSubmit,
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Submit historical shipment data for ML training
    
    This helps improve cost predictions by learning from your actual data
    """
    
    try:
        # Calculate derived metrics
        dwell_time = (shipment.delivery_datetime - shipment.pickup_datetime).total_seconds() / 3600
        
        # Create shipment record
        # Handle both dict (MongoDB) and object (SQLAlchemy) cases
        company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
        
        db_shipment = Shipment(
            company_id=str(company_id),
            shipment_ref=shipment.shipment_ref,
            status='completed',
            origin_city=shipment.origin_city,
            destination_city=shipment.destination_city,
            distance_km=shipment.distance_km,
            transport_mode=shipment.transport_mode.value,
            vehicle_type=shipment.vehicle_type.value,
            cargo_type=shipment.cargo_type,
            cargo_weight_tons=shipment.cargo_weight_tons,
            cargo_value=shipment.cargo_value,
            pickup_datetime=shipment.pickup_datetime,
            actual_delivery_datetime=shipment.delivery_datetime,
            dwell_time_hours=dwell_time,
            delay_hours=shipment.delay_hours,
            fuel_cost=shipment.fuel_cost,
            toll_charges=shipment.toll_charges,
            labor_cost=shipment.labor_cost,
            maintenance_cost=shipment.maintenance_cost,
            other_costs=shipment.other_costs,
            total_cost=shipment.total_cost,
            freight_charge=shipment.freight_charge,
            had_breakdown=shipment.had_breakdown,
            had_damage=shipment.had_damage,
            damage_cost=shipment.damage_cost,
            weather_condition=shipment.weather_condition,
            traffic_level=shipment.traffic_level
        )
        
        db.add(db_shipment)
        db.commit()
        
        # Handle both dict (MongoDB) and object (SQLAlchemy) cases
        company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
        
        # Check if we have enough data to retrain
        total_shipments = db.query(Shipment).filter(
            Shipment.company_id == str(company_id),
            Shipment.status == 'completed'
        ).count()
        
        retrain_threshold = 50
        should_retrain = (total_shipments >= retrain_threshold) and (total_shipments % 10 == 0)
        
        return {
            "success": True,
            "message": "Historical shipment data recorded successfully",
            "shipment_ref": shipment.shipment_ref,
            "total_historical_shipments": total_shipments,
            "model_status": "Will retrain model" if should_retrain else f"Need {retrain_threshold - total_shipments} more for training"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save shipment: {str(e)}"
        )


# ============ Analytics ============

@router.get("/analytics/dashboard", response_model=CompanyAnalytics)
async def get_company_analytics(
    period: str = "30d",
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Get company logistics analytics"""
    
    # Parse period
    days_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
    days = days_map.get(period, 30)
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Handle both dict (MongoDB) and object (SQLAlchemy) cases
    company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
    
    # Use unified database service for analytics
    analytics = db_service.get_company_analytics(str(company_id), days, db)
    
    return analytics


# ============ Shipment Management ============

@router.get("/shipments")
async def get_company_shipments(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Get company's shipments with optional filtering"""
    
    # Handle both dict (MongoDB) and object (SQLAlchemy) cases
    company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
    
    # Use unified database service for shipments
    shipments = db_service.get_shipments(str(company_id), limit, offset, status, db)
    
    return {"shipments": shipments}


@router.get("/shipments/{shipment_id}")
async def get_shipment_details(
    shipment_id: int,
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Get detailed shipment information"""
    
    # Handle both dict (MongoDB) and object (SQLAlchemy) cases
    company_id = current_company.get("_id") if isinstance(current_company, dict) else current_company.id
    
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == str(company_id)
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {
        "id": shipment.id,
        "shipment_ref": shipment.shipment_ref,
        "status": shipment.status,
        "origin_city": shipment.origin_city,
        "destination_city": shipment.destination_city,
        "cargo_type": shipment.cargo_type,
        "cargo_weight_tons": shipment.cargo_weight_tons,
        "cargo_value": shipment.cargo_value,
        "transport_mode": shipment.transport_mode,
        "vehicle_type": shipment.vehicle_type,
        "pickup_datetime": shipment.pickup_datetime,
        "actual_delivery_datetime": shipment.actual_delivery_datetime,
        "distance_km": shipment.distance_km,
        "total_cost": shipment.total_cost,
        "freight_charge": shipment.freight_charge,
        "fuel_cost": shipment.fuel_cost,
        "toll_charges": shipment.toll_charges,
        "labor_cost": shipment.labor_cost,
        "maintenance_cost": shipment.maintenance_cost,
        "delay_hours": shipment.delay_hours,
        "had_breakdown": shipment.had_breakdown,
        "had_damage": shipment.had_damage,
        "damage_cost": shipment.damage_cost,
        "weather_condition": shipment.weather_condition,
        "traffic_level": shipment.traffic_level,
        "created_at": shipment.created_at
    }


# ============ ML Model Management ============

@router.post("/ml/train")
async def train_ml_models(
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Trigger ML model training
    
    Requires at least 50 completed shipments
    """
    
    # Check data availability
    shipment_count = db.query(Shipment).filter(
        Shipment.status == 'completed',
        Shipment.total_cost.isnot(None)
    ).count()
    
    if shipment_count < 50:
        return {
            "success": False,
            "message": f"Insufficient data for training. Have {shipment_count}, need 50.",
            "recommendation": "Continue submitting historical shipment data"
        }
    
    # Train cost model
    try:
        metrics = cost_model.train()
        
        return {
            "success": True,
            "message": "ML models trained successfully",
            "metrics": metrics
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )

@router.post("/route-distances", response_model=RouteDistanceResponse)
async def calculate_route_distances(request: RouteDistanceRequest):
    """
    Calculate real distances using Google Maps API
    """
    try:
        # Get direct distance
        direct_dist, direct_dur = await get_direct_distance(request.origin, request.destination)
        
        # Get optimized route distance
        optimized_dist, optimized_dur = await calculate_route_distance(request.route_cities)
        
        # Calculate savings
        savings_dist = max(0, direct_dist - optimized_dist)
        savings_dur = max(0, direct_dur - optimized_dur)
        
        return RouteDistanceResponse(
            direct_distance_km=direct_dist,
            direct_duration_min=direct_dur,
            optimized_distance_km=optimized_dist,
            optimized_duration_min=optimized_dur,
            savings_distance_km=savings_dist,
            savings_duration_min=savings_dur
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate route distances: {str(e)}"
        )
