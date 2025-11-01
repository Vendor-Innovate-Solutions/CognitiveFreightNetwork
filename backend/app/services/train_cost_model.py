"""
Train only the Cost Prediction Model
Quick restart for gradient boosting regressor
"""

import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def train_cost_predictor_only():
    """Train only the cost prediction model"""
    
    print("💰 TRAINING COST PREDICTION MODEL ONLY")
    print("="*60)
    
    # Paths
    backend_dir = Path(__file__).parent.parent.parent
    data_path = backend_dir.parent / "data_processing" / "dynamic_supply_chain_logistics_dataset.csv"
    models_dir = backend_dir / "trained_models"
    models_dir.mkdir(exist_ok=True)
    
    # Load dataset
    print("📊 Loading dataset...")
    df = pd.read_csv(data_path)
    print(f"✓ Loaded {len(df)} rows × {len(df.columns)} columns")
    
    # Remove unnecessary columns
    columns_to_remove = ['timestamp', 'vehicle_gps_latitude', 'vehicle_gps_longitude']
    df = df.drop(columns=columns_to_remove, errors='ignore')
    
    # Define target and features
    target_col = 'shipping_costs'
    exclude_cols = [
        'delivery_time_deviation',
        'risk_classification',
        'shipping_costs',
        'delay_probability'
    ]
    
    feature_cols = [col for col in df.columns if col not in exclude_cols]
    print(f"📋 Using {len(feature_cols)} features for cost prediction")
    
    # Prepare data
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # Check for missing values
    if X.isnull().sum().sum() > 0:
        print("⚠️  Found missing values, filling with median...")
        X = X.fillna(X.median())
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X = pd.DataFrame(X_scaled, columns=feature_cols)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"✓ Training set: {len(X_train)} samples")
    print(f"✓ Test set: {len(X_test)} samples")
    
    # Train Gradient Boosting Regressor with simpler parameters
    print("⏳ Training Gradient Boosting Regressor...")
    
    model = GradientBoostingRegressor(
        n_estimators=100,  # Reduced from 200
        max_depth=6,       # Reduced from 10
        learning_rate=0.1,
        random_state=42,
        verbose=1  # Show progress
    )
    
    # Train model
    model.fit(X_train, y_train)
    print("✅ Training completed!")
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n📊 Model Performance:")
    print(f"   MAE:  ₹{mae:.2f}")
    print(f"   RMSE: ₹{rmse:.2f}")
    print(f"   R² Score: {r2:.3f}")
    
    # Cross-validation (reduced folds for speed)
    print("⏳ Running cross-validation...")
    cv_scores = cross_val_score(model, X_train, y_train, cv=3, scoring='r2')
    print(f"   CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🔝 Top 5 Important Features:")
    for idx, row in feature_importance.head().iterrows():
        print(f"   {row['feature']}: {row['importance']:.4f}")
    
    # Save model and related files
    model_path = models_dir / "cost_predictor.pkl"
    scaler_path = models_dir / "cost_scaler.pkl"
    features_path = models_dir / "cost_features.txt"
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    with open(features_path, "w") as f:
        f.write("\n".join(feature_cols))
    
    print(f"\n✅ Model saved to: {model_path}")
    print(f"✅ Scaler saved to: {scaler_path}")
    print(f"✅ Features saved to: {features_path}")
    
    return {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std()
    }


if __name__ == "__main__":
    print(f"🚀 Starting Cost Predictor Training at {datetime.now()}")
    
    try:
        results = train_cost_predictor_only()
        
        print("\n" + "="*60)
        print("✅ COST PREDICTION MODEL TRAINING COMPLETE!")
        print("="*60)
        print(f"Final Results:")
        print(f"- MAE: ₹{results['mae']:.2f}")
        print(f"- RMSE: ₹{results['rmse']:.2f}")
        print(f"- R² Score: {results['r2']:.3f}")
        print(f"- CV Score: {results['cv_mean']:.3f}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise