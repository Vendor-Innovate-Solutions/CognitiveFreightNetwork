from fastapi import APIRouter, HTTPException
from typing import List
from app.models.logistics import (
    OptimizationRequest,
    OptimizationSolution,
    DelayPredictionInput,
    DelayPredictionOutput,
    WhatIfAnalysisRequest,
    WhatIfAnalysisResult,
    Vessel,
    Port,
    Plant
)
from app.services.optimizer import OptimizationEngine
from app.services.ai_predictor import DelayPredictor
from app.services.what_if_analyzer import WhatIfAnalyzer

router = APIRouter()

# Initialize services
optimizer = OptimizationEngine()
delay_predictor = DelayPredictor()
what_if_analyzer = WhatIfAnalyzer()


@router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "AI-Enabled Logistics Optimizer API"}


# ==================== OPTIMIZATION ENDPOINTS ====================

@router.post("/api/optimize", response_model=OptimizationSolution, tags=["Optimization"])
async def optimize_logistics(request: OptimizationRequest):
    """
    Main optimization endpoint - The "Brain"
    Finds the cost-optimal vessel scheduling and port-plant linkage
    """
    try:
        solution = optimizer.optimize(request)
        return solution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.post("/api/optimize/quick", tags=["Optimization"])
async def quick_optimize(
    vessels: List[Vessel],
    ports: List[Port],
    plants: List[Plant]
):
    """
    Simplified optimization endpoint with minimal parameters
    Useful for quick tests and demos
    """
    try:
        # Create a basic request with defaults
        from app.models.logistics import RailwayRake, PortDistance, PortName, PlantName
        
        # Generate default rakes
        rakes = [
            RailwayRake(id=f"RAKE_{i:03d}", capacity_mt=60, availability=True)
            for i in range(20)
        ]
        
        # Generate default distances (simplified grid)
        distances = []
        for port in ports:
            for plant in plants:
                distances.append(PortDistance(
                    port=port.name,
                    plant=plant.name,
                    distance_km=500  # Default distance
                ))
        
        request = OptimizationRequest(
            vessels=vessels,
            ports=ports,
            plants=plants,
            available_rakes=rakes,
            port_distances=distances
        )
        
        solution = optimizer.optimize(request)
        return solution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick optimization failed: {str(e)}")


# ==================== AI PREDICTION ENDPOINTS ====================

@router.post("/api/predict/delay", response_model=DelayPredictionOutput, tags=["AI Prediction"])
async def predict_vessel_delay(input_data: DelayPredictionInput):
    """
    AI-powered vessel delay prediction - The "Crystal Ball"
    Predicts arrival delays and demurrage risk
    """
    try:
        prediction = delay_predictor.predict_delay(input_data)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/api/predict/delays/batch", response_model=List[DelayPredictionOutput], tags=["AI Prediction"])
async def predict_multiple_delays(inputs: List[DelayPredictionInput]):
    """
    Batch predict delays for multiple vessels
    """
    try:
        predictions = delay_predictor.batch_predict(inputs)
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.post("/api/predict/insights", tags=["AI Prediction"])
async def get_delay_insights(prediction: DelayPredictionOutput):
    """
    Get actionable insights from a delay prediction
    """
    try:
        insights = delay_predictor.get_risk_insights(prediction)
        return {"vessel_id": prediction.vessel_id, "insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")


# ==================== WHAT-IF ANALYSIS ENDPOINTS ====================

@router.post("/api/whatif/analyze", response_model=List[WhatIfAnalysisResult], tags=["What-If Analysis"])
async def analyze_scenarios(request: WhatIfAnalysisRequest):
    """
    Run what-if analysis for multiple scenarios - The "Decision Support"
    Compare different planning scenarios
    """
    try:
        results = what_if_analyzer.analyze_scenarios(request)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"What-if analysis failed: {str(e)}")


