"""
Quick Cost Model Trainer - No Cross-Validation
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# Paths
backend_dir = Path(__file__).parent.parent.parent
data_path = backend_dir.parent / "data_processing" / "dynamic_supply_chain_logistics_dataset.csv"
models_dir = backend_dir / "trained_models"
models_dir.mkdir(exist_ok=True)

print("💰 QUICK COST MODEL TRAINING")
print("="*50)

# Load data
df = pd.read_csv(data_path)
df = df.drop(columns=['timestamp', 'vehicle_gps_latitude', 'vehicle_gps_longitude'], errors='ignore')

# Prepare features
exclude_cols = ['delivery_time_deviation', 'risk_classification', 'shipping_costs', 'delay_probability']
feature_cols = [col for col in df.columns if col not in exclude_cols]

X = df[feature_cols].fillna(df[feature_cols].median())
y = df['shipping_costs']

# Scale and split
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

print(f"✓ Training with {len(feature_cols)} features on {len(X_train)} samples")

# Train simple model
model = GradientBoostingRegressor(
    n_estimators=50,  # Reduced
    max_depth=5,      # Reduced
    learning_rate=0.1,
    random_state=42
)

print("⏳ Training model...")
model.fit(X_train, y_train)

# Test performance
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print(f"✅ Training complete!")
print(f"   MAE: ₹{mae:.2f}")
print(f"   RMSE: ₹{rmse:.2f}")
print(f"   R² Score: {r2:.3f}")

# Save model
joblib.dump(model, models_dir / "cost_predictor.pkl")
joblib.dump(scaler, models_dir / "feature_scaler.pkl")

with open(models_dir / "feature_columns.txt", "w") as f:
    f.write("\n".join(feature_cols))

print(f"💾 Model saved successfully!")
print(f"📁 Location: {models_dir}")
print("\n✅ Cost prediction model ready for production!")