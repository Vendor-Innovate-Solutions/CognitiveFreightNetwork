# 🧪 Testing the Backend System

## Quick Start Testing (5 minutes)

### 1. Start the Backend

```bash
cd backend
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

uvicorn app.main:app --reload
```

### 2. Open Swagger UI

Visit: http://localhost:8000/docs

You'll see interactive API documentation with all endpoints.

---

## Test Sequence

### Test 1: Health Check (No Auth Required)

1. Find `GET /health` endpoint
2. Click "Try it out"
3. Click "Execute"

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T12:00:00",
  "ml_models": {
    "cost_model": false,
    "time_model": true
  }
}
```

✅ **Pass**: Status is "healthy"

---

### Test 2: Company Registration

1. Find `POST /auth/register`
2. Click "Try it out"
3. Enter this data:

```json
{
  "name": "Test Logistics Pvt Ltd",
  "email": "test@logistics.com",
  "password": "SecurePass123",
  "company_type": "Both",
  "phone": "9876543210",
  "gstin": "27AABCT1234H1Z5"
}
```

4. Click "Execute"

**Expected Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "company_name": "Test Logistics Pvt Ltd",
  "subscription_tier": "free"
}
```

✅ **Pass**: Got access_token
📝 **Save**: Copy the access_token value

---

### Test 3: Login

1. Find `POST /auth/login`
2. Click "Try it out"
3. Enter credentials:
   - username: `test@logistics.com`
   - password: `SecurePass123`

4. Click "Execute"

