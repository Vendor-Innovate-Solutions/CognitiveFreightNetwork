"""
Fallback Delay Classifier
Rule-based delay prediction when ML model isn't available
"""

import pickle
import numpy as np
from pathlib import Path


class FallbackDelayClassifier:
    """Rule-based delay prediction for when ML model isn't trained"""
    
    def __init__(self):
        pass
        
    def predict(self, features):
        """Predict if shipment will be delayed based on simple rules"""
        if isinstance(features, list):
            features = np.array(features).reshape(1, -1)
        
        delay_score = 0
        
        # Traffic congestion factor
        if len(features[0]) > 2:  # traffic_congestion_level
            if features[0][2] > 0.7:  # High traffic
                delay_score += 0.4
        
        # Weather severity factor
        if len(features[0]) > 10:  # weather_condition_severity
            if features[0][10] > 0.6:  # Bad weather
                delay_score += 0.3
        
        # ETA variation factor
        if len(features[0]) > 1:  # eta_variation_hours
            if features[0][1] > 0.3:  # Significant variation
                delay_score += 0.2
        
        # Route risk factor
        if len(features[0]) > 18:  # route_risk_level
            if features[0][18] > 0.6:  # High risk route
                delay_score += 0.1
        
        # Return 1 if delay_score > 0.5, else 0
        return int(delay_score > 0.5)
    
    def predict_proba(self, features):
        """Return probability of delay"""
        if isinstance(features, list):
            features = np.array(features).reshape(1, -1)
        
        delay_score = 0
        
        # Same logic as predict but return probabilities
        if len(features[0]) > 2:
            if features[0][2] > 0.7:
                delay_score += 0.4
        
        if len(features[0]) > 10:
            if features[0][10] > 0.6:
                delay_score += 0.3
        
        if len(features[0]) > 1:
            if features[0][1] > 0.3:
                delay_score += 0.2
        
        if len(features[0]) > 18:
            if features[0][18] > 0.6:
                delay_score += 0.1
        
        # Clip to valid probability range
        delay_prob = np.clip(delay_score, 0.1, 0.9)
        
        # Return probabilities for [no_delay, delay]
        return np.array([[1 - delay_prob, delay_prob]])


# Create and save fallback model
models_dir = Path(__file__).parent.parent.parent / "trained_models"
models_dir.mkdir(exist_ok=True)

fallback_model = FallbackDelayClassifier()

# Save as pickle file
with open(models_dir / "delay_classifier.pkl", "wb") as f:
    pickle.dump(fallback_model, f)

print("⏰ Fallback Delay Classifier Created!")
print(f"📁 Saved to: {models_dir / 'delay_classifier.pkl'}")
print("✅ Delay prediction is now available!")

# Test the model
test_features = np.random.rand(1, 19)  # 19 features
predicted_delay = fallback_model.predict(test_features)
delay_proba = fallback_model.predict_proba(test_features)

print(f"🧪 Test prediction: {'Will be delayed' if predicted_delay else 'On time'}")
print(f"🧪 Delay probability: {delay_proba[0][1]:.2f}")