@router.post("/api/whatif/sensitivity", response_model=List[WhatIfAnalysisResult], tags=["What-If Analysis"])
async def sensitivity_analysis(
    base_request: OptimizationRequest,
    parameter: str,
    min_multiplier: float = 0.5,
    max_multiplier: float = 1.5,
    steps: int = 5
):
    """
    Perform sensitivity analysis on a single parameter
    Example: How does total cost change as railway costs vary from 0.5x to 1.5x?
    """
    try:
        results = what_if_analyzer.sensitivity_analysis(
            base_request,
            parameter,
            min_multiplier,
            max_multiplier,
            steps
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensitivity analysis failed: {str(e)}")


# ==================== DATA MANAGEMENT ENDPOINTS ====================

@router.get("/api/vessels", tags=["Data"])
async def get_vessels():
    """Get list of all vessels (mock data for demo)"""
    from datetime import datetime, timedelta
    from app.models.logistics import MaterialType, VesselStatus, Coordinate
    
    vessels = [
        Vessel(
            id="VSL_001",
            name="MV Sagar Ratna",
            material_type=MaterialType.COKING_COAL,
            cargo_mt=45000,
            origin_port="Richards Bay, South Africa",
            eta=datetime.now() + timedelta(days=5),
            status=VesselStatus.IN_TRANSIT,
            demurrage_rate_per_day=1250000,  # ₹12.5 Lakh per day (~$15,000)
            free_time_days=2,
            current_location=Coordinate(latitude=8.5, longitude=78.2)  # Bay of Bengal
        ),
        Vessel(
            id="VSL_002",
            name="MV Vishwa Vaibhav",
            material_type=MaterialType.LIMESTONE,
            cargo_mt=35000,
            origin_port="Port Hedland, Australia",
            eta=datetime.now() + timedelta(days=7),
            status=VesselStatus.IN_TRANSIT,
            demurrage_rate_per_day=1000000,  # ₹10 Lakh per day (~$12,000)
            free_time_days=2,
            current_location=Coordinate(latitude=12.5, longitude=84.8)  # Bay of Bengal
        ),
        Vessel(
            id="VSL_003",
            name="MV Bharath Shakti",
            material_type=MaterialType.COKING_COAL,
            cargo_mt=52000,
            origin_port="Newcastle, Australia",
            eta=datetime.now() + timedelta(days=3),
            status=VesselStatus.IN_TRANSIT,
            demurrage_rate_per_day=1500000,  # ₹15 Lakh per day
            free_time_days=2,
            current_location=Coordinate(latitude=16.5, longitude=86.5)  # Near Vizag
        )
    ]
    return vessels


@router.get("/api/ports", tags=["Data"])
async def get_ports():
    """Get list of all ports (India's east coast)"""
    from app.models.logistics import PortName, Coordinate
    
    ports = [
        Port(
            name=PortName.HALDIA,
            location=Coordinate(latitude=22.03, longitude=88.09),
            capacity_mt=100000,
            current_stock_mt=20000,
            handling_cost_per_mt=5.0,
            storage_cost_per_day_per_mt=0.1,
            discharge_rate_mt_per_day=15000
        ),
        Port(
            name=PortName.PARADIP,
            location=Coordinate(latitude=20.26, longitude=86.69),
            capacity_mt=120000,
            current_stock_mt=30000,
            handling_cost_per_mt=4.5,
            storage_cost_per_day_per_mt=0.08,
            discharge_rate_mt_per_day=18000
        ),
        Port(
            name=PortName.VIZAG,
            location=Coordinate(latitude=17.69, longitude=83.29),
            capacity_mt=150000,
            current_stock_mt=40000,
            handling_cost_per_mt=4.0,
            storage_cost_per_day_per_mt=0.07,
            discharge_rate_mt_per_day=20000
        ),
        Port(
            name=PortName.CHENNAI,
            location=Coordinate(latitude=13.08, longitude=80.27),
            capacity_mt=110000,
            current_stock_mt=25000,
            handling_cost_per_mt=4.8,
            storage_cost_per_day_per_mt=0.09,
            discharge_rate_mt_per_day=16000
        ),
        Port(
            name=PortName.ENNORE,
            location=Coordinate(latitude=13.23, longitude=80.32),
            capacity_mt=130000,
            current_stock_mt=35000,
            handling_cost_per_mt=4.3,
            storage_cost_per_day_per_mt=0.075,
            discharge_rate_mt_per_day=17000
        )
    ]
    return ports


@router.get("/api/plants", tags=["Data"])
async def get_plants():
    """Get list of all steel plants"""
    from app.models.logistics import PlantName, MaterialType, Coordinate
    
    plants = [
        Plant(
            name=PlantName.PLANT_A,
            location=Coordinate(latitude=22.58, longitude=88.38),  # Near Kolkata - Durgapur
            capacity_mt=80000,
            current_stock_mt=15000,
            requirements={
                MaterialType.COKING_COAL: 25000,
                MaterialType.LIMESTONE: 10000
            }
        ),
        Plant(
            name=PlantName.PLANT_B,
            location=Coordinate(latitude=21.95, longitude=86.18),  # Rourkela, Odisha
            capacity_mt=90000,
            current_stock_mt=20000,
            requirements={
                MaterialType.COKING_COAL: 30000,
                MaterialType.LIMESTONE: 12000
            }
        ),
        Plant(
            name=PlantName.PLANT_C,
            location=Coordinate(latitude=22.78, longitude=86.18),  # Bokaro, Jharkhand
            capacity_mt=85000,
            current_stock_mt=18000,
            requirements={
                MaterialType.COKING_COAL: 28000,
                MaterialType.LIMESTONE: 11000
            }
        ),
        Plant(
            name=PlantName.PLANT_D,
            location=Coordinate(latitude=23.67, longitude=85.31),  # Jamshedpur, Jharkhand
            capacity_mt=95000,
            current_stock_mt=22000,
            requirements={
                MaterialType.COKING_COAL: 32000,
                MaterialType.LIMESTONE: 13000
            }
        ),
        Plant(
            name=PlantName.PLANT_E,
            location=Coordinate(latitude=19.08, longitude=84.85),  # Visakhapatnam region
            capacity_mt=88000,
            current_stock_mt=19000,
            requirements={
                MaterialType.COKING_COAL: 27000,
                MaterialType.LIMESTONE: 10500
            }
        )
    ]
    return plants


@router.get("/api/stats/summary", tags=["Statistics"])
async def get_summary_statistics():
    """Get summary statistics for the dashboard"""
    return {
        "total_vessels": 12,
        "active_vessels": 8,
        "total_ports": 5,
        "total_plants": 5,
        "total_capacity_mt": 550000,
        "current_utilization_pct": 68.5,
        "avg_demurrage_per_vessel": 1250000,  # ₹12.5 Lakh per vessel
        "total_monthly_cost": 375000000,  # ₹37.5 Crore per month
        "optimization_savings_pct": 18.3
    }