**Expected Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "company_name": "Test Logistics Pvt Ltd",
  "subscription_tier": "free"
}
```

✅ **Pass**: Successfully logged in

---

### Test 4: Authorize (Important!)

1. Click the **"Authorize"** button at the top of the page
2. Enter your access_token in the field
3. Click "Authorize"
4. Click "Close"

Now all protected endpoints will work!

---

### Test 5: Get Profile

1. Find `GET /auth/me`
2. Click "Try it out"
3. Click "Execute"

**Expected Response**:
```json
{
  "id": 1,
  "name": "Test Logistics Pvt Ltd",
  "email": "test@logistics.com",
  "company_type": "Both",
  "phone": "9876543210",
  "gstin": "27AABCT1234H1Z5",
  "subscription_tier": "free",
  "is_active": true,
  "created_at": "2025-11-01T12:00:00"
}
```

✅ **Pass**: Got company profile

---

### Test 6: Plan a Shipment (The Big One!)

1. Find `POST /shipments/plan`
2. Click "Try it out"
3. Enter this data:

```json
{
  "origin_city": "Mumbai, Maharashtra",
  "destination_city": "Delhi, Delhi",
  "transport_mode": "Road",
  "vehicle_type": "Heavy Truck (16-25T)",
  "cargo_type": "Electronics",
  "cargo_weight_tons": 15,
  "cargo_value": 5000000,
  "is_fragile": true,
  "is_perishable": false,
  "requires_refrigeration": false,
  "pickup_datetime": "2025-11-05T08:00:00",
  "prefer_fastest": true,
  "avoid_toll_roads": false,
  "prefer_highways": true
}
```

4. Click "Execute" (This will take 5-10 seconds)

**Expected Response**:
```json
{
  "plan_id": "PLAN-20251101-120000-abc123",
  "created_at": "2025-11-01T12:00:00",
  "origin": "Mumbai, Maharashtra",
  "destination": "Delhi, Delhi",
  "cargo_summary": "15.0T Electronics",
  "route_options": [
    {
      "route_id": "ROUTE-1",
      "route_name": "Route via ROUTE-1",
      "total_distance_km": 1400.5,
      "estimated_time_hours": 28.5,
      "cost_breakdown": {
        "fuel_cost": 28350.00,
        "toll_charges": 4200.00,
        "driver_wages": 5700.00,
        "vehicle_maintenance": 3360.00,
        "insurance_cost": 2268.00,
        "loading_unloading": 1422.00,
        "total_estimated_cost": 45300.00,
        "cost_per_km": 32.35,
        "cost_per_ton": 3020.00
      },
      "risk_assessment": {
        "overall_risk_score": 0.35,
        "risk_level": "Moderate",
        "delay_risk": 0.25,
        "damage_risk": 0.40,
        "theft_risk": 0.25,
        "weather_risk": 0.15,
        "risk_factors": [
          "Cargo damage risk due to fragility",
          "High-value cargo - theft risk"
        ],
        "mitigation_recommendations": [
          "Use reinforced packaging",
          "Consider GPS tracking device"
        ]
      },
      "is_recommended": true,
      "recommendation_reason": "Best overall score based on your preferences"
    }
    // ... 2 more route options
  ],
  "recommended_route": { /* same as first option */ },
  "next_steps": [
    "Review recommended route and cost estimates",
    "Check weather forecasts before departure",
    "Ensure proper cargo insurance"
  ]
}
```

✅ **Pass**: Got 3 route options with cost & risk data

**Check These**:
- [ ] Total cost is reasonable (₹40,000-60,000)
- [ ] Time estimate makes sense (24-30 hours)
- [ ] Distance is around 1400 km
- [ ] Risk assessment has recommendations
- [ ] All 3 routes have different scores

---

### Test 7: Submit Historical Data

1. Find `POST /shipments/historical`
2. Click "Try it out"
3. Enter:

```json
{
  "shipment_ref": "SHP-2024-001",
  "origin_city": "Mumbai, Maharashtra",
  "destination_city": "Delhi, Delhi",
  "distance_km": 1420,
  "transport_mode": "Road",
  "vehicle_type": "Heavy Truck (16-25T)",
  "cargo_type": "Electronics",
  "cargo_weight_tons": 15,
  "cargo_value": 5000000,
  "pickup_datetime": "2024-10-01T08:00:00",
  "delivery_datetime": "2024-10-02T18:00:00",
  "fuel_cost": 28500,
  "toll_charges": 4300,
  "labor_cost": 6000,
  "maintenance_cost": 3500,
  "other_costs": 2000,
  "total_cost": 44300,
  "freight_charge": 60000,
  "delay_hours": 2,
  "had_delays": true,
  "had_breakdown": false,
  "had_damage": false,
  "weather_condition": "Clear",
  "traffic_level": "Moderate"
}
```

4. Click "Execute"

**Expected Response**:
```json
{
  "success": true,
  "message": "Historical shipment data recorded successfully",
  "shipment_ref": "SHP-2024-001",
  "total_historical_shipments": 1,
  "model_status": "Need 49 more for training"
}
```

✅ **Pass**: Data saved successfully

**Repeat this test 49 more times** with different data to enable ML training!

---

### Test 8: View Analytics

1. Find `GET /analytics/dashboard`
2. Click "Try it out"
3. Keep default period: `30d`
4. Click "Execute"

**Expected Response**:
```json
{
  "period": "30d",
  "total_shipments": 1,
  "total_distance_km": 1420.00,
  "total_cargo_tons": 15.00,
  "total_cost": 44300.00,
  "total_revenue": 60000.00,
  "profit": 15700.00,
  "profit_margin_percentage": 26.17,
  "avg_cost_per_shipment": 44300.00,
  "on_time_delivery_rate": 0.00,
  "avg_delay_hours": 2.00,
  "incident_rate": 0.00,
  "cost_trend": "Stable",
  "volume_trend": "Growing"
}
```

✅ **Pass**: Analytics calculated correctly

---

### Test 9: Train ML Model (After 50 Historical Shipments)

1. Submit 50 historical shipments (use Test 7, change shipment_ref each time)
2. Find `POST /ml/train`
3. Click "Try it out"
4. Click "Execute"

**Expected Response** (if you have 50+ shipments):
```json
{
  "success": true,
  "message": "ML models trained successfully",
  "metrics": {
    "samples": 50,
    "train_r2": 0.92,
    "test_r2": 0.85,
    "train_rmse": 2345.67,
    "test_rmse": 3456.78,
    "test_mae": 2100.50
  }
}
```

**Expected Response** (if < 50 shipments):
```json
{
  "success": false,
  "message": "Insufficient data for training. Have 10, need 50.",
  "recommendation": "Continue submitting historical shipment data"
}
```

✅ **Pass**: Model training works

---

## Testing Without API Keys

If you don't have Google Maps or Weather API keys yet:

**What Will Happen**:
- Routes will use fallback distances (estimated)
- Weather will use generic conditions
- Costs will still be calculated
- System will still work!

**What Won't Work**:
- Accurate route distances
- Real-time weather impact
- Multiple alternative routes from Google

**Recommendation**: Get API keys for full functionality

---

## Test Results Checklist

After completing all tests:

- [ ] Health check passes
- [ ] Can register new company
- [ ] Can login successfully
- [ ] Can get profile data
- [ ] Can plan shipment (gets 3 routes)
- [ ] Cost estimates look reasonable
- [ ] Risk assessment provided
- [ ] Can submit historical data
- [ ] Analytics dashboard works
- [ ] ML training works (after 50 shipments)

If all checked: **✅ Backend is fully functional!**

---

## Common Test Failures

### Error: "Could not validate credentials"
**Fix**: Click "Authorize" button and enter your access_token

### Error: "Email already registered"
**Fix**: Use a different email or login instead

### Error: "Shipment planning failed"
**Possible Causes**:
1. Google Maps API key missing → Check .env file
2. API key invalid → Verify in Google Cloud Console
3. API quota exceeded → Check your Google Cloud billing

**Workaround**: System will use fallback calculations

### Error: "Insufficient data for training"
**Fix**: Submit at least 50 historical shipments first

### Error: "Database locked"
**Fix**:
```bash
# Stop uvicorn
# Delete database
rm logistics.db  # Mac/Linux
del logistics.db  # Windows

