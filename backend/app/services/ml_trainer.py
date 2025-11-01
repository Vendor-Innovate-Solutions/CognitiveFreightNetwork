"""
ML Model Training Module
Trains models on historical data and handles real-time predictions
"""

import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, classification_report, accuracy_score
import warnings
warnings.filterwarnings('ignore')


class LogisticsMLTrainer:
    """Trains and manages ML models for logistics predictions"""
    
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.models_dir = Path(__file__).parent.parent.parent / "trained_models"
        self.models_dir.mkdir(exist_ok=True)
        
        # Model storage
        self.delivery_time_model = None
        self.risk_classifier = None
        self.cost_predictor = None
        self.delay_classifier = None
        
        # Preprocessing tools
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        # Feature names (for real-time prediction)
        self.feature_columns = None
        
        print("🚀 ML Trainer initialized")
    
    def load_and_preprocess_data(self) -> pd.DataFrame:
        """Load dataset and preprocess for ML"""
        print("\n📊 Loading dataset...")
        df = pd.read_csv(self.data_path)
        print(f"✓ Loaded {len(df)} rows × {len(df.columns)} columns")
        
        # Remove GPS and timestamp columns (as requested)
        columns_to_remove = ['timestamp', 'vehicle_gps_latitude', 'vehicle_gps_longitude']
        df = df.drop(columns=columns_to_remove, errors='ignore')
        print(f"✓ Removed {len(columns_to_remove)} columns: {columns_to_remove}")
        
        # Encode risk_classification
        if 'risk_classification' in df.columns:
            df['risk_classification_encoded'] = self.label_encoder.fit_transform(df['risk_classification'])
            # Save label encoder for later use
            joblib.dump(self.label_encoder, self.models_dir / "label_encoder.pkl")
            print(f"✓ Encoded risk classes: {list(self.label_encoder.classes_)}")
        
        # Create binary delay indicator
        if 'delay_probability' in df.columns:
            df['is_delayed'] = (df['delay_probability'] > 0.5).astype(int)
            print("✓ Created binary delay indicator")
        
        print(f"\n✅ Final dataset: {len(df)} rows × {len(df.columns)} columns")
        return df
    
    def prepare_features_and_targets(self, df: pd.DataFrame) -> Tuple:
        """Separate features and target variables"""
        
        # Define target variables
        targets = {
            'delivery_time': 'delivery_time_deviation',
            'risk': 'risk_classification_encoded',
            'cost': 'shipping_costs',
            'delay': 'is_delayed'
        }
        
        # Columns to exclude from features
        exclude_cols = [
            'delivery_time_deviation',
            'risk_classification', 
            'risk_classification_encoded',
            'shipping_costs',
            'delay_probability',
            'is_delayed'
        ]
        
        # Feature columns
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        self.feature_columns = feature_cols
        
        print(f"\n📋 Features ({len(feature_cols)}): {feature_cols[:5]}... (showing first 5)")
        
        X = df[feature_cols].copy()
        
        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        X = pd.DataFrame(X_scaled, columns=feature_cols)
        
        # Save scaler
        joblib.dump(self.scaler, self.models_dir / "feature_scaler.pkl")
        
        # Extract targets
        y_delivery = df[targets['delivery_time']]
        y_risk = df[targets['risk']]
        y_cost = df[targets['cost']]
        y_delay = df[targets['delay']]
        
        return X, y_delivery, y_risk, y_cost, y_delay
    
    def train_delivery_time_model(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train delivery time prediction model (Regression)"""
        print("\n" + "="*60)
        print("🚚 TRAINING DELIVERY TIME PREDICTION MODEL")
        print("="*60)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Random Forest Regressor
        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        print("⏳ Training Random Forest Regressor...")
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
        
        results = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
        
        print(f"\n📊 Model Performance:")
        print(f"   MAE:  {mae:.3f} hours")
        print(f"   RMSE: {rmse:.3f} hours")
        print(f"   R² Score: {r2:.3f}")
        print(f"   CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n🔝 Top 5 Important Features:")
        for idx, row in feature_importance.head().iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
        
        # Save model
        self.delivery_time_model = model
        joblib.dump(model, self.models_dir / "delivery_time_model.pkl")
        print(f"\n✅ Model saved to: {self.models_dir / 'delivery_time_model.pkl'}")
        
        return results
    
    def train_risk_classifier(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train risk classification model"""
        print("\n" + "="*60)
        print("⚠️  TRAINING RISK CLASSIFICATION MODEL")
        print("="*60)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest Classifier
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        print("⏳ Training Random Forest Classifier...")
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
        
        results = {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
        
        print(f"\n📊 Model Performance:")
        print(f"   Accuracy: {accuracy:.3f}")
        print(f"   CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        print(f"\n📋 Classification Report:")
        print(classification_report(y_test, y_pred, 
                                   target_names=self.label_encoder.classes_))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n🔝 Top 5 Important Features:")
        for idx, row in feature_importance.head().iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
        
        # Save model
        self.risk_classifier = model
        joblib.dump(model, self.models_dir / "risk_classifier.pkl")
        print(f"\n✅ Model saved to: {self.models_dir / 'risk_classifier.pkl'}")
        
        return results
    
    def train_cost_predictor(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train shipping cost prediction model"""
        print("\n" + "="*60)
        print("💰 TRAINING COST PREDICTION MODEL")
        print("="*60)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Gradient Boosting Regressor (better for cost prediction)
        model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42
        )
        
        print("⏳ Training Gradient Boosting Regressor...")
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
        
        results = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
        
        print(f"\n📊 Model Performance:")
        print(f"   MAE:  ₹{mae:.2f}")
        print(f"   RMSE: ₹{rmse:.2f}")
        print(f"   R² Score: {r2:.3f}")
        print(f"   CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n🔝 Top 5 Important Features:")
        for idx, row in feature_importance.head().iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
        
        # Save model
        self.cost_predictor = model
        joblib.dump(model, self.models_dir / "cost_predictor.pkl")
        print(f"\n✅ Model saved to: {self.models_dir / 'cost_predictor.pkl'}")
        
        return results
    
    def train_delay_classifier(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train binary delay classifier"""
        print("\n" + "="*60)
        print("⏰ TRAINING DELAY PREDICTION MODEL (Binary)")
        print("="*60)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest Classifier
        model = RandomForestClassifier(
            n_estimators=150,
            max_depth=15,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        print("⏳ Training Random Forest Classifier...")
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
        
        results = {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
        
        print(f"\n📊 Model Performance:")
        print(f"   Accuracy: {accuracy:.3f}")
        print(f"   CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        print(f"\n📋 Classification Report:")
        print(classification_report(y_test, y_pred, 
                                   target_names=['On-Time', 'Delayed']))
        
        # Save model
        self.delay_classifier = model
        joblib.dump(model, self.models_dir / "delay_classifier.pkl")
        print(f"\n✅ Model saved to: {self.models_dir / 'delay_classifier.pkl'}")
        
        return results
    
    def train_all_models(self) -> Dict:
        """Train all ML models"""
        print("\n" + "="*70)
        print("🤖 COGNITIVE FREIGHT NETWORK - ML MODEL TRAINING")
        print("="*70)
        print(f"📅 Training started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load and preprocess data
        df = self.load_and_preprocess_data()
        
        # Prepare features and targets
        X, y_delivery, y_risk, y_cost, y_delay = self.prepare_features_and_targets(df)
        
        # Train all models
        results = {}
        
        results['delivery_time'] = self.train_delivery_time_model(X, y_delivery)
        results['risk_classification'] = self.train_risk_classifier(X, y_risk)
        results['cost_prediction'] = self.train_cost_predictor(X, y_cost)
        results['delay_prediction'] = self.train_delay_classifier(X, y_delay)
        
        # Save feature columns
        with open(self.models_dir / "feature_columns.txt", "w") as f:
            f.write("\n".join(self.feature_columns))
        
        print("\n" + "="*70)
        print("✅ ALL MODELS TRAINED SUCCESSFULLY!")
        print("="*70)
        print(f"\n📂 Models saved in: {self.models_dir}")
        print(f"📅 Training completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return results


def main():
    """Main training function"""
    # Path to dataset
    data_path = Path(__file__).parent.parent.parent.parent / "data_processing" / "dynamic_supply_chain_logistics_dataset.csv"
    
    if not data_path.exists():
        print(f"❌ Dataset not found at: {data_path}")
        return
    
    # Initialize trainer
    trainer = LogisticsMLTrainer(str(data_path))
    
    # Train all models
    results = trainer.train_all_models()
    
    print("\n" + "="*70)
    print("📊 TRAINING SUMMARY")
    print("="*70)
    print(f"\n1. Delivery Time Model:")
    print(f"   - MAE: {results['delivery_time']['mae']:.2f} hours")
    print(f"   - R² Score: {results['delivery_time']['r2']:.3f}")
    
    print(f"\n2. Risk Classification Model:")
    print(f"   - Accuracy: {results['risk_classification']['accuracy']:.3f}")
    
    print(f"\n3. Cost Prediction Model:")
    print(f"   - MAE: ₹{results['cost_prediction']['mae']:.2f}")
    print(f"   - R² Score: {results['cost_prediction']['r2']:.3f}")
    
    print(f"\n4. Delay Prediction Model:")
    print(f"   - Accuracy: {results['delay_prediction']['accuracy']:.3f}")
    
    print("\n✅ Ready for production!")


if __name__ == "__main__":
    main()
