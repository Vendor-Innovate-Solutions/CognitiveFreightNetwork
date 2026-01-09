import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import os
from functools import lru_cache
import json

from app.models.database import RouteCache, WeatherCache, SessionLocal


class GoogleMapsService:
    """Integration with Google Maps API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        self.base_url = "https://maps.googleapis.com/maps/api"
    
    def geocode_city(self, city_name: str) -> Tuple[float, float]:
        """Get latitude and longitude for a city"""
        
        url = f"{self.base_url}/geocode/json"
        params = {
            "address": city_name,
            "key": self.api_key,
            "region": "in"  # Prefer Indian results
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                location = data['results'][0]['geometry']['location']
                return location['lat'], location['lng']
            else:
                print(f"🚨 Geocoding API Error: {data.get('status')}")
                print(f"Error message: {data.get('error_message', 'No error message')}")
        else:
            print(f"🚨 Geocoding HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
        
        # Fallback to approximate coordinates for major cities
        return self._get_fallback_coordinates(city_name)
    
    def get_route_info(
        self,
        origin: str,
        destination: str,
        waypoints: Optional[List[str]] = None,
        avoid_tolls: bool = False,
        use_cache: bool = True
    ) -> Dict:
        """Get route information from Google Maps Directions API"""
        
        # Check cache first
        if use_cache:
            cached = self._get_cached_route(origin, destination)
            if cached:
                return cached
        
        url = f"{self.base_url}/directions/json"
        
        params = {
            "origin": origin,
            "destination": destination,
            "key": self.api_key,
            "mode": "driving",
            "region": "in",
            "alternatives": "true",  # Get alternative routes
            "units": "metric"
        }
        
        if waypoints:
            params["waypoints"] = "|".join(waypoints)
        
        if avoid_tolls:
            params["avoid"] = "tolls"
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            print(f"🚨 Google Maps API HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            raise Exception(f"Google Maps API error: {response.status_code}")
        
        data = response.json()
        
        if data['status'] != 'OK':
            print(f"🚨 Google Maps API Status Error: {data.get('status')}")
            print(f"Error message: {data.get('error_message', 'No error message')}")
            print(f"Full response: {data}")
            raise Exception(f"Google Maps error: {data.get('status')} - {data.get('error_message', 'No details')}")
        
        # Parse routes
        routes = []
        for route_data in data['routes']:
            route = self._parse_route(route_data)
            routes.append(route)
        
        # Cache the primary route
        if use_cache and routes:
            self._cache_route(origin, destination, routes[0])
        
        return {
            "routes": routes,
            "status": "success"
        }
    
    def _parse_route(self, route_data: Dict) -> Dict:
        """Parse Google Maps route data"""
        
        leg = route_data['legs'][0]
        
        # Extract waypoints
        waypoints = []
        for step in leg['steps']:
            waypoints.append({
                "location": step['start_location'],
                "instruction": step.get('html_instructions', ''),
                "distance_m": step['distance']['value'],
                "duration_s": step['duration']['value']
            })
        
        return {
            "summary": route_data.get('summary', 'Route'),
            "distance_km": leg['distance']['value'] / 1000,
            "duration_hours": leg['duration']['value'] / 3600,
            "duration_in_traffic_hours": leg.get('duration_in_traffic', {}).get('value', leg['duration']['value']) / 3600,
            "start_address": leg['start_address'],
            "end_address": leg['end_address'],
            "waypoints": waypoints,
            "polyline": route_data['overview_polyline']['points']
        }
    
    def _get_cached_route(self, origin: str, destination: str) -> Optional[Dict]:
        """Get cached route if available and not expired"""
        
        db = SessionLocal()
        try:
            cache = db.query(RouteCache).filter(
                RouteCache.origin == origin,
                RouteCache.destination == destination,
                RouteCache.expires_at > datetime.utcnow()
            ).first()
            
            if cache:
                return {
                    "routes": [{
                        "distance_km": cache.distance_km,
                        "duration_hours": cache.duration_hours,
                        "waypoints": cache.waypoints,
                        "cached": True
                    }],
                    "status": "success"
                }
        finally:
            db.close()
        
        return None
    
    def _cache_route(self, origin: str, destination: str, route: Dict):
        """Cache route data"""
        
        db = SessionLocal()
        try:
            cache = RouteCache(
                origin=origin,
                destination=destination,
                distance_km=route['distance_km'],
                duration_hours=route['duration_hours'],
                route_geometry=route.get('polyline'),
                waypoints=route.get('waypoints'),
                expires_at=datetime.utcnow() + timedelta(days=30)
            )
            
            db.add(cache)
            db.commit()
        finally:
            db.close()
    
    def _get_fallback_coordinates(self, city_name: str) -> Tuple[float, float]:
        """Fallback coordinates for major Indian cities"""
        
        cities = {
            "mumbai": (19.0760, 72.8777),
            "delhi": (28.6139, 77.2090),  # Fixed: Delhi, India (not USA)
            "new delhi": (28.6139, 77.2090),
            "bangalore": (12.9716, 77.5946),
            "chennai": (13.0827, 80.2707),
            "kolkata": (22.5726, 88.3639),
            "hyderabad": (17.3850, 78.4867),
            "pune": (18.5204, 73.8567),
            "ahmedabad": (23.0225, 72.5714),
            "jaipur": (26.9124, 75.7873),
            "lucknow": (26.8467, 80.9462),
            "surat": (21.1702, 72.8311),
            "kanpur": (26.4499, 80.3319),
            "nagpur": (21.1458, 79.0882),
            "indore": (22.7196, 75.8577),
            "bhopal": (23.2599, 77.4126),
            "visakhapatnam": (17.6868, 83.2185),
            "vadodara": (22.3072, 73.1812),
            "guwahati": (26.1445, 91.7362)
        }
        
        city_key = city_name.lower().split(',')[0].strip()
        
        return cities.get(city_key, (20.5937, 78.9629))  # Center of India as default


class WeatherService:
    """Integration with Weather API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("WEATHER_API_KEY")
        self.base_url = "https://api.weatherapi.com/v1"
    
    def get_current_weather(self, city: str) -> Dict:
        """Get current weather for a city"""
        
        url = f"{self.base_url}/current.json"
        params = {
            "key": self.api_key,
            "q": city,
            "aqi": "no"
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            return {
                "city": city,
                "temperature_c": data['current']['temp_c'],
                "condition": data['current']['condition']['text'],
                "precipitation_mm": data['current']['precip_mm'],
                "wind_speed_kmh": data['current']['wind_kph'],
                "humidity": data['current']['humidity'],
                "updated_at": data['current']['last_updated']
            }
        
        return self._get_fallback_weather(city)
    
    def get_forecast(self, city: str, days: int = 7) -> List[Dict]:
        """Get weather forecast for upcoming days"""
        
        url = f"{self.base_url}/forecast.json"
        params = {
            "key": self.api_key,
            "q": city,
            "days": min(days, 10),  # API limit
            "aqi": "no"
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            forecasts = []
            for day_data in data['forecast']['forecastday']:
                forecasts.append({
                    "date": day_data['date'],
                    "temperature_c": day_data['day']['avgtemp_c'],
                    "condition": day_data['day']['condition']['text'],
                    "precipitation_mm": day_data['day']['totalprecip_mm'],
                    "max_wind_kmh": day_data['day']['maxwind_kph'],
                    "chance_of_rain": day_data['day']['daily_chance_of_rain']
                })
            
            return forecasts
        
        # Fallback to simple forecast
        return [self._get_fallback_weather(city) for _ in range(days)]
    
    def get_historical_weather(self, city: str, date: datetime) -> Dict:
        """Get historical weather data"""
        
        # Check cache first
        cached = self._get_cached_weather(city, date)
        if cached:
            return cached
        
        url = f"{self.base_url}/history.json"
        params = {
            "key": self.api_key,
            "q": city,
            "dt": date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            day_data = data['forecast']['forecastday'][0]['day']
            
            weather = {
                "city": city,
                "date": date,
                "temperature_c": day_data['avgtemp_c'],
                "condition": day_data['condition']['text'],
                "precipitation_mm": day_data['totalprecip_mm'],
                "wind_speed_kmh": day_data['maxwind_kph']
            }
            
            # Cache it
            self._cache_weather(weather)
            
            return weather
        
        return self._get_fallback_weather(city)
    
    def assess_weather_impact(self, weather_data: Dict) -> Dict:
        """Assess impact of weather on logistics"""
        
        condition = weather_data.get('condition', '').lower()
        precipitation = weather_data.get('precipitation_mm', 0)
        wind_speed = weather_data.get('wind_speed_kmh', 0)
        
        impact_score = 0
        impact_description = "Minimal"
        delay_factor = 1.0
        
        # Precipitation impact
        if precipitation > 50:
            impact_score += 0.4
            delay_factor += 0.3
        elif precipitation > 20:
            impact_score += 0.2
            delay_factor += 0.15
        
        # Condition impact
        severe_conditions = ['storm', 'heavy rain', 'thunderstorm', 'snow', 'fog']
        if any(cond in condition for cond in severe_conditions):
            impact_score += 0.3
            delay_factor += 0.2
        
        # Wind impact
        if wind_speed > 40:
            impact_score += 0.2
            delay_factor += 0.1
        
        # Determine impact level
        if impact_score > 0.5:
            impact_description = "Severe"
        elif impact_score > 0.3:
            impact_description = "Moderate"
        elif impact_score > 0.1:
            impact_description = "Minor"
        
        return {
            "impact_score": min(impact_score, 1.0),
            "impact_description": impact_description,
            "delay_factor": delay_factor,
            "recommendations": self._get_weather_recommendations(impact_description)
        }
    
    def _get_weather_recommendations(self, impact: str) -> List[str]:
        """Get recommendations based on weather impact"""
        
        if impact == "Severe":
            return [
                "Consider postponing shipment if possible",
                "Ensure cargo is waterproofed",
                "Add 30-40% buffer time",
                "Use experienced drivers only",
                "Monitor weather updates continuously"
            ]
        elif impact == "Moderate":
            return [
                "Add 15-20% buffer time",
                "Ensure proper cargo protection",
                "Brief driver on weather conditions",
                "Plan for potential delays"
            ]
        elif impact == "Minor":
            return [
                "Add 5-10% buffer time",
                "Standard precautions apply"
            ]
        else:
            return ["Normal weather conditions - proceed as planned"]
    
    def _get_cached_weather(self, city: str, date: datetime) -> Optional[Dict]:
        """Get cached weather data"""
        
        db = SessionLocal()
        try:
            cache = db.query(WeatherCache).filter(
                WeatherCache.city == city,
                WeatherCache.date == date.date()
            ).first()
            
            if cache:
                return {
                    "city": cache.city,
                    "date": cache.date,
                    "temperature_c": cache.temperature_c,
                    "condition": cache.weather_condition,
                    "precipitation_mm": cache.precipitation_mm,
                    "wind_speed_kmh": cache.wind_speed_kmh,
                    "cached": True
                }
        finally:
            db.close()
        
        return None
    
    def _cache_weather(self, weather_data: Dict):
        """Cache weather data"""
        
        db = SessionLocal()
        try:
            cache = WeatherCache(
                city=weather_data['city'],
                date=weather_data['date'],
                temperature_c=weather_data['temperature_c'],
                weather_condition=weather_data['condition'],
                precipitation_mm=weather_data['precipitation_mm'],
                wind_speed_kmh=weather_data['wind_speed_kmh']
            )
            
            db.add(cache)
            db.commit()
        finally:
            db.close()
    
    def _get_fallback_weather(self, city: str) -> Dict:
        """Fallback weather data"""
        
        return {
            "city": city,
            "temperature_c": 28.0,
            "condition": "Partly cloudy",
            "precipitation_mm": 0,
            "wind_speed_kmh": 15,
            "fallback": True
        }


class TrafficService:
    """Real-time traffic information service"""
    
    @staticmethod
    def get_traffic_level(hour: int, day_of_week: int) -> str:
        """Estimate traffic level based on time"""
        
        # Peak hours: 8-10 AM, 6-9 PM
        if hour in [8, 9, 10, 18, 19, 20, 21]:
            return "High"
        elif hour in [7, 11, 17, 22]:
            return "Moderate"
        else:
            return "Low"
    
    @staticmethod
    def estimate_traffic_delay(distance_km: float, traffic_level: str) -> float:
        """Estimate delay due to traffic (in hours)"""
        
        delay_factors = {
            "Low": 0.05,
            "Moderate": 0.15,
            "High": 0.30
        }
        
        base_delay = distance_km * delay_factors.get(traffic_level, 0.1) / 100
        
        return base_delay