# Recreate
python -c "from app.models.database import init_db; init_db()"
```

---

## Performance Benchmarks

Expected response times:

- Health check: < 50ms
- Register/Login: < 200ms
- Get profile: < 100ms
- Plan shipment (no API keys): < 500ms
- Plan shipment (with API keys): < 5 seconds
- Historical data submit: < 200ms
- Analytics: < 500ms
- ML training: 5-30 seconds

If slower: Check for API timeouts or database issues

---

## Advanced Testing

### Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Co","email":"test@test.com","password":"Test123","company_type":"Both"}'

# Login and save token
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@test.com&password=Test123" | jq -r '.access_token')

# Plan shipment
curl -X POST http://localhost:8000/shipments/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @shipment_request.json
```

### Using Python

```python
import requests

BASE_URL = "http://localhost:8000"

# Register
response = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Test Logistics",
    "email": "test@example.com",
    "password": "Test123456",
    "company_type": "Both"
})
token = response.json()["access_token"]

# Plan shipment
headers = {"Authorization": f"Bearer {token}"}
shipment = {
    "origin_city": "Mumbai, Maharashtra",
    "destination_city": "Delhi, Delhi",
    "transport_mode": "Road",
    "vehicle_type": "Heavy Truck (16-25T)",
    "cargo_type": "Electronics",
    "cargo_weight_tons": 15,
    "cargo_value": 5000000,
    "is_fragile": True,
    "pickup_datetime": "2025-11-05T08:00:00",
    "prefer_fastest": True
}

response = requests.post(
    f"{BASE_URL}/shipments/plan", 
    json=shipment, 
    headers=headers
)
print(response.json())
```

---

## Next Steps After Testing

1. ✅ Backend works → **Build frontend UI**
2. ✅ APIs respond → **Get real API keys**
3. ✅ Tests pass → **Collect historical data**
4. ✅ 50+ shipments → **Train ML models**
5. ✅ Models trained → **Start using predictions**
6. ✅ System validated → **Deploy to production**

---

**Happy Testing! 🧪**
