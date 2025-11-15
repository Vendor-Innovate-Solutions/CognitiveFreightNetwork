"""
Multi-Modal Transport Router
Intelligently determines optimal transport modes and routes for domestic and international shipments
Supports: Road (Truck), Rail, Sea (Ship), Air
NO FALLBACKS - Raises errors if routes cannot be calculated

Features Advanced Complexity Analysis:
- Topography penalties (mountainous terrain)
- Border crossing delays
- Port efficiency & dwell time
- Urban congestion factors
- Seasonal impacts
"""

import os
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math
import aiohttp
from geopy.distance import geodesic
from .route_complexity_analyzer import RouteComplexityAnalyzer

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


class TransportMode(str, Enum):
    """Transport modes"""
    TRUCK = "truck"
    RAIL = "rail"
    SHIP = "ship"
    AIR = "air"


class SegmentType(str, Enum):
    """Route segment types"""
    ORIGIN_TO_PORT = "origin_to_port"
    PORT_TO_PORT = "port_to_port"
    PORT_TO_DESTINATION = "port_to_destination"
    DIRECT = "direct"
    RAIL_SEGMENT = "rail_segment"
    AIR_SEGMENT = "air_segment"


@dataclass
class Location:
    """Geographic location"""
    name: str
    latitude: float
    longitude: float
    country: str
    type: str  # 'city', 'seaport', 'airport', 'rail_station'


@dataclass
class RouteSegment:
    """Single segment of multi-modal route"""
    segment_type: SegmentType
    transport_mode: TransportMode
    origin: Location
    destination: Location
    distance_km: float
    duration_hours: float
    cost_usd: float
    coordinates: List[Dict[str, float]]  # Path coordinates
    description: str


@dataclass
class MultiModalRoute:
    """Complete multi-modal route"""
    segments: List[RouteSegment]
    total_distance_km: float
    total_duration_hours: float
    total_cost_usd: float
    transport_modes_used: List[TransportMode]
    transfer_points: List[Location]
    route_description: str
    is_international: bool


