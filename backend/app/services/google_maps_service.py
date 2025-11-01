"""
Google Maps integration for distance calculations
"""
import os
import aiohttp
from typing import List, Dict, Tuple
from fastapi import HTTPException

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

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
    
    # Process cities in pairs (origin -> destination for each segment)
    for i in range(len(cities) - 1):
        origin = f"{cities[i]}, India"
        destination = f"{cities[i + 1]}, India"
        
        try:
            result = await get_distance_matrix([origin], [destination])
            
            if result["rows"] and result["rows"][0]["elements"]:
                element = result["rows"][0]["elements"][0]
                
                if element["status"] == "OK":
                    # Distance in meters, convert to km
                    distance_m = element["distance"]["value"]
                    distance_km = distance_m / 1000
                    
                    # Duration in seconds, convert to minutes
                    duration_s = element["duration"]["value"]
                    duration_min = duration_s / 60
                    
                    total_distance += distance_km
                    total_duration += duration_min
                else:
                    # Fallback for segments that can't be calculated
                    print(f"Warning: Could not calculate distance from {origin} to {destination}")
                    
        except Exception as e:
            print(f"Error calculating distance from {origin} to {destination}: {e}")
            # Continue with next segment
            continue
    
    return int(total_distance), int(total_duration)

async def get_direct_distance(origin: str, destination: str) -> Tuple[int, int]:
    """
    Get direct distance between two cities
    Returns: (distance_in_km, duration_in_minutes)
    """
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
        print(f"Error calculating direct distance: {e}")
    
    # Fallback values if API fails
    return 500, 480  # 500km, 8 hours