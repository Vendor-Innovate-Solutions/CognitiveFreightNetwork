# 🎯 QUICK ACTION GUIDE

## ✅ What You Need To Do Manually

### 1. Get API Keys (30 minutes)

#### Google Maps API Key ⭐ REQUIRED
1. Go to: https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable these APIs:
   - Directions API
   - Distance Matrix API  
   - Geocoding API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. **IMPORTANT**: Restrict your key:
   - Go to API Key settings
   - Under "API restrictions", select "Restrict key"
   - Choose only the 3 APIs above
   - Under "Application restrictions", add your server IP or domain

**Free Tier**: $200/month credit = ~40,000 route requests

#### Weather API Key ⭐ REQUIRED
1. Go to: https://www.weatherapi.com/signup.aspx
2. Sign up (free)
3. Get your API key from the dashboard
4. Copy it

**Free Tier**: 1 million calls/month

#### Mapbox Token (Optional - for frontend maps)
1. Go to: https://account.mapbox.com/auth/signup/
2. Sign up
3. Get access token
4. Copy it

**Free Tier**: 50,000 map loads/month

---

### 2. Install & Configure (10 minutes)

```bash
# Clone repository
git clone <your-repo>
cd CognitiveFreightNetwork

# Backend Setup
cd backend
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux

# Edit .env file - Add your API keys!
# Windows: notepad .env
# Mac/Linux: nano .env

# Initialize database
python -c "from app.models.database import init_db; init_db()"

# Start backend
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs to verify

```bash
# Frontend Setup (new terminal)
cd frontend

npm install

# Create environment file
copy .env.local.example .env.local  # Windows
# OR  
cp .env.local.example .env.local    # Mac/Linux

# Edit and add Mapbox token
# Windows: notepad .env.local
# Mac/Linux: nano .env.local

# Start frontend
npm run dev
```

Visit: http://localhost:3000

---

### 3. First Test (5 minutes)

1. **Register**: Go to http://localhost:3000
   - Company Name: Test Logistics
   - Email: test@example.com
   - Password: Test123456
   - Company Type: Both

2. **Login** with same credentials

3. **Plan a Shipment**:
   - Origin: Mumbai, Maharashtra
   - Destination: Delhi, Delhi
   - Transport: Road - Heavy Truck
   - Cargo: Electronics, 15 tons, ₹50,00,000
   - Pickup: Tomorrow 8 AM
   - Click "Plan Shipment"

4. **Review 3 Route Options** with:
   - Cost predictions
   - Time estimates
   - Risk assessments
   - Recommendations

---

## 📊 Data Collection Strategy

### For Best Results:

#### Phase 1: Manual Historical Data (Week 1-2)
- Enter 50-100 past completed shipments
- Include actual costs, times, incidents
- Use the "Submit Historical Data" form
- **Goal**: Train initial ML models

#### Phase 2: Ongoing Collection (Month 1+)
- After each shipment completes, enter actual data
- Compare predicted vs actual
- ML model automatically retrains every 10 shipments
- **Goal**: Continuous improvement

### Required Data Points:

**Minimum**:
- Origin/Destination cities
- Distance (km)
- Cargo type, weight, value
- Pickup & delivery datetime
- Total cost

**Recommended** (for better predictions):
- Cost breakdown (fuel, tolls, labor, maintenance)
- Delays (hours) and reasons
- Incidents (breakdown, damage)
- Weather conditions
- Traffic levels

**Example Historical Shipment Entry**:
```json
{
  "shipment_ref": "SHP-001",
  "origin_city": "Mumbai, Maharashtra",
  "destination_city": "Delhi, Delhi",
  "distance_km": 1400,
  "cargo_type": "Electronics",
  "cargo_weight_tons": 15,
  "cargo_value": 5000000,
  "pickup_datetime": "2024-10-01T08:00:00",
  "delivery_datetime": "2024-10-03T14:00:00",
  "fuel_cost": 28000,
  "toll_charges": 8500,
  "labor_cost": 12000,
  "maintenance_cost": 5600,
  "other_costs": 3000,
  "total_cost": 57100,
  "freight_charge": 75000,
  "delay_hours": 2,
  "weather_condition": "Clear",
  "traffic_level": "Moderate"
}
```

---

## 🔌 Required Integrations

### Already Implemented:

✅ **Google Maps API**
- Automatic route calculation
- Multiple alternatives
- Real-time distances

✅ **Weather API**
- Current conditions
- Forecasts
- Impact assessment

✅ **Traffic Estimation**
- Time-based patterns
- Rush hour detection

### Optional Enhancements:

🔄 **Real-time GPS Tracking** (not implemented yet)
- Options: GPS device APIs
- Fleet tracking services
- Implementation: Add shipment tracking endpoints

🔄 **Live Traffic Data** (using estimates now)
- Google Traffic API
- TomTom Traffic API
- Implementation: Replace TrafficService with live data

🔄 **Fuel Price API** (using fixed price now)
- Indian Oil price API
- Implementation: Fetch daily prices

🔄 **Toll Plaza Data** (using estimates now)
- NHAI toll rate API
- Implementation: Accurate toll calculations

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Backend starts without errors
- [ ] Frontend loads at localhost:3000
- [ ] Can register new account
- [ ] Can login
- [ ] Can plan shipment
- [ ] Gets 3 route options
- [ ] Can submit historical data
- [ ] Can view analytics

### With API Keys
- [ ] Google Maps returns real routes
- [ ] Weather data shows current conditions
- [ ] Cost predictions are reasonable
- [ ] Risk assessments make sense

### Data & ML
- [ ] Historical data saves to database
- [ ] After 50 entries, can train model
- [ ] Predictions improve with more data
- [ ] Analytics show correct metrics

---

## 🚨 Common Issues & Fixes

### Issue: "Module not found"
```bash
pip install -r requirements.txt --upgrade
```

### Issue: "Database locked"
```bash
# Stop all running instances
# Delete database file
rm logistics.db  # Mac/Linux
del logistics.db # Windows

