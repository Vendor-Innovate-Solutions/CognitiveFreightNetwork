import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from app.models.database import Shipment, MLModel, SessionLocal


class CostPredictionModel:
    """
    ML Model for predicting shipment costs
    
    Features:
    - Distance and weight
    - Transport mode and vehicle type
    - Temporal features (hour, day, month)
    - Route characteristics
    - Weather conditions
    - Historical patterns
    """
    
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            min_samples_split=10,
            min_samples_leaf=4,
            subsample=0.8,
            random_state=42
        )
        
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.is_trained = False
        
        # Cost components models (for detailed breakdown)
        self.fuel_cost_model = None
        self.toll_cost_model = None
        self.labor_cost_model = None
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering for cost prediction"""
        
        # Temporal features
        df['pickup_hour'] = pd.to_datetime(df['pickup_datetime']).dt.hour
        df['pickup_day'] = pd.to_datetime(df['pickup_datetime']).dt.dayofweek
        df['pickup_month'] = pd.to_datetime(df['pickup_datetime']).dt.month
        df['is_weekend'] = df['pickup_day'].isin([5, 6]).astype(int)
        df['is_peak_hour'] = df['pickup_hour'].isin([8, 9, 17, 18, 19, 20]).astype(int)
        
        # Route efficiency metrics
        df['km_per_hour'] = df['distance_km'] / df['dwell_time_hours'].replace(0, 1)
        df['cost_per_km'] = df['total_cost'] / df['distance_km'].replace(0, 1)
        df['cost_per_ton'] = df['total_cost'] / df['cargo_weight_tons'].replace(0, 1)
        
        # Cargo characteristics
        df['value_per_ton'] = df['cargo_value'] / df['cargo_weight_tons'].replace(0, 1)
        df['high_value_cargo'] = (df['cargo_value'] > 500000).astype(int)
        
        # Route complexity
        df['distance_category'] = pd.cut(
            df['distance_km'],
            bins=[0, 200, 500, 1000, 2000, 5000],
            labels=['very_short', 'short', 'medium', 'long', 'very_long']
        ).astype(str)
        
        # Weather impact
        if 'weather_condition' in df.columns:
            df['bad_weather'] = df['weather_condition'].str.contains(
                'rain|storm|fog|snow', case=False, na=False
            ).astype(int)
        else:
            df['bad_weather'] = 0
        
        # Encode categorical variables
        categorical_cols = ['transport_mode', 'vehicle_type', 'cargo_type', 'distance_category']
        
        for col in categorical_cols:
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df[f'{col}_encoded'] = self.label_encoders[col].fit_transform(
                        df[col].fillna('unknown')
                    )
                else:
                    # Handle unseen categories
                    le = self.label_encoders[col]
                    df[f'{col}_encoded'] = df[col].fillna('unknown').apply(
                        lambda x: le.transform([x])[0] if x in le.classes_ else -1
                    )
        
        return df
    
    def train(
        self,
        min_samples: int = 50,
        test_size: float = 0.2
    ) -> Dict:
        """
        Train cost prediction model on historical data
        
        Returns training metrics and model performance
        """
        
        print("📊 Training cost prediction model...")
        
        # Load data from database
        db = SessionLocal()
        try:
            shipments = db.query(Shipment).filter(
                Shipment.status == 'completed',
                Shipment.total_cost.isnot(None),
                Shipment.total_cost > 0
            ).all()
            
            if len(shipments) < min_samples:
                print(f"⚠️ Insufficient data: {len(shipments)} samples (need {min_samples})")
                return self._train_on_synthetic_data()
            
            # Convert to DataFrame
            data = []
            for s in shipments:
                data.append({
                    'distance_km': s.distance_km,
                    'cargo_weight_tons': s.cargo_weight_tons,
                    'cargo_value': s.cargo_value,
                    'transport_mode': s.transport_mode,
                    'vehicle_type': s.vehicle_type,
                    'cargo_type': s.cargo_type,
                    'pickup_datetime': s.pickup_datetime,
                    'dwell_time_hours': s.dwell_time_hours or s.distance_km / 50,  # Estimate
                    'weather_condition': s.weather_condition,
                    'total_cost': s.total_cost
                })
            
            df = pd.DataFrame(data)
            
        finally:
            db.close()
        
        # Prepare features
        df = self.prepare_features(df)
        
        # Feature columns
        self.feature_names = [
            'distance_km', 'cargo_weight_tons', 'cargo_value',
            'pickup_hour', 'pickup_day', 'pickup_month',
            'is_weekend', 'is_peak_hour',
            'km_per_hour', 'value_per_ton', 'high_value_cargo',
            'bad_weather',
            'transport_mode_encoded', 'vehicle_type_encoded',
            'cargo_type_encoded', 'distance_category_encoded'
        ]
        
        # Remove missing features
        self.feature_names = [f for f in self.feature_names if f in df.columns]
        
        X = df[self.feature_names].fillna(0)
        y = df['total_cost']
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_train_pred = self.model.predict(X_train_scaled)
        y_test_pred = self.model.predict(X_test_scaled)
        
        train_r2 = r2_score(y_train, y_train_pred)
        test_r2 = r2_score(y_test, y_test_pred)
        train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
        test_mae = mean_absolute_error(y_test, y_test_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train, cv=5, scoring='r2'
        )
        
        self.is_trained = True
        
        metrics = {
            'samples': len(df),
            'train_r2': round(train_r2, 4),
            'test_r2': round(test_r2, 4),
            'train_rmse': round(train_rmse, 2),
            'test_rmse': round(test_rmse, 2),
            'test_mae': round(test_mae, 2),
            'cv_mean_r2': round(cv_scores.mean(), 4),
            'cv_std_r2': round(cv_scores.std(), 4),
            'feature_importance': dict(zip(
                self.feature_names,
                [round(imp, 4) for imp in self.model.feature_importances_]
            ))
        }
        
        print(f"✅ Model trained - R²: {test_r2:.3f}, RMSE: ₹{test_rmse:.2f}")
        
        # Save model
        self.save_model()
        
        # Update database
        self._save_model_metadata(metrics)
        
        return metrics
    
    def _train_on_synthetic_data(self) -> Dict:
        """Train on synthetic data when real data is insufficient"""
        
        print("🔧 Generating synthetic training data...")
        
        # Generate synthetic shipments
        n_samples = 1000
        
        np.random.seed(42)
        
        data = {
            'distance_km': np.random.uniform(50, 2000, n_samples),
            'cargo_weight_tons': np.random.uniform(1, 25, n_samples),
            'cargo_value': np.random.uniform(50000, 2000000, n_samples),
            'transport_mode': np.random.choice(['Road', 'Rail', 'Air'], n_samples),
            'vehicle_type': np.random.choice([
                'Small Truck (<7.5T)', 'Medium Truck (7.5-16T)', 'Heavy Truck (16-25T)'
            ], n_samples),
            'cargo_type': np.random.choice([
                'Electronics', 'Textiles', 'Perishable', 'Bulk', 'Machinery'
            ], n_samples),
            'pickup_datetime': pd.date_range('2024-01-01', periods=n_samples, freq='6H'),
            'dwell_time_hours': np.random.uniform(5, 48, n_samples),
            'weather_condition': np.random.choice(
                ['Clear', 'Cloudy', 'Rain', 'Heavy Rain'], n_samples
            )
        }
        
        df = pd.DataFrame(data)
        
        # Calculate synthetic costs
        fuel_cost = (df['distance_km'] / 5) * 100  # Fuel
        toll_cost = (df['distance_km'] / 100) * 300  # Tolls
        driver_cost = df['dwell_time_hours'] * 200  # Driver wages
        maintenance = df['distance_km'] * 8  # Maintenance
        insurance = df['cargo_value'] * 0.001  # Insurance
        
        # Add variation
        variation = np.random.normal(1.0, 0.15, n_samples)
        
        df['total_cost'] = (
            fuel_cost + toll_cost + driver_cost + maintenance + insurance
        ) * variation
        
        # Train model
        df = self.prepare_features(df)
        
        self.feature_names = [
            'distance_km', 'cargo_weight_tons', 'cargo_value',
            'pickup_hour', 'pickup_day', 'pickup_month',
            'is_weekend', 'is_peak_hour',
            'km_per_hour', 'value_per_ton', 'high_value_cargo',
            'bad_weather',
            'transport_mode_encoded', 'vehicle_type_encoded',
            'cargo_type_encoded', 'distance_category_encoded'
        ]
        
        self.feature_names = [f for f in self.feature_names if f in df.columns]
        
        X = df[self.feature_names].fillna(0)
        y = df['total_cost']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        y_test_pred = self.model.predict(X_test_scaled)
        test_r2 = r2_score(y_test, y_test_pred)
        test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
        
        self.is_trained = True
        
        metrics = {
            'samples': n_samples,
            'test_r2': round(test_r2, 4),
            'test_rmse': round(test_rmse, 2),
            'synthetic': True
        }
        
        print(f"✅ Synthetic model trained - R²: {test_r2:.3f}")
        
        self.save_model()
        
        return metrics
    
    def predict_cost(self, shipment_data: Dict) -> Dict:
        """Predict cost for a new shipment"""
        
        if not self.is_trained:
            # Try to load existing model
            try:
                self.load_model()
            except:
                # Train on synthetic data
                self._train_on_synthetic_data()
        
        # Create DataFrame
        df = pd.DataFrame([shipment_data])
        
        # Ensure required fields
        if 'dwell_time_hours' not in df.columns:
            df['dwell_time_hours'] = df['distance_km'] / 50  # Estimate
        
        # Prepare features
        df = self.prepare_features(df)
        
        # Extract features
        X = df[self.feature_names].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predicted_cost = self.model.predict(X_scaled)[0]
        
        # Cost breakdown (estimated proportions)
        breakdown = {
            'fuel_cost': predicted_cost * 0.35,
            'toll_charges': predicted_cost * 0.15,
            'driver_wages': predicted_cost * 0.25,
            'maintenance': predicted_cost * 0.12,
            'insurance': predicted_cost * 0.08,
            'loading_unloading': predicted_cost * 0.05
        }
        
        # Confidence interval (simplified)
        confidence = 0.85
        lower_bound = predicted_cost * 0.90
        upper_bound = predicted_cost * 1.10
        
        return {
            'predicted_total_cost': round(predicted_cost, 2),
            'cost_breakdown': {k: round(v, 2) for k, v in breakdown.items()},
            'confidence_level': confidence,
            'cost_range': {
                'lower': round(lower_bound, 2),
                'upper': round(upper_bound, 2)
            },
            'cost_per_km': round(predicted_cost / shipment_data['distance_km'], 2),
            'cost_per_ton': round(predicted_cost / shipment_data['cargo_weight_tons'], 2)
        }
    
    def save_model(self, filepath: str = 'models/cost_model.pkl'):
        """Save trained model to disk"""
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, filepath)
        print(f"💾 Model saved to {filepath}")
    
    def load_model(self, filepath: str = 'models/cost_model.pkl'):
        """Load trained model from disk"""
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.label_encoders = model_data['label_encoders']
        self.feature_names = model_data['feature_names']
        self.is_trained = model_data['is_trained']
        
        print(f"✅ Model loaded from {filepath}")
    
    def _save_model_metadata(self, metrics: Dict):
        """Save model metadata to database"""
        
        db = SessionLocal()
        try:
            model_record = MLModel(
                model_name='cost_predictor',
                version=datetime.now().strftime('%Y%m%d_%H%M%S'),
                training_samples=metrics.get('samples', 0),
                accuracy_score=metrics.get('test_r2', 0),
                rmse=metrics.get('test_rmse', 0),
                model_file_path='models/cost_model.pkl',
                is_active=True
            )
            
            # Deactivate previous models
            db.query(MLModel).filter(
                MLModel.model_name == 'cost_predictor',
                MLModel.is_active == True
            ).update({'is_active': False})
            
            db.add(model_record)
            db.commit()
            
        finally:
            db.close()


class TimePredictionModel:
    """ML Model for predicting shipment duration"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def predict_time(self, shipment_data: Dict) -> Dict:
        """Predict transit time for shipment"""
        
        # Simple rule-based prediction (can be enhanced with ML)
        distance_km = shipment_data['distance_km']
        
        # Base speed estimates
        avg_speed = 50  # km/h for trucks
        
        # Adjust for transport mode
        if shipment_data.get('transport_mode') == 'Rail':
            avg_speed = 45
        elif shipment_data.get('transport_mode') == 'Air':
            avg_speed = 600
        
        base_time = distance_km / avg_speed
        
        # Add loading/unloading time
        loading_time = 2.0  # hours
        
        # Add buffer for breaks, tolls, etc
        buffer_factor = 1.15
        
        predicted_time = (base_time + loading_time) * buffer_factor
        
        return {
            'predicted_time_hours': round(predicted_time, 2),
            'estimated_arrival': None,  # Can calculate based on pickup time
            'confidence_level': 0.80
        }


# Singleton instances
cost_model = CostPredictionModel()
time_model = TimePredictionModel()
