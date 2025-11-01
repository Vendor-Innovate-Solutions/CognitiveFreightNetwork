# 🚀 Cognitive Freight Network - Complete Setup Guide

## Overview

This is an **AI-powered logistics planning and optimization platform** that helps companies:
- Plan optimal shipment routes with real-time data
- Predict costs accurately using machine learning
- Assess risks and get mitigation recommendations
- Track historical performance and analytics
- Use novel multi-objective path-finding algorithms

---

## 🎯 System Architecture

```
Frontend (Next.js + React)
    ↕️
Backend API (FastAPI + Python)
    ↕️
┌─────────────────────────────────────┐
│  External Services                   │
│  • Google Maps API (routes)         │
│  • Weather API (forecasts)          │
│  • Traffic Data (real-time)         │
└─────────────────────────────────────┘
    ↕️
┌─────────────────────────────────────┐
│  ML Models                           │
│  • Cost Prediction (Gradient Boost) │
│  • Time Prediction (Random Forest)  │
│  • Route Optimization (Novel Algo)  │
└─────────────────────────────────────┘
    ↕️
Database (SQLite/PostgreSQL)
```

---

## 📋 Prerequisites

### Required Software
- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

### API Keys (Required for Full Functionality)

#### 1. Google Maps API Key ⭐ CRITICAL
**Purpose**: Route calculation, distance matrix, geocoding

**Get it here**: https://console.cloud.google.com/

**Steps**:
1. Create a Google Cloud Project
2. Enable these APIs:
   - **Directions API** (route calculations)
   - **Distance Matrix API** (distances)
   - **Geocoding API** (city coordinates)
3. Create credentials → API Key
4. **Restrict the key** (recommended):
   - Application restrictions: HTTP referrers (for frontend) or IP addresses (for backend)
   - API restrictions: Only allow the 3 APIs above

**Cost**: Free tier includes $200 credit/month (~40,000 route requests)

**Fallback**: System will use approximate calculations if API fails

#### 2. Weather API Key ⭐ IMPORTANT
**Purpose**: Weather forecasts, historical weather data

**Get it here**: https://www.weatherapi.com/

**Steps**:
1. Sign up for free account
2. Get API key from dashboard
3. Free tier: 1 million calls/month

**Fallback**: System will use generic weather assumptions

---

## 🔧 Installation Steps

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd CognitiveFreightNetwork
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment variables
# Windows:
copy .env.example .env
# Mac/Linux:
cp .env.example .env
```

**Edit `.env` file** (create if doesn't exist):
```env
# Database
DATABASE_URL=sqlite:///./logistics.db

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# External APIs
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
WEATHER_API_KEY=your_weather_api_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Generate SECRET_KEY** (run in Python):
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 3. Initialize Database

```bash
# Still in backend directory with venv activated
python -c "from app.models.database import init_db; init_db()"
```

### 4. Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

**Verify**: Visit http://localhost:8000/docs - You should see interactive API documentation

### 5. Frontend Setup

```bash
# New terminal window
cd frontend

# Install dependencies
npm install

# Create environment variables
# Windows:
copy .env.local.example .env.local
# Mac/Linux:
cp .env.local.example .env.local
```

