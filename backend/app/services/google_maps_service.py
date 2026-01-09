"""
Google Maps integration for distance calculations
"""
import os
import math
import aiohttp
from typing import List, Dict, Tuple
from fastapi import HTTPException
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Geocoder for fallback distance calculation
_geocoder = Nominatim(user_agent="logistics_optimizer")

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in km"""
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def _geocode_city(city_name: str) -> Tuple[float, float]:
    """Get lat/lon for a city using Nominatim (free geocoding)"""
    try:
        location = _geocoder.geocode(f"{city_name}, India", timeout=10)
        if location:
            return location.latitude, location.longitude
    except GeocoderTimedOut:
        pass
    except Exception as e:
        print(f"Geocoding error for {city_name}: {e}")
    return None, None

async def get_distance_matrix(origins: List[str], destinations: List[str]) -> Dict:
    """
    Get distance matrix from Google Maps API
    """
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")
    
    origins_str = "|".join(origins)
    destinations_str = "|".join(destinations)
    
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origins_str,
        "destinations": destinations_str,
        "units": "metric",
        "mode": "driving",
        "key": GOOGLE_MAPS_API_KEY
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch distance data")
            
            data = await response.json()
            
            if data.get("status") != "OK":
                raise HTTPException(status_code=500, detail=f"Google Maps API error: {data.get('status')}")
            
            return data

async def calculate_route_distance(cities: List[str]) -> Tuple[int, int]:
    """
    Calculate total distance and duration for a route through multiple cities
    Returns: (distance_in_km, duration_in_minutes)
    """
    if len(cities) < 2:
        return 0, 0
    
    total_distance = 0
    total_duration = 0
    use_fallback = not GOOGLE_MAPS_API_KEY
    
    # Process cities in pairs (origin -> destination for each segment)
    for i in range(len(cities) - 1):
        origin_city = cities[i]
        dest_city = cities[i + 1]
        segment_distance = 0
        segment_duration = 0
        
        if not use_fallback:
            origin = f"{origin_city}, India"
            destination = f"{dest_city}, India"
            
            try:
                result = await get_distance_matrix([origin], [destination])
                
                if result["rows"] and result["rows"][0]["elements"]:
                    element = result["rows"][0]["elements"][0]
                    
                    if element["status"] == "OK":
                        # Distance in meters, convert to km
                        distance_m = element["distance"]["value"]
                        segment_distance = distance_m / 1000
                        
                        # Duration in seconds, convert to minutes
                        duration_s = element["duration"]["value"]
                        segment_duration = duration_s / 60
                    else:
                        use_fallback = True
                        
            except Exception as e:
                print(f"Error calculating distance from {origin} to {destination}: {e}")
                use_fallback = True
        
        # Fallback: Use geocoding + Haversine distance
        if use_fallback or segment_distance == 0:
            lat1, lon1 = _geocode_city(origin_city)
            lat2, lon2 = _geocode_city(dest_city)
            
            if lat1 and lon1 and lat2 and lon2:
                segment_distance = _haversine_distance(lat1, lon1, lat2, lon2)
                # Road distance is typically 1.3x straight-line distance
                segment_distance *= 1.3
                # Estimate 50 km/h average speed for India roads
                segment_duration = (segment_distance / 50) * 60
                print(f"📍 Fallback distance {origin_city} → {dest_city}: {segment_distance:.1f}km")
            else:
                # Last resort: estimate 200km per segment
                segment_distance = 200
                segment_duration = 240
                print(f"⚠️ Using default segment distance for {origin_city} → {dest_city}")
        
        total_distance += segment_distance
        total_duration += segment_duration
    
    print(f"🛣️ Route through {len(cities)} cities: {total_distance:.1f}km, {total_duration:.0f}min")
    return int(total_distance), int(total_duration)

async def get_direct_distance(origin: str, destination: str) -> Tuple[int, int]:
    """
    Get direct distance between two cities
    Returns: (distance_in_km, duration_in_minutes)
    """
    # Try Google Maps API first if configured
    if GOOGLE_MAPS_API_KEY:
        origin_full = f"{origin}, India"
        destination_full = f"{destination}, India"
        
        try:
            result = await get_distance_matrix([origin_full], [destination_full])
            
            if result["rows"] and result["rows"][0]["elements"]:
                element = result["rows"][0]["elements"][0]
                
                if element["status"] == "OK":
                    # Distance in meters, convert to km
                    distance_m = element["distance"]["value"]
                    distance_km = int(distance_m / 1000)
                    
                    # Duration in seconds, convert to minutes
                    duration_s = element["duration"]["value"]
                    duration_min = int(duration_s / 60)
                    
                    return distance_km, duration_min
        
        except Exception as e:
            print(f"Error calculating direct distance via Google Maps: {e}")
    
    # Fallback: Use geocoding + Haversine distance
    lat1, lon1 = _geocode_city(origin)
    lat2, lon2 = _geocode_city(destination)
    
    if lat1 and lon1 and lat2 and lon2:
        distance = _haversine_distance(lat1, lon1, lat2, lon2)
        # Road distance is typically 1.3x straight-line distance
        distance *= 1.3
        # Estimate 50 km/h average speed for India roads
        duration = (distance / 50) * 60
        print(f"📍 Direct distance (fallback) {origin} → {destination}: {distance:.1f}km, {duration:.0f}min")
        return int(distance), int(duration)
    
    # Last resort fallback
    print(f"⚠️ Using default distance for {origin} → {destination}")
    return 500, 480  # 500km, 8 hours