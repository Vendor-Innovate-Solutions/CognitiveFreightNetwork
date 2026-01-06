# Multi-Modal Transport Routing System

## Overview

The application now features an intelligent multi-modal transport routing system that automatically detects optimal transport modes and routes for shipments worldwide. **NO FALLBACKS** - the system returns detailed errors if routes cannot be calculated.

## Key Features

### 1. **Intelligent Transport Mode Detection**
- **Domestic Routes (<1500km)**: Direct truck transport
- **Domestic Routes (>1500km)**: Truck + Rail coordination (requires rail network integration)
- **International Routes**: Automatically selects:
  - **Sea Freight**: Standard for cross-border shipments
  - **Air Freight**: For urgent international shipments
  - **Ground Transport**: To/from ports and airports

### 2. **Automatic Port and Airport Detection**
- Identifies nearest seaports for international routes
- Selects optimal airports for urgent shipments
- Supports major ports worldwide:
  - India: Nhava Sheva, Mumbai Port, Chennai Port, Kolkata Port, Visakhapatnam Port, Cochin Port, Kandla Port
  - USA: Los Angeles, Long Beach, New York, Savannah
  - China: Shanghai, Shenzhen, Ningbo-Zhoushan
  - Singapore, UAE, UK, Germany

### 3. **Real-Time Route Calculation**
- Uses Mapbox Geocoding API for accurate city locations globally
- Uses Mapbox Directions API for turn-by-turn road routes
- Calculates sea and air freight distances with great circle distance
- NO hardcoded coordinates or distances

### 4. **Comprehensive Cost Analysis**
- Per-segment cost breakdown
- Transport mode-specific pricing:
  - Truck: $0.15/km/ton + $500 fixed
  - Rail: $0.08/km/ton + $1000 fixed
  - Ship: $0.03/km/ton + $2000 fixed
  - Air: $1.50/km/ton + $5000 fixed

### 5. **Production-Ready Error Handling**
- Returns specific error messages for:
  - Invalid location names
  - Locations that cannot be geocoded
  - Routes that cannot be calculated
  - Features not yet implemented
- UI displays errors prominently with actionable guidance

## Architecture

### Backend Components

#### `multi_modal_router.py`
Core routing engine with:
- `MultiModalRouter` class
- Transport mode detection logic
- Port and airport database
- Route planning algorithms
- Cost and duration calculations

**Key Methods:**
- `plan_route()`: Main entry point for route planning
- `geocode_location()`: Geocode city names using Mapbox
- `find_nearest_seaport()`: Locate optimal seaport
- `find_nearest_airport()`: Locate optimal airport
- `get_road_route()`: Calculate road routes using Mapbox Directions API

#### API Endpoint: `/api/route/multi-modal`
**Method:** POST  
**Parameters:**
- `origin` (str): Origin city name
- `destination` (str): Destination city name
- `cargo_weight_tons` (float): Cargo weight in tons
- `is_urgent` (bool): Whether shipment is urgent (enables air freight)
- `avoid_air` (bool): Disable air freight option

**Returns:**
```json
{
  "success": true,
  "route": {
    "segments": [
      {
        "segment_type": "origin_to_port",
        "transport_mode": "truck",
        "origin": {...},
        "destination": {...},
        "distance_km": 450.2,
        "duration_hours": 8.5,
        "cost_usd": 1250.00,
        "coordinates": [...],
        "description": "Ground transport to Nhava Sheva (JNPT)"
      }
    ],
    "total_distance_km": 8450.5,
    "total_duration_hours": 240.0,
    "total_cost_usd": 15000.00,
    "transport_modes_used": ["truck", "ship", "truck"],
    "transfer_points": [...],
    "route_description": "...",
    "is_international": true
  }
}
```

**Error Response:**
```json
{
  "detail": "Location 'XYZ' could not be found. Please check the spelling or provide a valid city name."
}
```

### Frontend Components

#### `multi-modal-api.ts`
TypeScript service for API integration:
- `planMultiModalRoute()`: Call backend API
- Helper functions for formatting (duration, cost, transport modes)
- Type definitions for route data

#### `MultiModalRouteCard.tsx`
React component displaying:
- Route summary (duration, distance, cost)
- Segment-by-segment breakdown with icons
- Transport mode indicators
- Transfer point visualization
- Loading and error states

#### Dashboard Integration
- Fetches multi-modal route when shipment is selected
- Displays route alongside map visualization
- Shows errors prominently without fallback data

## Environment Variables