class MultiModalRouter:
    """
    Intelligent multi-modal transport router with advanced complexity analysis
    
    Determines optimal transport modes based on:
    - Distance & Geography (domestic vs international)
    - Available infrastructure (ports, airports)
    - Cost efficiency WITH real-world penalties
    - Time constraints WITH terrain/border/congestion factors
    
    New Features:
    - Topography-aware cost/time adjustments
    - Border crossing delay modeling
    - Port efficiency & dwell time calculation
    - Urban congestion penalties
    - Seasonal impact factors
    """
    
    def __init__(self):
        """Initialize router with complexity analyzer"""
        self.complexity_analyzer = RouteComplexityAnalyzer()
    
    # Major seaports worldwide
    MAJOR_SEAPORTS = {
        # India
        "Nhava Sheva": Location("Nhava Sheva (JNPT)", 18.9480, 72.9508, "India", "seaport"),
        "Mumbai Port": Location("Mumbai Port", 18.9642, 72.8374, "India", "seaport"),
        "Chennai Port": Location("Chennai Port", 13.0648, 80.2900, "India", "seaport"),
        "Kolkata Port": Location("Kolkata Port", 22.5560, 88.3330, "India", "seaport"),
        "Visakhapatnam Port": Location("Visakhapatnam Port", 17.6834, 83.2773, "India", "seaport"),
        "Cochin Port": Location("Cochin Port", 9.9648, 76.2622, "India", "seaport"),
        "Kandla Port": Location("Kandla Port", 23.0330, 70.2167, "India", "seaport"),
        
        # USA
        "Port of Los Angeles": Location("Port of Los Angeles", 33.7405, -118.2717, "USA", "seaport"),
        "Port of Long Beach": Location("Port of Long Beach", 33.7547, -118.1930, "USA", "seaport"),
        "Port of New York": Location("Port of New York", 40.6655, -74.0810, "USA", "seaport"),
        "Port of Savannah": Location("Port of Savannah", 32.0363, -81.1001, "USA", "seaport"),
        
        # China
        "Shanghai Port": Location("Shanghai Port", 31.2304, 121.4737, "China", "seaport"),
        "Shenzhen Port": Location("Shenzhen Port", 22.5431, 114.0579, "China", "seaport"),
        "Ningbo-Zhoushan Port": Location("Ningbo-Zhoushan Port", 29.8883, 121.5440, "China", "seaport"),
        
        # Singapore
        "Port of Singapore": Location("Port of Singapore", 1.2644, 103.8220, "Singapore", "seaport"),
        
        # UAE
        "Jebel Ali Port": Location("Jebel Ali Port", 25.0083, 55.0828, "UAE", "seaport"),
        
        # UK
        "Port of London": Location("Port of London", 51.4990, 0.0467, "UK", "seaport"),
        "Port of Southampton": Location("Port of Southampton", 50.8989, -1.3956, "UK", "seaport"),
        
        # Germany
        "Port of Hamburg": Location("Port of Hamburg", 53.5396, 9.9686, "Germany", "seaport"),
    }
    
    # Major international airports
    MAJOR_AIRPORTS = {
        # India
        "Mumbai Airport": Location("Chhatrapati Shivaji Int'l", 19.0896, 72.8656, "India", "airport"),
        "Delhi Airport": Location("Indira Gandhi Int'l", 28.5562, 77.1000, "India", "airport"),
        "Bangalore Airport": Location("Kempegowda Int'l", 13.1986, 77.7066, "India", "airport"),
        "Chennai Airport": Location("Chennai Int'l", 12.9941, 80.1709, "India", "airport"),
        "Kolkata Airport": Location("Netaji Subhas Chandra Bose Int'l", 22.6547, 88.4467, "India", "airport"),
        
        # USA
        "JFK Airport": Location("John F. Kennedy Int'l", 40.6413, -73.7781, "USA", "airport"),
        "LAX Airport": Location("Los Angeles Int'l", 33.9416, -118.4085, "USA", "airport"),
        
        # UK
        "Heathrow Airport": Location("London Heathrow", 51.4700, -0.4543, "UK", "airport"),
        
        # China
        "Beijing Airport": Location("Beijing Capital Int'l", 40.0799, 116.6031, "China", "airport"),
        "Shanghai Airport": Location("Shanghai Pudong Int'l", 31.1443, 121.8083, "China", "airport"),
        
        # Singapore
        "Changi Airport": Location("Singapore Changi", 1.3644, 103.9915, "Singapore", "airport"),
        
        # UAE
        "Dubai Airport": Location("Dubai Int'l", 25.2532, 55.3657, "UAE", "airport"),
    }
    
    # Transport mode thresholds and rules
    DISTANCE_THRESHOLDS = {
        "domestic_truck_max": 1500,  # km - Beyond this, consider rail
        "domestic_rail_optimal": 800,  # km - Optimal distance for rail
        "international_ship_min": 300,  # km - Minimum for sea freight
        "air_priority_distance": 3000,  # km - Air becomes viable for urgent shipments
    }
    
    # Cost per km per ton (USD)
    COST_PER_KM_TON = {
        TransportMode.TRUCK: 0.15,
        TransportMode.RAIL: 0.08,
        TransportMode.SHIP: 0.03,
        TransportMode.AIR: 1.50,
    }
    
    # Average speeds (km/h)
    AVERAGE_SPEEDS = {
        TransportMode.TRUCK: 60,
        TransportMode.RAIL: 80,
        TransportMode.SHIP: 35,  # ~19 knots
        TransportMode.AIR: 800,
    }
    
    async def geocode_location(self, location_name: str) -> Optional[Location]:
        """
        Geocode a location using Mapbox API
        Returns None if location cannot be found (NO FALLBACK)
        """
        if not MAPBOX_TOKEN:
            raise ValueError("MAPBOX_TOKEN not configured in environment")
        
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{location_name}.json"
        params = {
            "access_token": MAPBOX_TOKEN,
            "types": "place,locality,region,country",
            "limit": 1
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    raise Exception(f"Geocoding API failed for '{location_name}' with status {response.status}")
                
                data = await response.json()
                
                if not data.get("features"):
                    raise ValueError(f"Location '{location_name}' could not be found. Please check the spelling or provide a valid city name.")
                
                feature = data["features"][0]
                longitude, latitude = feature["center"]
                
                # Extract country
                country = ""
                for context in feature.get("context", []):
                    if context["id"].startswith("country"):
                        country = context["text"]
                        break
                
                return Location(
                    name=feature["text"],
                    latitude=latitude,
                    longitude=longitude,
                    country=country or "Unknown",
                    type="city"
                )
    
    def find_nearest_seaport(self, location: Location) -> Location:
        """Find nearest seaport to given location"""
        nearest_port = None
        min_distance = float('inf')
        
        for port in self.MAJOR_SEAPORTS.values():
            distance = geodesic(
                (location.latitude, location.longitude),
                (port.latitude, port.longitude)
            ).kilometers
            
            if distance < min_distance:
                min_distance = distance
                nearest_port = port
        
        if not nearest_port:
            raise Exception(f"No seaport found near {location.name}")
        
        return nearest_port
    
    def find_nearest_airport(self, location: Location) -> Location:
        """Find nearest major international airport"""
        # Filter airports by country for domestic preference
        country_airports = [
            airport for airport in self.MAJOR_AIRPORTS.values()
            if airport.country == location.country
        ]
        
        # If no airports in same country, use all airports
        airports_to_check = country_airports if country_airports else list(self.MAJOR_AIRPORTS.values())
        
        nearest_airport = None
        min_distance = float('inf')
        
        for airport in airports_to_check:
            distance = geodesic(
                (location.latitude, location.longitude),
                (airport.latitude, airport.longitude)
            ).kilometers
            
            if distance < min_distance:
                min_distance = distance
                nearest_airport = airport
        
        if not nearest_airport:
            raise Exception(f"No airport found near {location.name}")
        
        return nearest_airport
    
    def calculate_direct_distance(self, origin: Location, destination: Location) -> float:
        """Calculate great circle distance between two locations"""
        return geodesic(
            (origin.latitude, origin.longitude),
            (destination.latitude, destination.longitude)
        ).kilometers
    
    async def get_road_route(self, origin: Location, destination: Location) -> Tuple[float, float, List[Dict]]:
        """
        Get road route using Mapbox Directions API
        Returns: (distance_km, duration_hours, coordinates)
        Raises exception if route cannot be calculated
        """
        if not MAPBOX_TOKEN:
            raise ValueError("MAPBOX_TOKEN not configured")
        
        url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}"
        params = {
            "access_token": MAPBOX_TOKEN,
            "geometries": "geojson",
            "overview": "full"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    raise Exception(f"Road routing failed between {origin.name} and {destination.name}")
                
                data = await response.json()
                
                if not data.get("routes"):
                    raise ValueError(f"No road route found between {origin.name} and {destination.name}. These locations may not be connected by road.")
                
                route = data["routes"][0]
                distance_km = route["distance"] / 1000
                duration_hours = route["duration"] / 3600
                
                # Convert coordinates
                coordinates = [
                    {"latitude": coord[1], "longitude": coord[0]}
                    for coord in route["geometry"]["coordinates"]
                ]
                
                return distance_km, duration_hours, coordinates
    
    def calculate_segment_cost(
        self,
        distance_km: float,
        mode: TransportMode,
        cargo_weight_tons: float,
        origin_location: Optional[Location] = None,
        dest_location: Optional[Location] = None,
        port_name: Optional[str] = None
    ) -> Tuple[float, str]:
        """
        Calculate cost for a segment WITH complexity penalties
        
        Returns:
            (adjusted_cost, explanation)
        """
        # Base cost calculation (old linear method)
        base_cost = distance_km * self.COST_PER_KM_TON[mode] * cargo_weight_tons
        
        # Add fixed costs
        fixed_costs = {
            TransportMode.TRUCK: 500,
            TransportMode.RAIL: 1000,
            TransportMode.SHIP: 2000,
            TransportMode.AIR: 5000,
        }
        base_cost += fixed_costs[mode]
        
        # Apply complexity penalties if location data available
        if origin_location and dest_location:
            penalties = self.complexity_analyzer.calculate_segment_penalties(
                origin_lat=origin_location.latitude,
                origin_lon=origin_location.longitude,
                origin_country=origin_location.country,
                dest_lat=dest_location.latitude,
                dest_lon=dest_location.longitude,
                dest_country=dest_location.country,
                transport_mode=mode.value,
                distance_km=distance_km,
                port_name=port_name,
                cargo_weight_tons=cargo_weight_tons
            )
            
            adjusted_cost, _, explanation = self.complexity_analyzer.apply_penalties_to_segment(
                base_distance_km=distance_km,
                base_cost_usd=base_cost,
                base_duration_hours=0,  # We'll calculate duration separately
                penalties=penalties
            )
            
            return adjusted_cost, explanation
        
        return base_cost, "Base cost calculation (no complexity analysis)"
    
    def calculate_segment_duration(
        self,
        distance_km: float,
        mode: TransportMode,
        origin_location: Optional[Location] = None,
        dest_location: Optional[Location] = None,
        port_name: Optional[str] = None,
        cargo_weight_tons: float = 100,
        include_loading: bool = True
    ) -> Tuple[float, str]:
        """
        Calculate duration for a segment WITH complexity penalties
        
        Returns:
            (adjusted_duration_hours, explanation)
        """
        # Base travel time
        travel_time = distance_km / self.AVERAGE_SPEEDS[mode]
        
        # Add loading/unloading time
        if include_loading:
            loading_times = {
                TransportMode.TRUCK: 2,  # hours
                TransportMode.RAIL: 4,
                TransportMode.SHIP: 24,  # 1 day for loading/unloading
                TransportMode.AIR: 6,
            }
            travel_time += loading_times[mode]
        
        # Apply complexity penalties if location data available
        if origin_location and dest_location:
            penalties = self.complexity_analyzer.calculate_segment_penalties(
                origin_lat=origin_location.latitude,
                origin_lon=origin_location.longitude,
                origin_country=origin_location.country,
                dest_lat=dest_location.latitude,
                dest_lon=dest_location.longitude,
                dest_country=dest_location.country,
                transport_mode=mode.value,
                distance_km=distance_km,
                port_name=port_name,
                cargo_weight_tons=cargo_weight_tons
            )
            
            _, adjusted_duration, explanation = self.complexity_analyzer.apply_penalties_to_segment(
                base_distance_km=distance_km,
                base_cost_usd=0,  # We calculated cost separately
                base_duration_hours=travel_time,
                penalties=penalties
            )
            
            return adjusted_duration, explanation
        
        return travel_time, "Base duration calculation (no complexity analysis)"
    
    async def plan_route(
        self,
        origin_name: str,
        destination_name: str,
        cargo_weight_tons: float,
        is_urgent: bool = False,
        avoid_air: bool = False
    ) -> MultiModalRoute:
        """
        Plan optimal multi-modal route
        
        Rules:
        1. Domestic < 1500km: Truck only
        2. Domestic > 1500km: Truck + Rail
        3. International (same continent): Truck/Rail to port, Ship, Truck to destination
        4. International (different continent): Ship mandatory
        5. Urgent + International: Consider air freight
        
        NO FALLBACKS - Raises detailed errors if route cannot be planned
        """
        
        # Step 1: Geocode locations
        origin = await self.geocode_location(origin_name)
        destination = await self.geocode_location(destination_name)
        
        if not origin:
            raise ValueError(f"Origin location '{origin_name}' could not be geocoded. Please provide a valid city name.")
        
        if not destination:
            raise ValueError(f"Destination location '{destination_name}' could not be geocoded. Please provide a valid city name.")
        
        # Step 2: Determine if international
        is_international = origin.country != destination.country
        
        # Step 3: Calculate direct distance
        direct_distance = self.calculate_direct_distance(origin, destination)
        
        segments: List[RouteSegment] = []
        
        # Step 4: Route planning logic
        if not is_international:
            # === DOMESTIC ROUTING ===
            if direct_distance < self.DISTANCE_THRESHOLDS["domestic_truck_max"]:
                # Direct truck route
                try:
                    distance_km, duration_hours, coordinates = await self.get_road_route(origin, destination)
                    
                    # Apply complexity analysis
                    adj_cost, cost_explanation = self.calculate_segment_cost(
                        distance_km, TransportMode.TRUCK, cargo_weight_tons,
                        origin, destination
                    )
                    adj_duration, duration_explanation = self.calculate_segment_duration(
                        distance_km, TransportMode.TRUCK,
                        origin, destination, cargo_weight_tons=cargo_weight_tons
                    )
                    
                    segment = RouteSegment(
                        segment_type=SegmentType.DIRECT,
                        transport_mode=TransportMode.TRUCK,
                        origin=origin,
                        destination=destination,
                        distance_km=distance_km,
                        duration_hours=adj_duration,
                        cost_usd=adj_cost,
                        coordinates=coordinates,
                        description=f"Direct truck transport from {origin.name} to {destination.name}. {cost_explanation}"
                    )
                    segments.append(segment)
                    
                except Exception as e:
                    raise Exception(f"Failed to calculate road route: {str(e)}. Cannot proceed without valid routing data.")
            
            else:
                # Long domestic route - consider rail
                raise NotImplementedError(
                    f"Long domestic routes (>{self.DISTANCE_THRESHOLDS['domestic_truck_max']}km) require rail coordination. "
                    f"This feature requires rail network integration. Distance: {direct_distance:.0f}km"
                )
        
        else:
            # === INTERNATIONAL ROUTING ===
            
            # Check if air freight is needed (urgent) and allowed
            if is_urgent and not avoid_air and direct_distance > self.DISTANCE_THRESHOLDS["air_priority_distance"]:
                # Air freight route
                origin_airport = self.find_nearest_airport(origin)
                dest_airport = self.find_nearest_airport(destination)
                
                # Segment 1: Truck to origin airport
                try:
                    dist1, dur1, coords1 = await self.get_road_route(origin, origin_airport)
                    adj_cost1, cost_exp1 = self.calculate_segment_cost(
                        dist1, TransportMode.TRUCK, cargo_weight_tons, origin, origin_airport
                    )
                    adj_dur1, dur_exp1 = self.calculate_segment_duration(
                        dist1, TransportMode.TRUCK, origin, origin_airport, cargo_weight_tons=cargo_weight_tons
                    )
                    segments.append(RouteSegment(
                        segment_type=SegmentType.ORIGIN_TO_PORT,
                        transport_mode=TransportMode.TRUCK,
                        origin=origin,
                        destination=origin_airport,
                        distance_km=dist1,
                        duration_hours=adj_dur1,
                        cost_usd=adj_cost1,
                        coordinates=coords1,
                        description=f"Ground transport to {origin_airport.name}. {cost_exp1}"
                    ))
                except Exception as e:
                    raise Exception(f"Cannot route to origin airport: {str(e)}")
                
                # Segment 2: Air freight
                air_distance = self.calculate_direct_distance(origin_airport, dest_airport)
                adj_air_cost, air_cost_exp = self.calculate_segment_cost(
                    air_distance, TransportMode.AIR, cargo_weight_tons, origin_airport, dest_airport
                )
                adj_air_dur, air_dur_exp = self.calculate_segment_duration(
                    air_distance, TransportMode.AIR, origin_airport, dest_airport, cargo_weight_tons=cargo_weight_tons
                )
                
                segments.append(RouteSegment(
                    segment_type=SegmentType.AIR_SEGMENT,
                    transport_mode=TransportMode.AIR,
                    origin=origin_airport,
                    destination=dest_airport,
                    distance_km=air_distance,
                    duration_hours=adj_air_dur,
                    cost_usd=adj_air_cost,
                    coordinates=[
                        {"latitude": origin_airport.latitude, "longitude": origin_airport.longitude},
                        {"latitude": dest_airport.latitude, "longitude": dest_airport.longitude}
                    ],
                    description=f"Air freight from {origin_airport.name} to {dest_airport.name}. {air_cost_exp}"
                ))
                
                # Segment 3: Truck from dest airport
                try:
                    dist3, dur3, coords3 = await self.get_road_route(dest_airport, destination)
                    adj_cost3, cost_exp3 = self.calculate_segment_cost(
                        dist3, TransportMode.TRUCK, cargo_weight_tons, dest_airport, destination
                    )
                    adj_dur3, dur_exp3 = self.calculate_segment_duration(
                        dist3, TransportMode.TRUCK, dest_airport, destination, cargo_weight_tons=cargo_weight_tons
                    )
                    segments.append(RouteSegment(
                        segment_type=SegmentType.PORT_TO_DESTINATION,
                        transport_mode=TransportMode.TRUCK,
                        origin=dest_airport,
                        destination=destination,
                        distance_km=dist3,
                        duration_hours=adj_dur3,
                        cost_usd=adj_cost3,
                        coordinates=coords3,
                        description=f"Ground transport to {destination.name}. {cost_exp3}"
                    ))
                except Exception as e:
                    raise Exception(f"Cannot route from destination airport: {str(e)}")
            
            else:
                # Sea freight route (standard international)
                origin_port = self.find_nearest_seaport(origin)
                dest_port = self.find_nearest_seaport(destination)
                
                # Segment 1: Truck to origin port
                try:
                    dist1, dur1, coords1 = await self.get_road_route(origin, origin_port)
                    adj_cost1, cost_exp1 = self.calculate_segment_cost(
                        dist1, TransportMode.TRUCK, cargo_weight_tons, origin, origin_port
                    )
                    adj_dur1, dur_exp1 = self.calculate_segment_duration(
                        dist1, TransportMode.TRUCK, origin, origin_port, cargo_weight_tons=cargo_weight_tons
                    )
                    segments.append(RouteSegment(
                        segment_type=SegmentType.ORIGIN_TO_PORT,
                        transport_mode=TransportMode.TRUCK,
                        origin=origin,
                        destination=origin_port,
                        distance_km=dist1,
                        duration_hours=adj_dur1,
                        cost_usd=adj_cost1,
                        coordinates=coords1,
                        description=f"Ground transport to {origin_port.name}. {cost_exp1}"
                    ))
                except Exception as e:
                    raise Exception(f"Cannot route to origin port {origin_port.name}: {str(e)}")
                
                # Segment 2: Sea freight (with port efficiency analysis)
                sea_distance = self.calculate_direct_distance(origin_port, dest_port)
                adj_sea_cost, sea_cost_exp = self.calculate_segment_cost(
                    sea_distance, TransportMode.SHIP, cargo_weight_tons,
                    origin_port, dest_port, port_name=dest_port.name
                )
                adj_sea_dur, sea_dur_exp = self.calculate_segment_duration(
                    sea_distance, TransportMode.SHIP,
                    origin_port, dest_port, port_name=dest_port.name, cargo_weight_tons=cargo_weight_tons
                )
                
                segments.append(RouteSegment(
                    segment_type=SegmentType.PORT_TO_PORT,
                    transport_mode=TransportMode.SHIP,
                    origin=origin_port,
                    destination=dest_port,
                    distance_km=sea_distance,
                    duration_hours=adj_sea_dur,
                    cost_usd=adj_sea_cost,
                    coordinates=[
                        {"latitude": origin_port.latitude, "longitude": origin_port.longitude},
                        {"latitude": dest_port.latitude, "longitude": dest_port.longitude}
                    ],
                    description=f"Sea freight from {origin_port.name} to {dest_port.name}. {sea_dur_exp}"
                ))
                
                # Segment 3: Truck from dest port
                try:
                    dist3, dur3, coords3 = await self.get_road_route(dest_port, destination)
                    adj_cost3, cost_exp3 = self.calculate_segment_cost(
                        dist3, TransportMode.TRUCK, cargo_weight_tons, dest_port, destination
                    )
                    adj_dur3, dur_exp3 = self.calculate_segment_duration(
                        dist3, TransportMode.TRUCK, dest_port, destination, cargo_weight_tons=cargo_weight_tons
                    )
                    segments.append(RouteSegment(
                        segment_type=SegmentType.PORT_TO_DESTINATION,
                        transport_mode=TransportMode.TRUCK,
                        origin=dest_port,
                        destination=destination,
                        distance_km=dist3,
                        duration_hours=adj_dur3,
                        cost_usd=adj_cost3,
                        coordinates=coords3,
                        description=f"Ground transport to {destination.name}. {cost_exp3}"
                    ))
                except Exception as e:
                    raise Exception(f"Cannot route from destination port {dest_port.name}: {str(e)}")
        
        # Calculate totals
        total_distance = sum(seg.distance_km for seg in segments)
        total_duration = sum(seg.duration_hours for seg in segments)
        total_cost = sum(seg.cost_usd for seg in segments)
        
        modes_used = list(set(seg.transport_mode for seg in segments))
        transfer_points = []
        for i in range(len(segments) - 1):
            if segments[i].destination != segments[i + 1].origin:
                transfer_points.append(segments[i].destination)
            else:
                transfer_points.append(segments[i].destination)
        
        # Generate route description
        mode_descriptions = {
            TransportMode.TRUCK: "Ground Transport",
            TransportMode.RAIL: "Rail Freight",
            TransportMode.SHIP: "Sea Freight",
            TransportMode.AIR: "Air Freight"
        }
        
        route_desc = " → ".join([
            f"{mode_descriptions[seg.transport_mode]} ({seg.origin.name} to {seg.destination.name})"
            for seg in segments
        ])
        
        return MultiModalRoute(
            segments=segments,
            total_distance_km=round(total_distance, 2),
            total_duration_hours=round(total_duration, 2),
            total_cost_usd=round(total_cost, 2),
            transport_modes_used=modes_used,
            transfer_points=transfer_points,
            route_description=route_desc,
            is_international=is_international
        )