**Edit `.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

**Get Mapbox Token** (for map visualization):
1. Sign up at https://www.mapbox.com/
2. Get access token from account dashboard
3. Free tier: 50,000 map loads/month

### 6. Start Frontend

```bash
npm run dev
```

**Verify**: Visit http://localhost:3000

---

## 🎮 How to Use the Platform

### First Time Setup

#### 1. Register Your Company

Visit http://localhost:3000 and register:
- Company Name
- Email
- Password
- Company Type (Shipper/Transporter/Both)
- GSTIN (optional but recommended)

#### 2. Login

Use your credentials to access the dashboard

### Planning a Shipment

#### Step 1: Navigate to Shipment Planner

Click "Plan New Shipment" from the dashboard

#### Step 2: Enter Shipment Details

Fill in the form:

**Route Information:**
- Origin City: e.g., "Mumbai, Maharashtra"
- Destination City: e.g., "Delhi, Delhi"

**Transport Details:**
- Transport Mode: Road, Rail, Air, Coastal
- Vehicle Type: Select appropriate truck size

**Cargo Details:**
- Cargo Type: Electronics, Textiles, Perishable, etc.
- Weight (tons): e.g., 15
- Declared Value (INR): e.g., 5000000
- Special Requirements: Fragile, Perishable, Refrigeration

**Timing:**
- Pickup Date & Time

**Preferences:**
- Prefer Fastest Route (vs Cheapest)
- Avoid Toll Roads
- Prefer Highways

#### Step 3: Get AI Recommendations

Click "Plan Shipment" - The system will:

1. **Fetch Real Route Data** from Google Maps
2. **Get Weather Forecasts** for origin and destination
3. **Run ML Cost Prediction** based on historical data
4. **Apply Novel Multi-Objective Optimization**:
   - Cost optimization
   - Time optimization
   - Safety score
   - Weather impact
   - Reliability score
5. **Generate 3 Route Options** ranked by your preferences

#### Step 4: Review Results

You'll see 3 route options with:

**Cost Breakdown:**
- Fuel cost
- Toll charges
- Driver wages
- Maintenance
- Insurance
- Loading/unloading
- **Total estimated cost**

**Time Estimates:**
- Base travel time
- Weather delays
- Traffic delays
- Loading time
- **Total estimated time**

**Risk Assessment:**
- Overall risk score (0-1)
- Risk level (Low/Moderate/High/Critical)
- Specific risks: Delay, Damage, Theft, Weather
- **Mitigation recommendations**

**Rankings:**
- Cost rank (which is cheapest)
- Time rank (which is fastest)
- Safety rank (which is safest)
- **Overall score** (weighted combination)

#### Step 5: Select and Proceed

- Review the recommended route (marked with ⭐)
- Compare with alternatives
- Check risk factors
- Save the plan

### Submitting Historical Data

**Why**: ML models improve with your actual shipment data

**How**:

1. Navigate to "Submit Historical Data"
2. Fill in completed shipment details:
   - Route info
   - Actual costs (fuel, tolls, labor, etc.)
   - Actual delivery time
   - Any incidents (breakdown, damage)
   - Weather conditions
   - Traffic levels

3. Submit

**Benefits**:
- After 50 shipments: ML models automatically retrain
- Predictions become more accurate for YOUR specific routes
- System learns YOUR operational patterns

### Viewing Analytics

Navigate to "Analytics Dashboard" to see:

- **Volume Metrics**: Total shipments, distance, cargo
- **Financial Metrics**: Total cost, revenue, profit, margins
- **Performance Metrics**: On-time delivery rate, average delays
- **Incident Rate**: Breakdown/damage frequency
- **Trends**: Cost trends, volume trends
- **Top Routes**: Most used, most profitable, most problematic

---

## 🧠 ML Model Training

### Automatic Training

The system automatically trains when:
- You have 50+ completed shipments
- Every 10 new shipments after that

### Manual Training

```bash
# Via API (requires authentication)
curl -X POST http://localhost:8000/ml/train \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or use the API documentation at http://localhost:8000/docs

### Model Files

Models are saved to:
```
backend/models/
  - cost_model.pkl
  - model_metadata.json
```

**Backup these files** to preserve trained models!

---

## 📊 Dataset Requirements & Features

### Minimum Required Features

For the ML models to work, historical data should include:

**Route Features** (Required):
- `origin_city`: String
- `destination_city`: String
- `distance_km`: Float

**Cargo Features** (Required):
- `cargo_weight_tons`: Float (0.1 - 50)
- `cargo_value`: Float (INR)
- `cargo_type`: String (Electronics, Textiles, Bulk, etc.)

**Cost Features** (Required for training):
- `total_cost`: Float (INR)
- Optionally breakdown: fuel, toll, labor, maintenance

**Time Features** (Required):
- `pickup_datetime`: DateTime
- `delivery_datetime`: DateTime

**Performance Features** (Optional but valuable):
- `delay_hours`: Float
- `had_breakdown`: Boolean
- `had_damage`: Boolean
- `weather_condition`: String
- `traffic_level`: String (Low/Moderate/High)

### Enhanced Features (Collected Automatically)

The system automatically derives:
- `hour_of_day`, `day_of_week`, `month`
- `is_weekend`, `is_peak_hour`
- `km_per_hour` (efficiency)
- `cost_per_km`, `cost_per_ton`
- `high_value_cargo` (flag)
- `distance_category`

### Data Quality Tips

**Good Quality Data**:
✅ Accurate cost breakdowns
✅ Precise timestamps
✅ Consistent cargo types
✅ Actual distances (not estimates)
✅ Complete incident records