# Recreate
python -c "from app.models.database import init_db; init_db()"
```

### Issue: "API key invalid"
- Check no extra spaces in .env file
- Verify key is correct from provider
- Ensure APIs are enabled (Google Cloud Console)
- Check billing is enabled (even for free tier)

### Issue: "CORS error"
- Backend must be running
- Check NEXT_PUBLIC_API_URL in frontend .env.local
- Verify CORS settings in backend main.py

### Issue: "Predictions are way off"
- Need more training data
- Enter at least 50 historical shipments
- Include accurate cost breakdowns
- Retrain model: POST /ml/train

---

## 📈 Success Metrics

### Week 1:
- [ ] System fully operational
- [ ] 10+ test shipments planned
- [ ] 20+ historical shipments entered

### Month 1:
- [ ] 50+ historical shipments
- [ ] ML models trained
- [ ] 5+ real shipments planned and executed
- [ ] Compare predicted vs actual costs

### Month 3:
- [ ] 200+ shipments in database
- [ ] Prediction accuracy > 85%
- [ ] Cost savings identified: 10-15%
- [ ] Risk mitigation working

---

## 🎯 Expected Benefits

### Immediate (Day 1):
- Multi-route comparison
- Risk identification
- Weather impact awareness
- Structured planning

### Short-term (Month 1):
- 10-15% cost reduction through better route selection
- Reduced unexpected delays
- Better risk management
- Data-driven decisions

### Long-term (3+ Months):
- Accurate cost predictions (85%+ accuracy)
- Learned patterns for your specific routes
- Optimized fleet utilization
- Historical performance tracking

---

## 💡 Pro Tips

1. **API Keys**: Get them first - system works without them but much less useful

2. **Historical Data**: Quality > Quantity. 50 accurate shipments beat 200 rough estimates

3. **Regular Use**: The more you use it, the smarter it gets

4. **Risk Assessment**: Don't ignore risk factors - they're based on real data

5. **Compare Predictions**: After shipments complete, compare predicted vs actual to validate

6. **Weather Matters**: Check weather forecasts - can change route recommendations significantly

7. **Multiple Options**: Always review all 3 route options, not just the recommended one

8. **Analytics Dashboard**: Use it weekly to identify patterns and improvement opportunities

---

## 🆘 Need Help?

1. **Documentation**: Read COMPLETE_SETUP_GUIDE.md
2. **API Docs**: Visit http://localhost:8000/docs
3. **Errors**: Check terminal output for specific error messages
4. **Testing**: Use Swagger UI to test API endpoints directly

---

## ✅ Deployment Checklist (Production)

### Before Going Live:

Security:
- [ ] Change SECRET_KEY to strong random value
- [ ] Restrict CORS to your domain only
- [ ] Use HTTPS (not HTTP)
- [ ] Restrict API keys (IP/domain)
- [ ] Set up error monitoring (Sentry)

Database:
- [ ] Switch to PostgreSQL (not SQLite)
- [ ] Set up automated backups
- [ ] Configure connection pooling

Environment:
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] Proper logging configured

Performance:
- [ ] Enable caching (Redis)
- [ ] Set up CDN for frontend
- [ ] Configure rate limiting
- [ ] Load testing completed

Monitoring:
- [ ] Error tracking setup
- [ ] Performance monitoring
- [ ] API usage tracking
- [ ] Cost alerts configured

---

**You're all set! Start with getting the API keys, then follow the installation steps above.** 🚀
