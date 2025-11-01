from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from app.models.database import get_db, Company, Shipment
from app.models.schemas import (
    CompanyRegister, CompanyLogin, Token, CompanyProfile,
    ShipmentPlanRequest, ShipmentPlanResponse, RouteOption,
    HistoricalShipmentSubmit, DataUploadStatus,
    CompanyAnalytics, ShipmentUpdate, TrackingResponse
)
from app.core.auth import AuthService, get_current_company
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
            gstin=company_data.gstin
        )
        
        # Create access token
        access_token = AuthService.create_access_token(
            data={"sub": company.email}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "company": {
                "id": company.id,
                "name": company.name,
                "email": company.email,
                "company_type": company.company_type,
                "phone": company.phone,
                "gstin": company.gstin
            }
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
    
    access_token = AuthService.create_access_token(
        data={"sub": company.email}
    )
    
    return Token(
        access_token=access_token,
        company_name=company.name,
        subscription_tier=company.subscription_tier
    )


@router.get("/auth/me", response_model=CompanyProfile)
async def get_current_user(
    current_company: Company = Depends(get_current_company)
):
    """Get current logged-in company profile"""
    return current_company


# ============ Shipment Planning Endpoints ============

@router.post("/shipments/plan", response_model=ShipmentPlanResponse)
async def plan_shipment(
    plan_request: ShipmentPlanRequest,
    current_company: Company = Depends(get_current_company),
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
        print(f"📦 Planning shipment for {current_company.name}")
        
        # Find optimal routes
        routes = route_optimizer.find_optimal_routes(
            origin=plan_request.origin_city,
            destination=plan_request.destination_city,
            cargo_weight_tons=plan_request.cargo_weight_tons,
            cargo_value=plan_request.cargo_value,
            is_fragile=plan_request.is_fragile,
            pickup_datetime=plan_request.pickup_datetime,
            preferences={
                'prefer_fastest': plan_request.prefer_fastest,
                'avoid_toll_roads': plan_request.avoid_toll_roads,
                'prefer_highways': plan_request.prefer_highways
            },
            num_alternatives=3
        )
        
        # Convert to response format
        route_options = []
        
        for route in routes:
            route_option = RouteOption(
                route_id=route['route_id'],
                route_name=route['route_name'],
                total_distance_km=route['distance_km'],
                estimated_time_hours=route['total_time_hours'],
                segments=[],  # Simplified for now
                cost_breakdown={
                    "fuel_cost": route['cost_breakdown']['fuel_cost'],
                    "toll_charges": route['cost_breakdown']['toll_charges'],
                    "driver_wages": route['cost_breakdown']['driver_wages'],
                    "vehicle_maintenance": route['cost_breakdown']['maintenance'],
                    "insurance_cost": route['cost_breakdown']['insurance'],
                    "loading_unloading": route['cost_breakdown']['loading_unloading'],
                    "permits_and_docs": 500,
                    "contingency": route['cost_breakdown']['total'] * 0.05,
                    "total_estimated_cost": route['cost_breakdown']['total'],
                    "cost_per_km": route['cost_breakdown']['total'] / route['distance_km'],
                    "cost_per_ton": route['cost_breakdown']['total'] / plan_request.cargo_weight_tons,
                    "confidence_level": 0.85
                },
                risk_assessment={
                    "overall_risk_score": route['risk_assessment']['overall_risk_score'],
                    "risk_level": route['risk_assessment']['risk_level'],
                    "delay_risk": route['risk_assessment']['delay_risk'],
                    "damage_risk": route['risk_assessment']['damage_risk'],
                    "theft_risk": route['risk_assessment']['theft_risk'],
                    "weather_risk": route['risk_assessment']['weather_risk'],
                    "risk_factors": route['risk_assessment']['risk_factors'],
                    "mitigation_recommendations": route['risk_assessment']['mitigation_recommendations']
                },
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
        
        route_options.sort(key=lambda r: r.risk_assessment['overall_risk_score'])
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
        shipment = Shipment(
            company_id=current_company.id,
            shipment_ref=plan_id,
            status='planned',
            origin_city=plan_request.origin_city,
            destination_city=plan_request.destination_city,
            transport_mode=plan_request.transport_mode.value,
            vehicle_type=plan_request.vehicle_type.value,
            cargo_type=plan_request.cargo_type,
            cargo_weight_tons=plan_request.cargo_weight_tons,
            cargo_value=plan_request.cargo_value,
            is_fragile=plan_request.is_fragile,
            is_perishable=plan_request.is_perishable,
            requires_refrigeration=plan_request.requires_refrigeration,
            pickup_datetime=plan_request.pickup_datetime,
            distance_km=route_options[0].total_distance_km if route_options else 0,
            predicted_cost=route_options[0].cost_breakdown.total_estimated_cost if route_options else 0,
            predicted_time_hours=route_options[0].estimated_time_hours if route_options else 0,
            risk_score=route_options[0].risk_assessment['overall_risk_score'] if route_options else 0
        )
        
        db.add(shipment)
        db.commit()
        
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
    current_company: Company = Depends(get_current_company),
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
        db_shipment = Shipment(
            company_id=current_company.id,
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
        
        # Check if we have enough data to retrain
        total_shipments = db.query(Shipment).filter(
            Shipment.company_id == current_company.id,
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
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Get company logistics analytics"""
    
    # Parse period
    days_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
    days = days_map.get(period, 30)
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Query shipments
    shipments = db.query(Shipment).filter(
        Shipment.company_id == current_company.id,
        Shipment.created_at >= start_date
    ).all()
    
    # Calculate metrics
    total_shipments = len(shipments)
    completed_shipments = [s for s in shipments if s.status == 'completed']
    
    total_cost = sum(s.total_cost or 0 for s in completed_shipments)
    total_revenue = sum(s.freight_charge or 0 for s in completed_shipments)
    total_distance = sum(s.distance_km or 0 for s in completed_shipments)
    total_cargo = sum(s.cargo_weight_tons or 0 for s in completed_shipments)
    
    profit = total_revenue - total_cost
    profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
    avg_cost = total_cost / len(completed_shipments) if completed_shipments else 0
    
    # Performance metrics
    on_time = sum(1 for s in completed_shipments if (s.delay_hours or 0) <= 1)
    on_time_rate = (on_time / len(completed_shipments) * 100) if completed_shipments else 0
    avg_delay = sum(s.delay_hours or 0 for s in completed_shipments) / len(completed_shipments) if completed_shipments else 0
    
    incidents = sum(1 for s in completed_shipments if s.had_breakdown or s.had_damage)
    incident_rate = (incidents / len(completed_shipments) * 100) if completed_shipments else 0
    
    return CompanyAnalytics(
        period=period,
        total_shipments=total_shipments,
        total_distance_km=round(total_distance, 2),
        total_cargo_tons=round(total_cargo, 2),
        total_cost=round(total_cost, 2),
        total_revenue=round(total_revenue, 2),
        profit=round(profit, 2),
        profit_margin_percentage=round(profit_margin, 2),
        avg_cost_per_shipment=round(avg_cost, 2),
        on_time_delivery_rate=round(on_time_rate, 2),
        avg_delay_hours=round(avg_delay, 2),
        incident_rate=round(incident_rate, 2),
        cost_trend="Stable",
        volume_trend="Growing",
        most_used_routes=[],
        most_profitable_routes=[],
        most_problematic_routes=[]
    )


# ============ ML Model Management ============

@router.post("/ml/train")
async def train_ml_models(
    current_company: Company = Depends(get_current_company),
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