**Poor Quality Data**:
❌ Missing cost components
❌ Rounded or estimated times
❌ Inconsistent naming (Mumbai vs Bombay)
❌ Zero or null values
❌ Unrealistic values

---

## 🔄 API Integrations

### Google Maps Integration

**What it provides**:
- Accurate route distances
- Multiple route alternatives
- Turn-by-turn directions
- Real-time traffic data
- Geocoding for city names

**How it's used**:
```python
# In route_optimizer.py
maps_data = maps_service.get_route_info(
    origin="Mumbai, Maharashtra",
    destination="Delhi, Delhi",
    avoid_tolls=False
)

# Returns:
# - distance_km
# - duration_hours
# - waypoints
# - polyline (for map visualization)
```

**Fallback Strategy**:
- If API fails, uses approximate distances based on major cities
- Estimates based on 50 km/h average speed
- Still functional but less accurate

### Weather API Integration

**What it provides**:
- Current weather conditions
- 7-day forecasts
- Historical weather data
- Precipitation, wind, temperature

**How it's used**:
```python
# In route_optimizer.py
weather = weather_service.get_current_weather("Mumbai")

# Assesses impact:
impact = weather_service.assess_weather_impact(weather)
# Returns:
# - impact_score (0-1)
# - delay_factor (1.0 = no delay, 1.5 = 50% slower)
# - recommendations
```

**Weather Impact on Costs**:
- Heavy rain: +20-30% time, +15% fuel
- Storms: Potential shipment postponement
- Fog: +10-15% time, safety concerns

### Traffic Data Integration

**Currently**: Rule-based on time of day

**Future Enhancement Options**:
1. **Google Traffic API**: Real-time traffic
2. **TomTom Traffic API**: Historical patterns
3. **OpenStreetMap + Overpass API**: Free alternative

---

## 🎨 Novel Algorithm Explanation

### Multi-Objective Route Optimization

Our novel algorithm combines multiple approaches:

#### 1. Modified Dijkstra's Algorithm
- Finds shortest paths considering multiple objectives
- Not just distance, but cost + time + safety + weather

#### 2. Pareto Optimization
- Finds non-dominated solutions
- A route is Pareto-optimal if no other route is better in ALL objectives
- Returns multiple good options instead of just one

#### 3. Dynamic Cost Modeling
- Costs are not static
- Adjusted based on:
  - Real-time weather
  - Current traffic levels
  - Time of day
  - Vehicle load
  - Route quality

#### 4. Risk-Adjusted Pathfinding
- Each route segment has a risk score
- High-risk routes: theft, damage, delays
- Algorithm balances cost savings vs risk

#### 5. Weather-Aware Routing
- Checks weather along entire route
- Avoids severe weather if possible
- Adds buffer time for adverse conditions

### Algorithm Steps (Simplified)

```python
def find_optimal_routes(origin, destination, cargo, preferences):
    # 1. Get base routes from Google Maps
    base_routes = maps_api.get_routes(origin, destination)
    
    # 2. For each route:
    for route in base_routes:
        # 3. Calculate costs (fuel, tolls, labor, etc.)
        costs = calculate_dynamic_costs(route, cargo)
        
        # 4. Get weather forecasts
        weather = get_weather_along_route(route)
        
        # 5. Assess risks
        risks = assess_risks(route, cargo, weather)
        
        # 6. Calculate objectives
        objectives = {
            'cost': total_cost,
            'time': total_time,
            'safety': safety_score,
            'weather': weather_score,
            'reliability': reliability_score
        }
        
        route.objectives = objectives
    
    # 7. Filter Pareto-optimal solutions
    pareto_routes = filter_pareto_optimal(base_routes)
    
    # 8. Rank by user preferences
    ranked = rank_by_preferences(pareto_routes, preferences)
    
    return ranked[:3]  # Return top 3
```

### Why This is Novel

**Traditional Route Optimization**:
- Single objective (usually cost or time)
- Static pricing
- Ignores real-world factors

**Our Algorithm**:
- Multiple objectives simultaneously
- Dynamic, real-time cost modeling
- Weather and traffic integration
- Risk assessment
- Machine learning predictions
- Pareto-optimal solution set

---

## 🚀 Production Deployment

### Environment Variables for Production

