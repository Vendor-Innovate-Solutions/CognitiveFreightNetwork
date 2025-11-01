"""
AI/ML Service for predicting vessel delays and demurrage risks
Uses machine learning to forecast delays based on historical patterns
"""
from typing import Dict, List
import numpy as np
from datetime import datetime, timedelta
from app.models.logistics import (
    DelayPredictionInput,
    DelayPredictionOutput,
    MaterialType,
    PortName
)


class DelayPredictor:
    """
    AI-powered delay prediction model
    In production, this would use a trained ML model (e.g., Random Forest, XGBoost, LSTM)
    For now, uses rule-based heuristics with realistic patterns
    """
    
    def __init__(self):
        # Port-specific delay factors (hours)
        self.port_congestion_factors = {
            PortName.HALDIA: 12,
            PortName.PARADIP: 8,
            PortName.VIZAG: 6,
            PortName.CHENNAI: 10,
            PortName.ENNORE: 7
        }
        
        # Material-specific handling delays (hours)
        self.material_handling_delays = {
            MaterialType.COKING_COAL: 4,
            MaterialType.LIMESTONE: 2
        }
        
        # Seasonal factors (monsoon delays)
        self.monsoon_months = {6, 7, 8, 9}  # June to September
        
    def predict_delay(self, input_data: DelayPredictionInput) -> DelayPredictionOutput:
        """
        Predict vessel delay using multiple factors
        """
        factors = {}
        total_delay_hours = 0.0
        
        # 1. Port congestion factor
        port_delay = self.port_congestion_factors.get(input_data.destination_port, 8)
        factors["port_congestion"] = port_delay
        total_delay_hours += port_delay
        
        # 2. Material handling complexity
        material_delay = self.material_handling_delays.get(input_data.material_type, 3)
        factors["material_handling"] = material_delay
        total_delay_hours += material_delay
        
        # 3. Cargo size impact (larger cargo = longer discharge time)
        if input_data.cargo_mt > 50000:
            size_delay = (input_data.cargo_mt - 50000) / 5000 * 0.5
            factors["cargo_size"] = size_delay
            total_delay_hours += size_delay
        
        # 4. Seasonal/monsoon factor
        if input_data.scheduled_eta.month in self.monsoon_months:
            monsoon_delay = 18
            factors["monsoon_season"] = monsoon_delay
            total_delay_hours += monsoon_delay
        
        # 5. Historical pattern
        if input_data.historical_delay_hours:
            historical_weight = 0.3
            historical_contribution = input_data.historical_delay_hours * historical_weight
            factors["historical_pattern"] = historical_contribution
            total_delay_hours += historical_contribution
        
        # 6. Weather conditions (if provided)
        if input_data.weather_conditions:
            weather_delay = self._calculate_weather_impact(input_data.weather_conditions)
            factors["weather_conditions"] = weather_delay
            total_delay_hours += weather_delay
        
        # 7. Random operational variance (±20%)
        variance = np.random.uniform(-0.2, 0.2)
        total_delay_hours *= (1 + variance)
        
        # Calculate predicted ETA
        predicted_eta = input_data.scheduled_eta + timedelta(hours=total_delay_hours)
        
        # Calculate confidence score (higher for more data available)
        confidence = self._calculate_confidence(input_data, factors)
        
        # Determine demurrage risk
        demurrage_risk = self._calculate_demurrage_risk(total_delay_hours)
        
        return DelayPredictionOutput(
            vessel_id=input_data.vessel_id,
            predicted_delay_hours=round(total_delay_hours, 2),
            confidence_score=confidence,
            predicted_eta=predicted_eta,
            demurrage_risk=demurrage_risk,
            factors=factors
        )
    
    def batch_predict(self, inputs: List[DelayPredictionInput]) -> List[DelayPredictionOutput]:
        """Predict delays for multiple vessels"""
        return [self.predict_delay(input_data) for input_data in inputs]
    
    def _calculate_weather_impact(self, weather: Dict[str, float]) -> float:
        """Calculate delay from weather conditions"""
        delay = 0.0
        
        # Wind speed impact (hours)
        wind_speed = weather.get("wind_speed_kmh", 0)
        if wind_speed > 50:
            delay += (wind_speed - 50) * 0.2
        
        # Wave height impact (hours)
        wave_height = weather.get("wave_height_m", 0)
        if wave_height > 3:
            delay += (wave_height - 3) * 2
        
        # Visibility impact (hours)
        visibility = weather.get("visibility_km", 10)
        if visibility < 2:
            delay += 6
        
        return delay
    
    def _calculate_confidence(self, input_data: DelayPredictionInput, factors: Dict[str, float]) -> float:
        """Calculate prediction confidence based on available data"""
        confidence = 0.5  # Base confidence
        
        # More factors = higher confidence
        confidence += len(factors) * 0.05
        
        # Historical data increases confidence
        if input_data.historical_delay_hours:
            confidence += 0.15
        
        # Weather data increases confidence
        if input_data.weather_conditions:
            confidence += 0.15
        
        return min(confidence, 0.95)  # Cap at 0.95
    
    def _calculate_demurrage_risk(self, delay_hours: float) -> str:
        """Classify demurrage risk based on delay duration"""
        if delay_hours < 24:
            return "low"
        elif delay_hours < 48:
            return "medium"
        else:
            return "high"
    
    def get_risk_insights(self, prediction: DelayPredictionOutput) -> List[str]:
        """Generate actionable insights from prediction"""
        insights = []
        
        if prediction.demurrage_risk == "high":
            insights.append(f"⚠️ High demurrage risk: Expected {prediction.predicted_delay_hours:.1f}h delay")
            insights.append("Consider expediting discharge or negotiating free time extension")
        
        # Identify top contributing factors
        sorted_factors = sorted(prediction.factors.items(), key=lambda x: x[1], reverse=True)
        if sorted_factors:
            top_factor = sorted_factors[0]
            insights.append(f"Primary delay factor: {top_factor[0]} ({top_factor[1]:.1f}h)")
        
        if prediction.confidence_score < 0.7:
            insights.append("⚠️ Low confidence prediction - consider gathering more data")
        
        return insights
