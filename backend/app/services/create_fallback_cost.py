"""
Fallback Cost Predictor
Rule-based cost estimation when ML model isn't available
"""

import pickle
import numpy as np
from pathlib import Path


class FallbackCostPredictor:
    """Rule-based cost estimation for when ML model isn't trained"""
    
    def __init__(self):
        self.base_cost_per_km = 12.0  # ₹12 per km
        self.fuel_multiplier = 1.5
        self.weight_factor = 0.8  # ₹0.8 per kg
        
    def predict(self, features):
        """Predict cost based on simple rules"""
        if isinstance(features, list):
            features = np.array(features).reshape(1, -1)
        
        # Simple cost calculation
        # Assuming features are normalized, use fixed multipliers
        base_cost = 300  # Base shipping cost
        
        # Distance factor (approximate from lead_time)
        if len(features[0]) > 14:  # lead_time_days is usually at index 14
            distance_est = features[0][14] * 400  # days * 400km/day
            distance_cost = distance_est * self.base_cost_per_km
        else:
            distance_cost = 2000  # Default for 200km
        
        # Weight factor (approximate from loading time)
        if len(features[0]) > 4:  # loading_unloading_time at index 4
            weight_est = features[0][4] * 1000  # hours * 1000kg/hour
            weight_cost = weight_est * self.weight_factor
        else:
            weight_cost = 800  # Default weight cost
        
        # Traffic/congestion factor
        if len(features[0]) > 2:  # traffic_congestion_level at index 2
            traffic_factor = 1 + (features[0][2] * 0.1)  # 10% per congestion level
        else:
            traffic_factor = 1.2
        
        total_cost = (base_cost + distance_cost + weight_cost) * traffic_factor
        
        # Ensure reasonable range
        return np.clip(total_cost, 200, 2000)


# Create and save fallback model
models_dir = Path(__file__).parent.parent.parent / "trained_models"
models_dir.mkdir(exist_ok=True)

fallback_model = FallbackCostPredictor()

# Save as pickle file
with open(models_dir / "cost_predictor.pkl", "wb") as f:
    pickle.dump(fallback_model, f)

print("💰 Fallback Cost Predictor Created!")
print(f"📁 Saved to: {models_dir / 'cost_predictor.pkl'}")
print("✅ Cost prediction is now available!")

# Test the model
test_features = np.random.rand(1, 19)  # 19 features
predicted_cost = fallback_model.predict(test_features)
print(f"🧪 Test prediction: ₹{predicted_cost[0] if hasattr(predicted_cost, '__iter__') else predicted_cost:.2f}")