```env
# Database - Use PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/logistics

# Security
SECRET_KEY=<generate-strong-key-64-chars>
ALLOWED_ORIGINS=https://yourdomain.com

# APIs
GOOGLE_MAPS_API_KEY=<your-key>
WEATHER_API_KEY=<your-key>

# Optional
SENTRY_DSN=<error-tracking>
LOG_LEVEL=INFO
```

### Recommended Hosting

**Backend**:
- **Railway.app**: Easy Python deployment
- **Render.com**: Free tier available
- **AWS EC2/ECS**: Scalable production
- **Google Cloud Run**: Serverless containers

**Frontend**:
- **Vercel**: Optimized for Next.js (recommended)
- **Netlify**: Good alternative
- **AWS Amplify**: Full-stack solution

**Database**:
- **PostgreSQL on Railway**: Managed database
- **AWS RDS**: Production-grade
- **Supabase**: Open-source alternative

### Security Checklist

- [ ] Change SECRET_KEY to strong random value
- [ ] Restrict CORS origins to your domain only
- [ ] Use HTTPS only (no HTTP in production)
- [ ] Restrict API keys (IP/domain restrictions)
- [ ] Enable rate limiting
- [ ] Set up error monitoring (Sentry)
- [ ] Regular database backups
- [ ] Environment variables in secure vault
- [ ] API authentication on all endpoints
- [ ] SQL injection protection (using SQLAlchemy ORM)

---

## 🧪 Testing

### Manual Testing

1. **Authentication**:
   - Register new company
   - Login
   - Get profile

2. **Shipment Planning**:
   - Plan shipment with valid inputs
   - Check all 3 route options
   - Verify cost calculations
   - Check risk assessments

3. **Historical Data**:
   - Submit past shipment
   - Check total count
   - Verify data storage

4. **Analytics**:
   - View dashboard
   - Check metrics calculation

### API Testing (via Swagger UI)

Visit: http://localhost:8000/docs

Try endpoints:
1. `POST /auth/register` - Create account
2. `POST /auth/login` - Get token
3. `GET /auth/me` - Verify auth
4. `POST /shipments/plan` - Plan shipment
5. `GET /analytics/dashboard` - View analytics

---

## 📝 Troubleshooting

### Backend Issues

**Problem**: Module not found errors
**Solution**:
```bash
pip install -r requirements.txt --upgrade
```

**Problem**: Database errors
**Solution**:
```bash
# Delete existing database and recreate
rm logistics.db
python -c "from app.models.database import init_db; init_db()"
```

**Problem**: API key errors (Google Maps)
**Solution**:
- Check `.env` file exists in backend folder
- Verify API key is correct (no extra spaces)
- Ensure APIs are enabled in Google Cloud Console
- Check billing is enabled (even for free tier)

### Frontend Issues

**Problem**: Connection refused to backend
**Solution**:
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

**Problem**: Environment variables not loading
**Solution**:
- File MUST be named `.env.local` (not `.env`)
- Restart Next.js dev server after changing variables
- Variables must start with `NEXT_PUBLIC_` for client-side access

### ML Model Issues

**Problem**: Predictions are inaccurate
**Solution**:
- Need more training data (minimum 50 shipments)
- Submit more historical data
- Retrain model: `POST /ml/train`

**Problem**: Model not loading
**Solution**:
- Normal on first run (will train on first use)
- Check `backend/models/` folder exists
- Verify file permissions

---

## 💡 Tips for Maximum Value

### 1. Complete Historical Data Entry
- More data = Better predictions
- Enter at least 50 past shipments
- Include actual costs (not estimates)

### 2. Use Real API Keys
- Google Maps: Accurate routes
- Weather API: Real-time conditions
- Significantly improves recommendations

### 3. Regular Model Retraining
- Every 100 new shipments
- Monthly for best results
- After route/pricing changes

### 4. Review All Route Options
- Don't just pick cheapest
- Consider risk factors
- Weather can change everything

### 5. Learn from Analytics
- Identify problematic routes
- Optimize most-used routes
- Track improvement over time

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs
- **Google Maps API**: https://developers.google.com/maps
- **Weather API**: https://www.weatherapi.com/docs/
- **FastAPI Tutorial**: https://fastapi.tiangolo.com/tutorial/
- **Next.js Docs**: https://nextjs.org/docs

---

## 🆘 Support & Contact

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation at /docs
3. Check terminal/console for error messages
4. Contact development team

---

**Built with ❤️ for the Logistics Industry**
