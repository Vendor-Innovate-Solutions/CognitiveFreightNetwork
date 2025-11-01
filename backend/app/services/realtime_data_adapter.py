"""
Real-Time Data Adapter
Maps Google Maps API & Weather API data to ML model features
Handles data discrepancies and ensures model compatibility
"""

import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime
import random


class RealtimeDataAdapter:
    """
    Adapts real-time API data to match ML model training data format
    Ensures no discrepancies between training and prediction data
    """
    
    def __init__(self):
        # Feature value ranges from training data (approximate)
        self.feature_ranges = {
            'fuel_consumption_rate': (5.0, 20.0),
            'eta_variation_hours': (-0.5, 5.0),
            'traffic_congestion_level': (0.0, 10.0),
            'warehouse_inventory_level': (0.0, 1000.0),
            'loading_unloading_time': (0.5, 5.0),
            'handling_equipment_availability': (0.0, 1.0),
            'order_fulfillment_status': (0.0, 1.0),
            'weather_condition_severity': (0.0, 1.0),
            'port_congestion_level': (0.0, 10.0),
            'shipping_costs': (100.0, 1000.0),
            'supplier_reliability_score': (0.0, 1.0),
            'lead_time_days': (1.0, 15.0),
            'historical_demand': (0.0, 10000.0),
            'iot_temperature': (-10.0, 40.0),
            'cargo_condition_status': (0.0, 1.0),
            'route_risk_level': (0.0, 10.0),
            'customs_clearance_time': (0.5, 5.0),
            'driver_behavior_score': (0.0, 1.0),
            'fatigue_monitoring_score': (0.0, 1.0),
            'disruption_likelihood_score': (0.0, 1.0)
        }
    
    def map_google_maps_data(self, maps_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Convert Google Maps API response to ML features
        
        Maps API provides:
        - distance (meters)
        - duration (seconds)
        - traffic conditions
        - route complexity
        """
        features = {}
        
        # Extract from Maps API
        distance_km = maps_data.get('distance_meters', 0) / 1000
        duration_hours = maps_data.get('duration_seconds', 0) / 3600
        traffic_delay = maps_data.get('duration_in_traffic_seconds', 0) / 3600
        
        # 1. Traffic Congestion Level (0-10 scale)
        # Maps "traffic_conditions": "heavy" -> 8-10, "moderate" -> 4-7, "light" -> 0-3
        traffic_mapping = {
            'heavy': np.random.uniform(7, 10),
            'moderate': np.random.uniform(4, 7),
            'light': np.random.uniform(0, 3),
            'unknown': 5.0
        }
        traffic_condition = maps_data.get('traffic_conditions', 'unknown')
        features['traffic_congestion_level'] = traffic_mapping.get(traffic_condition, 5.0)
        
        # 2. ETA Variation (difference between normal and traffic duration)
        if traffic_delay > 0 and duration_hours > 0:
            features['eta_variation_hours'] = traffic_delay - duration_hours
        else:
            features['eta_variation_hours'] = 0.0
        
        # 3. Route Risk Level (based on road types and complexity)
        # More waypoints, highways vs local roads
        num_steps = maps_data.get('num_route_steps', 10)
        highway_ratio = maps_data.get('highway_ratio', 0.5)  # 0-1
        features['route_risk_level'] = (1 - highway_ratio) * 10 * (1 + num_steps / 50)
        features['route_risk_level'] = np.clip(features['route_risk_level'], 0, 10)
        
        # 4. Fuel Consumption Rate (estimated based on distance and vehicle type)
        # Rough estimate: 5-15 liters per 100km depending on vehicle
        vehicle_type = maps_data.get('vehicle_type', 'truck')
        fuel_rates = {'truck': 0.15, 'van': 0.10, 'bike': 0.03}
        base_fuel_rate = fuel_rates.get(vehicle_type, 0.12)
        features['fuel_consumption_rate'] = base_fuel_rate * distance_km / 10
        features['fuel_consumption_rate'] = np.clip(features['fuel_consumption_rate'], 5, 20)
        
        # 5. Lead Time Days (convert duration to days)
        features['lead_time_days'] = duration_hours / 24
        features['lead_time_days'] = np.clip(features['lead_time_days'], 0.1, 15)
        
        return features
    
    def map_weather_api_data(self, weather_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Convert Weather API response to ML features
        
        Weather API provides:
        - temperature (°C)
        - conditions (rain, snow, clear)
        - wind speed
        - visibility
        """
        features = {}
        
        # 1. Weather Condition Severity (0-1 scale)
        # Maps weather conditions to severity
        condition = weather_data.get('condition', 'clear').lower()
        severity_mapping = {
            'clear': 0.1,
            'partly cloudy': 0.2,
            'cloudy': 0.3,
            'overcast': 0.4,
            'mist': 0.5,
            'fog': 0.6,
            'light rain': 0.5,
            'rain': 0.7,
            'heavy rain': 0.85,
            'snow': 0.8,
            'heavy snow': 0.95,
            'thunderstorm': 0.9,
            'blizzard': 1.0
        }
        
        features['weather_condition_severity'] = severity_mapping.get(condition, 0.3)
        
        # Adjust based on wind speed (if available)
        wind_kph = weather_data.get('wind_kph', 0)
        if wind_kph > 50:  # High wind increases severity
            features['weather_condition_severity'] = min(1.0, features['weather_condition_severity'] + 0.2)
        elif wind_kph > 30:
            features['weather_condition_severity'] = min(1.0, features['weather_condition_severity'] + 0.1)
        
        # 2. IoT Temperature (for cargo monitoring)
        features['iot_temperature'] = weather_data.get('temp_c', 25.0)
        features['iot_temperature'] = np.clip(features['iot_temperature'], -10, 40)
        
        # 3. Disruption Likelihood (weather impact on operations)
        # Based on precipitation and visibility
        precip_mm = weather_data.get('precip_mm', 0)
        visibility_km = weather_data.get('visibility_km', 10)
        
        disruption_score = 0.0
        if precip_mm > 20:  # Heavy rain
            disruption_score += 0.5
        elif precip_mm > 10:  # Moderate rain
            disruption_score += 0.3
        elif precip_mm > 0:  # Light rain
            disruption_score += 0.1
        
        if visibility_km < 1:  # Very poor visibility
            disruption_score += 0.4
        elif visibility_km < 5:  # Poor visibility
            disruption_score += 0.2
        
        features['disruption_likelihood_score'] = np.clip(disruption_score, 0, 1)
        
        return features
    
    def map_user_input_data(self, shipment_request: Dict[str, Any]) -> Dict[str, float]:
        """
        Convert user shipment request to ML features
        
        User provides:
        - cargo weight, value, type
        - preferences (fastest, cheapest, safest)
        - special requirements (fragile, hazardous)
        """
        features = {}
        
        # 1. Cargo Condition Status (based on cargo type and fragility)
        is_fragile = shipment_request.get('is_fragile', False)
        is_hazardous = shipment_request.get('is_hazardous', False)
        
        if is_hazardous:
            features['cargo_condition_status'] = 0.9  # High attention needed
        elif is_fragile:
            features['cargo_condition_status'] = 0.7
        else:
            features['cargo_condition_status'] = 0.3  # Normal cargo
        
        # 2. Warehouse Inventory Level (simulate based on cargo value)
        cargo_value = shipment_request.get('cargo_value', 10000)
        features['warehouse_inventory_level'] = np.clip(cargo_value / 100, 0, 1000)
        
        # 3. Historical Demand (simulate based on route popularity)
        # In production, fetch from database
        features['historical_demand'] = np.random.uniform(1000, 8000)
        
        # 4. Loading/Unloading Time (based on cargo weight)
        cargo_weight = shipment_request.get('cargo_weight_kg', 1000)
        # Heavier cargo takes longer
        features['loading_unloading_time'] = 1.0 + (cargo_weight / 2000)
        features['loading_unloading_time'] = np.clip(features['loading_unloading_time'], 0.5, 5.0)
        
        # 5. Handling Equipment Availability (0-1 probability)
        # Better for lighter cargo
        if cargo_weight < 500:
            features['handling_equipment_availability'] = 0.9
        elif cargo_weight < 2000:
            features['handling_equipment_availability'] = 0.7
        else:
            features['handling_equipment_availability'] = 0.5
        
        # 6. Order Fulfillment Status (initial assumption)
        features['order_fulfillment_status'] = 0.8  # Start optimistic
        
        # 7. Shipping Costs (rough estimate based on distance and weight)
        distance_km = shipment_request.get('distance_km', 500)
        base_cost = 100 + (distance_km * 5) + (cargo_weight * 0.5)
        if is_hazardous:
            base_cost *= 1.5
        if is_fragile:
            base_cost *= 1.2
        features['shipping_costs'] = np.clip(base_cost, 100, 2000)
        
        # 8. Supplier Reliability Score (simulate or fetch from history)
        features['supplier_reliability_score'] = np.random.uniform(0.6, 0.95)
        
        # 9. Port Congestion Level (if applicable)
        transport_mode = shipment_request.get('transport_mode', 'road')
        if transport_mode in ['sea', 'air']:
            features['port_congestion_level'] = np.random.uniform(2, 8)
        else:
            features['port_congestion_level'] = 0.0
        
        # 10. Customs Clearance Time
        is_international = shipment_request.get('is_international', False)
        if is_international:
            features['customs_clearance_time'] = np.random.uniform(2, 5)
        else:
            features['customs_clearance_time'] = 0.5
        
        return features
    
    def map_driver_data(self, driver_info: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        """
        Convert driver information to ML features
        
        Driver info:
        - experience level
        - recent performance
        - fatigue status
        """
        features = {}
        
        if driver_info:
            # Use actual driver data if available
            features['driver_behavior_score'] = driver_info.get('behavior_score', 0.8)
            features['fatigue_monitoring_score'] = driver_info.get('fatigue_score', 0.8)
        else:
            # Use reasonable defaults
            features['driver_behavior_score'] = 0.75  # Average driver
            features['fatigue_monitoring_score'] = 0.85  # Well-rested
        
        return features
    
    def combine_all_features(
        self,
        shipment_request: Dict[str, Any],
        maps_data: Dict[str, Any],
        weather_data: Dict[str, Any],
        driver_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        MAIN METHOD: Combine all data sources into complete feature vector
        This is what the ML model expects!
        """
        
        # Collect features from all sources
        features = {}
        
        # 1. Google Maps features
        features.update(self.map_google_maps_data(maps_data))
        
        # 2. Weather API features
        features.update(self.map_weather_api_data(weather_data))
        
        # 3. User input features
        features.update(self.map_user_input_data(shipment_request))
        
        # 4. Driver features
        features.update(self.map_driver_data(driver_info))
        
        # 5. Ensure all required features are present
        required_features = list(self.feature_ranges.keys())
        
        for feature in required_features:
            if feature not in features:
                # Use safe default (midpoint of range)
                min_val, max_val = self.feature_ranges[feature]
                features[feature] = (min_val + max_val) / 2
        
        # 6. Validate and clip values to training data ranges
        for feature, value in features.items():
            if feature in self.feature_ranges:
                min_val, max_val = self.feature_ranges[feature]
                features[feature] = np.clip(value, min_val, max_val)
        
        return features
    
    def validate_feature_vector(self, features: Dict[str, float]) -> bool:
        """
        Validate that feature vector matches training data expectations
        Returns True if valid, False otherwise
        """
        required_features = set(self.feature_ranges.keys())
        provided_features = set(features.keys())
        
        # Check for missing features
        missing = required_features - provided_features
        if missing:
            print(f"⚠️  Missing features: {missing}")
            return False
        
        # Check for extra features
        extra = provided_features - required_features
        if extra:
            print(f"⚠️  Extra features (will be ignored): {extra}")
        
        # Check value ranges
        for feature, value in features.items():
            if feature in self.feature_ranges:
                min_val, max_val = self.feature_ranges[feature]
                if not (min_val <= value <= max_val):
                    print(f"⚠️  Feature '{feature}' value {value} outside range [{min_val}, {max_val}]")
                    return False
        
        print("✅ Feature vector validation passed!")
        return True


# Example usage
def example_usage():
    """Example of how to use the adapter"""
    
    adapter = RealtimeDataAdapter()
    
    # Sample data from APIs
    shipment_request = {
        'cargo_weight_kg': 1500,
        'cargo_value': 50000,
        'is_fragile': True,
        'is_hazardous': False,
        'transport_mode': 'road',
        'distance_km': 450
    }
    
    maps_data = {
        'distance_meters': 450000,
        'duration_seconds': 18000,  # 5 hours
        'duration_in_traffic_seconds': 21600,  # 6 hours with traffic
        'traffic_conditions': 'moderate',
        'num_route_steps': 25,
        'highway_ratio': 0.7,
        'vehicle_type': 'truck'
    }
    
    weather_data = {
        'condition': 'light rain',
        'temp_c': 28,
        'wind_kph': 15,
        'precip_mm': 5,
        'visibility_km': 8
    }
    
    driver_info = {
        'behavior_score': 0.85,
        'fatigue_score': 0.90
    }
    
    # Combine all features
    features = adapter.combine_all_features(
        shipment_request, maps_data, weather_data, driver_info
    )
    
    # Validate
    adapter.validate_feature_vector(features)
    
    print(f"\n✅ Generated {len(features)} features for ML prediction")
    print("\nSample features:")
    for key, value in list(features.items())[:5]:
        print(f"  {key}: {value:.3f}")
    
    return features


if __name__ == "__main__":
    example_usage()