### Backend (.env)
```bash
# Required
MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIi...
GOOGLE_MAPS_API_KEY=AIzaSy... (optional, for legacy features)

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cfn_database
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIi...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Installation & Setup

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**New dependency added:**
- `geopy==2.4.1` - Geographic calculations

### 2. Configure Environment Variables
Create `backend/.env`:
```bash
MAPBOX_TOKEN=your_mapbox_token_here
MONGODB_URI=mongodb://localhost:27017/cfn_database
```

### 3. Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
```

## Usage Examples

### Example 1: Domestic Route (Mumbai to Delhi)
```python
# Backend
origin = "Mumbai"
destination = "Delhi"
cargo_weight_tons = 10
result = await router.plan_route(origin, destination, cargo_weight_tons)

# Result: Single truck segment, ~1400km, ~23 hours
```

### Example 2: International Route (Mumbai to New York)
```python
# Backend
origin = "Mumbai, India"
destination = "New York, USA"
cargo_weight_tons = 20
is_urgent = False
result = await router.plan_route(origin, destination, cargo_weight_tons, is_urgent)

# Result: 
# Segment 1: Truck (Mumbai → Nhava Sheva Port)
# Segment 2: Ship (Nhava Sheva → Port of New York)
# Segment 3: Truck (Port of New York → New York)
```

### Example 3: Urgent International Route
```python
# Backend
origin = "Mumbai, India"
destination = "London, UK"
cargo_weight_tons = 5
is_urgent = True  # Enable air freight
result = await router.plan_route(origin, destination, cargo_weight_tons, is_urgent)

# Result: Uses air freight instead of sea freight
# Segment 1: Truck (Mumbai → Mumbai Airport)
# Segment 2: Air (Mumbai Airport → Heathrow Airport)
# Segment 3: Truck (Heathrow → London)
```

## Error Handling

### User Input Errors (400)
- Invalid city names
- Locations that cannot be geocoded
- Example: "Location 'XYZ123' could not be found. Please check the spelling."

### Not Implemented (501)
- Long domestic routes requiring rail coordination
- Example: "Long domestic routes (>1500km) require rail network integration."

### Routing Errors (500)
- API failures
- Network connectivity issues
- Unexpected errors

## Testing

### Test Scenarios

1. **Domestic Short Route**
   - Origin: "Mumbai"
   - Destination: "Pune"
   - Expected: Single truck segment

2. **Domestic Long Route**
   - Origin: "Mumbai"
   - Destination: "Kolkata"
   - Expected: Error - requires rail integration

3. **International Sea Freight**
   - Origin: "Mumbai"
   - Destination: "Singapore"
   - Expected: Truck → Ship → Truck (3 segments)

4. **International Air Freight**
   - Origin: "Delhi"
   - Destination: "London"
   - is_urgent: true
   - Expected: Truck → Air → Truck (3 segments)

5. **Invalid Location**
   - Origin: "InvalidCity123"
   - Expected: 400 error with clear message

## Removed Features (Hardcoded Fallbacks)

The following have been **REMOVED** from the codebase:

1. ❌ Hardcoded city coordinates (fallbackCoords)
2. ❌ Default "500km" distance values
3. ❌ Mock route calculations using Haversine formula
4. ❌ Fallback weather data
5. ❌ Default cost estimates without real routing
6. ❌ Simplified 3-4 point interpolated routes

## Future Enhancements

### Phase 2 (Planned)
1. **Rail Network Integration**
   - Major rail routes database
   - Rail station identification
   - Container rail costs

2. **Real-Time Traffic Integration**
   - Live traffic data for road segments
   - Dynamic ETA adjustments

3. **Weather-Aware Routing**
   - Avoid routes with severe weather
   - Seasonal route optimization

4. **Multi-Objective Optimization**
   - Balance cost, time, and safety
   - Pareto-optimal route suggestions

5. **Customs and Border Crossing**
   - Estimate customs clearance times
   - Document requirements per country

6. **Carbon Footprint Tracking**
   - CO2 emissions per transport mode
   - Eco-friendly route alternatives

## API Rate Limits

- **Mapbox Geocoding**: 100,000 requests/month (free tier)
- **Mapbox Directions**: 100,000 requests/month (free tier)

Implement caching strategies for production:
- Cache geocoded city coordinates (7-day TTL)
- Cache frequently used routes (1-day TTL)

## Support

For issues or questions:
1. Check error messages in UI (they are descriptive)
2. Review backend logs for detailed errors
3. Verify environment variables are configured
4. Ensure Mapbox API token has required permissions

## License

Part of Cognitive Freight Network (CFN) - Intellecthon 2025
