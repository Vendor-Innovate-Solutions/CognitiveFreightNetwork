"""
Production ML Predictor
Integrates trained models with real-time API data
Handles all predictions for the application
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.services.realtime_data_adapter import RealtimeDataAdapter


class ProductionMLPredictor:
    """
    Production-ready ML predictor that combines:
    1. Trained ML models
    2. Real-time API data (Google Maps, Weather)
    3. User input data
    4. Handles discrepancies and ensures consistency
    """
    
    def __init__(self):
        self.models_dir = Path(__file__).parent.parent.parent / "trained_models"
        self.adapter = RealtimeDataAdapter()
        
        # Load models
        self.models = {}
        self.scaler = None
        self.label_encoder = None
        self.feature_columns = []
        
        self._load_models()
    
    def _load_models(self):
        """Load all trained models from disk"""
        try:
            # Load ML models
            if (self.models_dir / "delivery_time_model.pkl").exists():
                self.models['delivery_time'] = joblib.load(self.models_dir / "delivery_time_model.pkl")
                print("✅ Loaded delivery time model")
            
            if (self.models_dir / "risk_classifier.pkl").exists():
                self.models['risk'] = joblib.load(self.models_dir / "risk_classifier.pkl")
                print("✅ Loaded risk classifier")
            
            if (self.models_dir / "cost_predictor.pkl").exists():
                self.models['cost'] = joblib.load(self.models_dir / "cost_predictor.pkl")
                print("✅ Loaded cost predictor")
            
            if (self.models_dir / "delay_classifier.pkl").exists():
                self.models['delay'] = joblib.load(self.models_dir / "delay_classifier.pkl")
                print("✅ Loaded delay classifier")
            
            # Load preprocessing tools
            if (self.models_dir / "feature_scaler.pkl").exists():
                self.scaler = joblib.load(self.models_dir / "feature_scaler.pkl")
                print("✅ Loaded feature scaler")
            
            if (self.models_dir / "label_encoder.pkl").exists():
                self.label_encoder = joblib.load(self.models_dir / "label_encoder.pkl")
                print("✅ Loaded label encoder")
            
            # Load feature columns
            if (self.models_dir / "feature_columns.txt").exists():
                with open(self.models_dir / "feature_columns.txt", "r") as f:
                    self.feature_columns = [line.strip() for line in f.readlines()]
                print(f"✅ Loaded {len(self.feature_columns)} feature columns")
            
            if not self.models:
                print("⚠️  No pre-trained models found - will train on first use")
        
        except Exception as e:
            print(f"⚠️  Error loading models: {e}")
    
    def predict_shipment(
        self,
        shipment_request: Dict[str, Any],
        maps_data: Dict[str, Any],
        weather_data: Dict[str, Any],
        driver_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        MAIN PREDICTION METHOD
        
        Makes comprehensive predictions for a shipment using:
        - User input (cargo details, preferences)
        - Google Maps API data (route, traffic, distance)
        - Weather API data (conditions, temperature)
        - Optional driver information
        
        Returns:
        - Delivery time prediction (hours)
        - Risk classification (Low/Moderate/High)
        - Cost estimate (₹)
        - Delay probability (0-1)
        - Confidence scores
        - Recommendations
        """
        
        if not self.models:
            return self._fallback_prediction(shipment_request, maps_data, weather_data)
        
        try:
            # Step 1: Combine all data sources into feature vector
            features = self.adapter.combine_all_features(
                shipment_request, maps_data, weather_data, driver_info
            )
            
            # Step 2: Convert to DataFrame with correct column order
            feature_df = pd.DataFrame([features])
            
            # Ensure correct column order (same as training)
            if self.feature_columns:
                # Add missing columns with default values
                for col in self.feature_columns:
                    if col not in feature_df.columns:
                        feature_df[col] = 0.0
                
                # Reorder columns to match training
                feature_df = feature_df[self.feature_columns]
            
            # Step 3: Scale features (CRITICAL: must match training scaling)
            if self.scaler:
                features_scaled = self.scaler.transform(feature_df)
                feature_df_scaled = pd.DataFrame(features_scaled, columns=self.feature_columns)
            else:
                feature_df_scaled = feature_df
            
            # Step 4: Make predictions with all models
            predictions = {}
            
            # Delivery Time Prediction
            if 'delivery_time' in self.models:
                delivery_hours = self.models['delivery_time'].predict(feature_df_scaled)[0]
                predictions['delivery_time_hours'] = float(delivery_hours)
                predictions['delivery_time_days'] = float(delivery_hours / 24)
            
            # Risk Classification
            if 'risk' in self.models:
                risk_encoded = self.models['risk'].predict(feature_df_scaled)[0]
                risk_probs = self.models['risk'].predict_proba(feature_df_scaled)[0]
                
                if self.label_encoder:
                    risk_class = self.label_encoder.inverse_transform([risk_encoded])[0]
                    predictions['risk_classification'] = risk_class
                    predictions['risk_probabilities'] = {
                        self.label_encoder.classes_[i]: float(prob)
                        for i, prob in enumerate(risk_probs)
                    }
            
            # Cost Prediction
            if 'cost' in self.models:
                cost = self.models['cost'].predict(feature_df_scaled)[0]
                predictions['estimated_cost'] = float(cost)
            
            # Delay Prediction
            if 'delay' in self.models:
                is_delayed = self.models['delay'].predict(feature_df_scaled)[0]
                delay_prob = self.models['delay'].predict_proba(feature_df_scaled)[0][1]
                predictions['will_be_delayed'] = bool(is_delayed)
                predictions['delay_probability'] = float(delay_prob)
            
            # Step 5: Generate recommendations
            recommendations = self._generate_recommendations(predictions, features)
            predictions['recommendations'] = recommendations
            
            # Step 6: Calculate confidence scores
            predictions['confidence'] = self._calculate_confidence(features, predictions)
            
            return predictions
        
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return self._fallback_prediction(shipment_request, maps_data, weather_data)
    
    def predict_multiple_routes(
        self,
        shipment_request: Dict[str, Any],
        routes_data: List[Dict[str, Any]],
        weather_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Compare multiple route options
        
        Useful for showing user 3-5 route alternatives with predictions
        """
        results = []
        
        for i, route in enumerate(routes_data):
            # Each route has different maps_data
            maps_data = route.get('maps_data', {})
            
            prediction = self.predict_shipment(
                shipment_request, maps_data, weather_data
            )
            
            # Add route-specific info
            prediction['route_id'] = i + 1
            prediction['route_name'] = route.get('name', f'Route {i+1}')
            prediction['distance_km'] = maps_data.get('distance_meters', 0) / 1000
            prediction['base_duration_hours'] = maps_data.get('duration_seconds', 0) / 3600
            
            results.append(prediction)
        
        # Sort by user preference
        preference = shipment_request.get('preference', 'balanced')
        results = self._sort_by_preference(results, preference)
        
        return results
    
    def _sort_by_preference(self, routes: List[Dict], preference: str) -> List[Dict]:
        """Sort routes based on user preference"""
        
        if preference == 'fastest':
            return sorted(routes, key=lambda x: x.get('delivery_time_hours', 999))
        
        elif preference == 'cheapest':
            return sorted(routes, key=lambda x: x.get('estimated_cost', 999999))
        
        elif preference == 'safest':
            # Prioritize low risk
            risk_order = {'Low Risk': 0, 'Moderate Risk': 1, 'High Risk': 2}
            return sorted(routes, key=lambda x: risk_order.get(x.get('risk_classification', 'High Risk'), 3))
        
        else:  # balanced
            # Composite score: normalize and combine all factors
            for route in routes:
                score = 0
                score += route.get('delivery_time_hours', 100) / 100  # Lower is better
                score += route.get('estimated_cost', 1000) / 1000  # Lower is better
                risk_score = {'Low Risk': 0.2, 'Moderate Risk': 0.5, 'High Risk': 1.0}
                score += risk_score.get(route.get('risk_classification', 'High Risk'), 1.0)
                route['balance_score'] = score
            
            return sorted(routes, key=lambda x: x.get('balance_score', 999))
    
    def _generate_recommendations(
        self,
        predictions: Dict[str, Any],
        features: Dict[str, float]
    ) -> List[str]:
        """Generate AI-powered recommendations"""
        recommendations = []
        
        # Risk-based recommendations
        risk = predictions.get('risk_classification', 'Unknown')
        if risk == 'High Risk':
            recommendations.append("🛡️ High risk detected - consider alternative route or add insurance")
            recommendations.append("📋 Assign experienced driver for this shipment")
        
        # Weather-based recommendations
        if features.get('weather_condition_severity', 0) > 0.7:
            recommendations.append("🌧️ Severe weather expected - plan for delays")
            recommendations.append("📞 Maintain frequent communication with driver")
        
        # Traffic-based recommendations
        if features.get('traffic_congestion_level', 0) > 7:
            recommendations.append("🚦 Heavy traffic expected - consider off-peak departure")
        
        # Delay probability
        if predictions.get('delay_probability', 0) > 0.7:
            recommendations.append("⏰ High delay probability - inform customer proactively")
        
        # Cost optimization
        estimated_cost = predictions.get('estimated_cost', 0)
        if estimated_cost > 800:
            recommendations.append("💰 Consider consolidating with other shipments to reduce cost")
        
        # Cargo-specific
        if features.get('cargo_condition_status', 0) > 0.8:
            recommendations.append("📦 Fragile/hazardous cargo - ensure special handling procedures")
        
        # Driver fatigue
        if features.get('fatigue_monitoring_score', 1.0) < 0.5:
            recommendations.append("😴 Driver fatigue risk - schedule rest breaks")
        
        if not recommendations:
            recommendations.append("✅ All indicators normal - proceed as planned")
        
        return recommendations
    
    def _calculate_confidence(
        self,
        features: Dict[str, float],
        predictions: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate confidence scores for predictions"""
        
        confidence = {}
        
        # Base confidence on data completeness
        total_features = len(self.adapter.feature_ranges)
        provided_features = sum(1 for f in features if features.get(f, 0) != 0)
        data_completeness = provided_features / total_features
        
        # Delivery time confidence
        if 'delivery_time_hours' in predictions:
            confidence['delivery_time'] = min(0.7 + data_completeness * 0.25, 0.95)
        
        # Risk confidence
        if 'risk_probabilities' in predictions:
            max_prob = max(predictions['risk_probabilities'].values())
            confidence['risk'] = float(max_prob)
        
        # Cost confidence
        if 'estimated_cost' in predictions:
            confidence['cost'] = min(0.75 + data_completeness * 0.20, 0.95)
        
        # Overall confidence
        if confidence:
            confidence['overall'] = sum(confidence.values()) / len(confidence)
        
        return confidence
    
    def _fallback_prediction(
        self,
        shipment_request: Dict[str, Any],
        maps_data: Dict[str, Any],
        weather_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fallback predictions when models aren't trained yet
        Uses rule-based heuristics
        """
        
        # Basic calculations
        distance_km = maps_data.get('distance_meters', 500000) / 1000
        duration_hours = maps_data.get('duration_seconds', 18000) / 3600
        
        # Add weather/traffic delays
        weather_severity = weather_data.get('condition', 'clear')
        weather_delay = 0
        if 'rain' in weather_severity.lower():
            weather_delay = 2
        elif 'snow' in weather_severity.lower():
            weather_delay = 4
        
        traffic_delay = maps_data.get('duration_in_traffic_seconds', duration_hours * 3600) / 3600 - duration_hours
        
        total_hours = duration_hours + weather_delay + traffic_delay
        
        # Estimate cost (₹10/km base + cargo factors)
        base_cost = distance_km * 10
        cargo_weight = shipment_request.get('cargo_weight_kg', 1000)
        cost = base_cost + (cargo_weight * 0.5)
        
        if shipment_request.get('is_hazardous'):
            cost *= 1.5
        if shipment_request.get('is_fragile'):
            cost *= 1.2
        
        # Determine risk
        risk = 'Low Risk'
        if weather_delay > 2 or traffic_delay > 3:
            risk = 'Moderate Risk'
        if weather_delay > 4 or traffic_delay > 5:
            risk = 'High Risk'
        
        return {
            'delivery_time_hours': total_hours,
            'delivery_time_days': total_hours / 24,
            'estimated_cost': cost,
            'risk_classification': risk,
            'delay_probability': min(traffic_delay / 10, 0.9),
            'will_be_delayed': traffic_delay > 2,
            'recommendations': [
                "⚠️  Using fallback predictions - train models for better accuracy",
                f"📍 Distance: {distance_km:.0f} km",
                f"⏱️  Estimated time: {total_hours:.1f} hours"
            ],
            'confidence': {
                'overall': 0.5,
                'delivery_time': 0.5,
                'cost': 0.6,
                'risk': 0.4
            }
        }


# Global predictor instance
_predictor_instance = None

def get_predictor() -> ProductionMLPredictor:
    """Get singleton predictor instance"""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = ProductionMLPredictor()
    return _predictor_instance
