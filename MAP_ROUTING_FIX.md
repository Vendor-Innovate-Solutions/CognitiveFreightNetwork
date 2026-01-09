# Map Routing Fix - Summary

## Issues Fixed

### 1. Delhi Location Showing Wrong Place (USA instead of India)
**Problem:** When searching for "Delhi", the geocoding API was sometimes returning Delhi, USA instead of Delhi, India.

**Solution:**
- Added hardcoded coordinate cache for 30+ major Indian cities in frontend
- Updated geocoding API calls to include India bias (`proximity` and `country=IN` parameters)
- Fixed all Delhi coordinates from incorrect (28.7041, 77.1025) to correct (28.6139, 77.2090)
- Applied fixes to both frontend and backend geocoding functions

### 2. Routes Showing Straight Lines Instead of Roads
**Problem:** Routes were displaying as straight lines (great circle paths) instead of following actual road networks.

**Solution:**
- Increased distance threshold from 500km to 1500km for using Mapbox Directions API
- This ensures most Indian routes use actual road paths instead of straight lines
- Routes > 1500km (e.g., intercontinental) still use great circle for ocean freight

### 3. Paths Not Precise/Realistic
**Problem:** Routes didn't follow intermediate cities and waypoints properly.

**Solution:**
- Updated `fetchDetailedRoutesForShipment` to geocode all intermediate cities
- Routes now include proper waypoints through major cities (e.g., Delhi → Gwalior → Indore → Mumbai)
- Mapbox Directions API generates realistic paths along actual highways

## Files Modified

### Frontend
1. **src/lib/mapbox-geocoding.ts**
   - Added `INDIAN_CITY_COORDINATES` cache with 30+ major cities
   - Updated `geocodeCity()` to check cache first
   - Added India proximity bias (78.9629°E, 20.5937°N) and `country=IN` filter
   - Increased distance threshold from 500km to 1500km
   - Improved coordinate accuracy for Delhi and other cities

2. **src/app/dashboard/page.tsx**
   - Fixed Delhi fallback coordinates (28.6139, 77.2090)
   - Updated `fetchDetailedRoutesForShipment()` to include waypoints
   - Routes now geocode intermediate cities and pass them as waypoints to Mapbox API
   - Added logging for route generation debugging

### Backend
3. **backend/app/services/external_apis.py**
   - Fixed Delhi coordinates in `_get_fallback_coordinates()` method
   - Added "new delhi" entry to coordinates dictionary
   - Updated from (28.7041, 77.1025) to (28.6139, 77.2090)

4. **backend/app/services/multi_modal_router.py**
   - Updated `geocode_location()` to include India bias
   - Added `proximity` parameter for Indian coordinates
   - Added `country=IN` filter to prioritize Indian locations
   - Increased limit to 5 results and filter for India-based features
   - Added comment for Delhi Airport coordinates

5. **backend/app/services/google_maps_service.py**
   - Already had India bias (", India" appended to city names)
   - No changes needed

## Testing Recommendations

1. **Test Delhi Routes:**
   - Create a shipment from Mumbai to Delhi
   - Verify Delhi appears in India (not USA)
   - Check that route follows highways (NH48, etc.)

2. **Test Waypoint Routes:**
   - Long routes (e.g., Mumbai to Kolkata) should show intermediate cities
   - Verify path follows actual road network
   - Check route doesn't cut through impossible terrain

3. **Test Distance Threshold:**
   - Routes < 1500km should use Mapbox Directions (realistic paths)
   - Routes > 1500km (international) should use great circle (straight lines for sea/air)

4. **Test Map Display:**
   - Zoom into India region and verify routes follow roads
   - Check that paths don't disappear or show incorrect locations
   - Verify markers are placed correctly on map

## Technical Details

### Coordinate Accuracy
- **Old Delhi coordinates:** 28.7041°N, 77.1025°E (incorrectly in western Delhi/Haryana border)
- **New Delhi coordinates:** 28.6139°N, 77.2090°E (correct city center - Connaught Place area)

### Geocoding Priority
1. Check hardcoded city cache (instant, accurate)
2. Query Mapbox API with India bias
3. Filter results to prefer Indian locations
4. Fallback to first result if no India match

### Route Generation Flow
1. Get origin and destination cities
2. Look up intermediate cities from route connections
3. Geocode all cities (origin, waypoints, destination)
4. Call Mapbox Directions API with waypoints
5. Receive detailed geometry with road-following path
6. Display on map with proper styling

## Benefits

✅ **Accurate Location Identification:** Delhi and other Indian cities now map to correct locations  
✅ **Realistic Road Paths:** Routes follow actual highways and roads, not straight lines  
✅ **Better User Experience:** Users see practical routes they can actually travel  
✅ **Improved Distance/Time Estimates:** Real road distances give better cost/time predictions  
✅ **Cached Performance:** Hardcoded coordinates reduce API calls and improve speed  

## Future Enhancements

- Add more Indian cities to coordinate cache (tier-2, tier-3 cities)
- Implement route optimization API for better waypoint ordering
- Add traffic-aware routing with real-time data
- Cache geocoding results in localStorage for better performance
- Add route alternatives (fastest, shortest, cheapest)
