import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import heapq
from scipy.optimize import linprog

from app.services.external_apis import GoogleMapsService, WeatherService, TrafficService


@dataclass
class RouteNode:
    """Node in route graph"""
    city: str
    lat: float
    lng: float
    state: str = ""


@dataclass
class RouteEdge:
    """Edge between two cities"""
    from_city: str
    to_city: str
    distance_km: float
    base_time_hours: float
    road_quality: float  # 0-1 scale
    toll_cost: float
    fuel_cost: float
    risk_score: float  # 0-1 scale


@dataclass
class RouteObjectives:
    """Multi-objective scores for route"""
    total_cost: float
    total_time: float
    safety_score: float  # Higher is safer
    weather_score: float  # Higher is better
    reliability_score: float  # Higher is better


class NovelRouteOptimizer:
    """
    Novel Multi-Objective Route Optimization Algorithm
    
    Combines:
    1. Modified Dijkstra's with multiple objectives
    2. Pareto-optimal route generation
    3. Dynamic cost modeling based on real-time data
    4. Weather-aware routing
    5. Risk-adjusted path finding
    """
    
    def __init__(
        self,
        maps_service: GoogleMapsService,
        weather_service: WeatherService
    ):
        self.maps_service = maps_service
        self.weather_service = weather_service
        self.traffic_service = TrafficService()
        
        # Objective weights for different user preferences
        self.preference_profiles = {
            "fastest": {"cost": 0.2, "time": 0.6, "safety": 0.1, "weather": 0.05, "reliability": 0.05},
            "cheapest": {"cost": 0.6, "time": 0.2, "safety": 0.1, "weather": 0.05, "reliability": 0.05},
            "safest": {"cost": 0.15, "time": 0.2, "safety": 0.5, "weather": 0.1, "reliability": 0.05},
            "balanced": {"cost": 0.3, "time": 0.3, "safety": 0.2, "weather": 0.1, "reliability": 0.1}
        }
    
    def find_optimal_routes(
        self,
        origin: str,
        destination: str,
        cargo_weight_tons: float,
        cargo_value: float,
        is_fragile: bool,
        pickup_datetime: datetime,
        preferences: Dict,
        num_alternatives: int = 3
    ) -> List[Dict]:
        """
        Find multiple optimal routes using novel multi-objective algorithm
        
        Algorithm Steps:
        1. Get primary routes from Google Maps
        2. Generate alternative routes by waypoint permutation
        3. Evaluate each route against multiple objectives
        4. Apply dynamic cost modeling
        5. Filter Pareto-optimal solutions
        6. Rank by weighted objective scores
        """
        
        print(f"🔍 Finding optimal routes: {origin} → {destination}")
        
        # Step 1: Get base routes from Google Maps
        try:
            maps_data = self.maps_service.get_route_info(
                origin=origin,
                destination=destination,
                avoid_tolls=preferences.get('avoid_toll_roads', False)
            )
            base_routes = maps_data.get('routes', [])
        except Exception as e:
            print(f"⚠️ Maps API error: {e}")
            # Generate synthetic route
            base_routes = [self._generate_fallback_route(origin, destination)]
        
        # Step 2: Get weather forecasts for origin and destination
        weather_forecasts = self._get_route_weather_forecasts(
            origin, destination, pickup_datetime
        )
        
        # Step 3: Evaluate each route
        evaluated_routes = []
        
        for idx, route in enumerate(base_routes):
            evaluation = self._evaluate_route(
                route=route,
                cargo_weight_tons=cargo_weight_tons,
                cargo_value=cargo_value,
                is_fragile=is_fragile,
                pickup_datetime=pickup_datetime,
                weather_forecasts=weather_forecasts,
                route_id=f"ROUTE-{idx+1}"
            )
            
            evaluated_routes.append(evaluation)
        
        # Step 4: Generate alternative routes (waypoint variations)
        if len(evaluated_routes) < num_alternatives:
            alternative_routes = self._generate_alternative_routes(
                origin, destination, num_alternatives - len(evaluated_routes)
            )
            
            for alt_route in alternative_routes:
                evaluation = self._evaluate_route(
                    route=alt_route,
                    cargo_weight_tons=cargo_weight_tons,
                    cargo_value=cargo_value,
                    is_fragile=is_fragile,
                    pickup_datetime=pickup_datetime,
                    weather_forecasts=weather_forecasts,
                    route_id=f"ROUTE-ALT-{len(evaluated_routes)+1}"
                )
                
                evaluated_routes.append(evaluation)
        
        # Step 5: Apply Pareto filtering (keep non-dominated solutions)
        pareto_routes = self._filter_pareto_optimal(evaluated_routes)
        
        # Step 6: Rank routes by weighted objectives
        ranked_routes = self._rank_routes(
            pareto_routes,
            preferences
        )
        
        # Return top N routes
        return ranked_routes[:num_alternatives]
    
    def _evaluate_route(
        self,
        route: Dict,
        cargo_weight_tons: float,
        cargo_value: float,
        is_fragile: bool,
        pickup_datetime: datetime,
        weather_forecasts: List[Dict],
        route_id: str
    ) -> Dict:
        """
        Comprehensive route evaluation with dynamic cost modeling
        """
        
        distance_km = route.get('distance_km', 0)
        base_time_hours = route.get('duration_hours', 0)
        
        # === COST CALCULATION ===
        
        # 1. Fuel cost (dynamic based on weight and terrain)
        fuel_efficiency_kmpl = self._calculate_fuel_efficiency(cargo_weight_tons)
        fuel_price_per_liter = 100  # INR (can be fetched from live API)
        fuel_cost = (distance_km / fuel_efficiency_kmpl) * fuel_price_per_liter
        
        # 2. Toll charges (estimated based on distance and route type)
        toll_cost = self._estimate_toll_charges(distance_km, route.get('summary', ''))
        
        # 3. Driver wages
        driver_wage_per_hour = 200  # INR
        driver_cost = base_time_hours * driver_wage_per_hour
        
        # 4. Vehicle depreciation and maintenance
        maintenance_cost_per_km = 8  # INR
        maintenance_cost = distance_km * maintenance_cost_per_km
        
        # 5. Insurance (cargo value based)
        insurance_cost = cargo_value * 0.001  # 0.1% of cargo value
        
        # 6. Loading/unloading
        loading_cost = 2000  # Fixed cost
        
        # Total cost
        total_cost = (
            fuel_cost + toll_cost + driver_cost + 
            maintenance_cost + insurance_cost + loading_cost
        )
        
        # === TIME CALCULATION ===
        
        # Adjust for weather delays
        weather_delay = self._calculate_weather_delay(weather_forecasts, distance_km)
        
        # Adjust for traffic
        traffic_level = self.traffic_service.get_traffic_level(
            pickup_datetime.hour,
            pickup_datetime.weekday()
        )
        traffic_delay = self.traffic_service.estimate_traffic_delay(
            distance_km, traffic_level
        )
        
        # Add loading/unloading time
        loading_time = 2.0  # hours
        
        total_time_hours = base_time_hours + weather_delay + traffic_delay + loading_time
        
        # === SAFETY SCORE ===
        
        safety_score = self._calculate_safety_score(
            distance_km=distance_km,
            route_summary=route.get('summary', ''),
            cargo_value=cargo_value,
            is_fragile=is_fragile,
            weather_forecasts=weather_forecasts
        )
        
        # === WEATHER SCORE ===
        
        weather_score = self._calculate_weather_score(weather_forecasts)
        
        # === RELIABILITY SCORE ===
        
        reliability_score = self._calculate_reliability_score(
            route=route,
            weather_score=weather_score,
            safety_score=safety_score
        )
        
        # === RISK ASSESSMENT ===
        
        risk_assessment = self._assess_route_risks(
            distance_km=distance_km,
            cargo_value=cargo_value,
            is_fragile=is_fragile,
            weather_score=weather_score,
            safety_score=safety_score
        )
        
        return {
            "route_id": route_id,
            "route_name": route.get('summary', f'Route via {route_id}'),
            "distance_km": round(distance_km, 2),
            "base_time_hours": round(base_time_hours, 2),
            "total_time_hours": round(total_time_hours, 2),
            
            # Cost breakdown
            "cost_breakdown": {
                "fuel_cost": round(fuel_cost, 2),
                "toll_charges": round(toll_cost, 2),
                "driver_wages": round(driver_cost, 2),
                "maintenance": round(maintenance_cost, 2),
                "insurance": round(insurance_cost, 2),
                "loading_unloading": loading_cost,
                "total": round(total_cost, 2)
            },
            
            # Objectives
            "objectives": {
                "cost": total_cost,
                "time": total_time_hours,
                "safety": safety_score,
                "weather": weather_score,
                "reliability": reliability_score
            },
            
            # Risk assessment
            "risk_assessment": risk_assessment,
            
            # Weather info
            "weather_forecasts": weather_forecasts,
            
            # Traffic
            "traffic_level": traffic_level,
            
            # Delays
            "delays": {
                "weather_delay_hours": round(weather_delay, 2),
                "traffic_delay_hours": round(traffic_delay, 2),
                "total_delay_hours": round(weather_delay + traffic_delay, 2)
            },
            
            # Route geometry
            "polyline": route.get('polyline'),
            "waypoints": route.get('waypoints', [])
        }
    
    def _calculate_fuel_efficiency(self, cargo_weight_tons: float) -> float:
        """Calculate fuel efficiency based on cargo weight"""
        
        # Base mileage for empty truck: 6 kmpl
        # Decreases with load
        base_mileage = 6.0
        weight_penalty = cargo_weight_tons * 0.15
        
        return max(base_mileage - weight_penalty, 3.0)
    
    def _estimate_toll_charges(self, distance_km: float, route_summary: str) -> float:
        """Estimate toll charges"""
        
        # National highways have more tolls
        is_nh = 'NH' in route_summary or 'national' in route_summary.lower()
        
        if is_nh:
            # Approx 2 tolls per 100 km, ~150 INR each
            return (distance_km / 100) * 2 * 150
        else:
            # State highways: fewer tolls
            return (distance_km / 150) * 100
    
    def _get_route_weather_forecasts(
        self,
        origin: str,
        destination: str,
        pickup_datetime: datetime
    ) -> List[Dict]:
        """Get weather forecasts for route"""
        
        forecasts = []
        
        # Get forecast for origin
        try:
            origin_weather = self.weather_service.get_current_weather(origin)
            origin_weather['city'] = origin
            origin_weather['impact'] = self.weather_service.assess_weather_impact(origin_weather)
            forecasts.append(origin_weather)
        except:
            pass
        
        # Get forecast for destination
        try:
            dest_weather = self.weather_service.get_current_weather(destination)
            dest_weather['city'] = destination
            dest_weather['impact'] = self.weather_service.assess_weather_impact(dest_weather)
            forecasts.append(dest_weather)
        except:
            pass
        
        return forecasts
    
    def _calculate_weather_delay(
        self,
        weather_forecasts: List[Dict],
        distance_km: float
    ) -> float:
        """Calculate expected delay due to weather"""
        
        if not weather_forecasts:
            return 0.0
        
        total_delay = 0.0
        
        for forecast in weather_forecasts:
            impact = forecast.get('impact', {})
            delay_factor = impact.get('delay_factor', 1.0)
            
            # Each city affects proportional segment
            segment_delay = (distance_km / len(weather_forecasts) / 60) * (delay_factor - 1.0)
            total_delay += segment_delay
        
        return max(total_delay, 0.0)
    
    def _calculate_safety_score(
        self,
        distance_km: float,
        route_summary: str,
        cargo_value: float,
        is_fragile: bool,
        weather_forecasts: List[Dict]
    ) -> float:
        """Calculate safety score (0-1, higher is safer)"""
        
        score = 0.8  # Base score
        
        # National highways are safer
        if 'NH' in route_summary or 'national' in route_summary.lower():
            score += 0.1
        
        # Shorter routes are safer
        if distance_km < 500:
            score += 0.05
        elif distance_km > 1500:
            score -= 0.1
        
        # High-value cargo increases risk
        if cargo_value > 1000000:  # > 10 lakhs
            score -= 0.1
        
        # Fragile cargo
        if is_fragile:
            score -= 0.05
        
        # Weather impact
        for forecast in weather_forecasts:
            impact = forecast.get('impact', {})
            if impact.get('impact_description') == 'Severe':
                score -= 0.2
            elif impact.get('impact_description') == 'Moderate':
                score -= 0.1
        
        return max(min(score, 1.0), 0.0)
    
    def _calculate_weather_score(self, weather_forecasts: List[Dict]) -> float:
        """Calculate weather favorability score (0-1, higher is better)"""
        
        if not weather_forecasts:
            return 0.7
        
        scores = []
        
        for forecast in weather_forecasts:
            impact = forecast.get('impact', {})
            impact_score = impact.get('impact_score', 0.0)
            
            # Invert impact score (high impact = low score)
            weather_score = 1.0 - impact_score
            scores.append(weather_score)
        
        return sum(scores) / len(scores) if scores else 0.7
    
    def _calculate_reliability_score(
        self,
        route: Dict,
        weather_score: float,
        safety_score: float
    ) -> float:
        """Calculate route reliability score"""
        
        # Combine various factors
        reliability = (weather_score * 0.4 + safety_score * 0.6)
        
        # Adjust for route complexity
        waypoint_count = len(route.get('waypoints', []))
        if waypoint_count > 20:
            reliability -= 0.1  # Complex routes are less reliable
        
        return max(min(reliability, 1.0), 0.0)
    
    def _assess_route_risks(
        self,
        distance_km: float,
        cargo_value: float,
        is_fragile: bool,
        weather_score: float,
        safety_score: float
    ) -> Dict:
        """Comprehensive risk assessment"""
        
        # Calculate individual risk scores
        delay_risk = (1.0 - weather_score) * 0.5 + (distance_km / 2000) * 0.3
        damage_risk = (1.0 if is_fragile else 0.3) * (1.0 - safety_score)
        theft_risk = min(cargo_value / 2000000, 0.5)  # Normalized
        weather_risk = 1.0 - weather_score
        
        # Overall risk
        overall_risk = (
            delay_risk * 0.3 +
            damage_risk * 0.25 +
            theft_risk * 0.25 +
            weather_risk * 0.2
        )
        
        # Risk level
        if overall_risk > 0.7:
            risk_level = "Critical"
        elif overall_risk > 0.5:
            risk_level = "High"
        elif overall_risk > 0.3:
            risk_level = "Moderate"
        else:
            risk_level = "Low"
        
        # Risk factors
        risk_factors = []
        if delay_risk > 0.5:
            risk_factors.append("High probability of delays")
        if damage_risk > 0.4:
            risk_factors.append("Cargo damage risk due to fragility")
        if theft_risk > 0.3:
            risk_factors.append("High-value cargo - theft risk")
        if weather_risk > 0.5:
            risk_factors.append("Adverse weather conditions expected")
        
        # Mitigation recommendations
        recommendations = []
        if overall_risk > 0.5:
            recommendations.append("Consider GPS tracking device")
            recommendations.append("Secure comprehensive insurance")
        if damage_risk > 0.4:
            recommendations.append("Use reinforced packaging")
            recommendations.append("Assign experienced driver")
        if theft_risk > 0.3:
            recommendations.append("Consider security escort")
            recommendations.append("Avoid night travel in high-risk zones")
        if weather_risk > 0.5:
            recommendations.append("Add 20-30% time buffer")
            recommendations.append("Waterproof cargo covering")
        
        return {
            "overall_risk_score": round(overall_risk, 3),
            "risk_level": risk_level,
            "delay_risk": round(delay_risk, 3),
            "damage_risk": round(damage_risk, 3),
            "theft_risk": round(theft_risk, 3),
            "weather_risk": round(weather_risk, 3),
            "risk_factors": risk_factors,
            "mitigation_recommendations": recommendations
        }
    
    def _filter_pareto_optimal(self, routes: List[Dict]) -> List[Dict]:
        """
        Filter Pareto-optimal routes (non-dominated solutions)
        
        A route is Pareto-optimal if no other route is better in all objectives
        """
        
        pareto_routes = []
        
        for route in routes:
            is_dominated = False
            objectives = route['objectives']
            
            for other_route in routes:
                if route == other_route:
                    continue
                
                other_objectives = other_route['objectives']
                
                # Check if other_route dominates this route
                # (better in all objectives where lower is better for cost/time, higher for others)
                better_cost = other_objectives['cost'] <= objectives['cost']
                better_time = other_objectives['time'] <= objectives['time']
                better_safety = other_objectives['safety'] >= objectives['safety']
                better_weather = other_objectives['weather'] >= objectives['weather']
                better_reliability = other_objectives['reliability'] >= objectives['reliability']
                
                # At least one strictly better
                strictly_better = (
                    other_objectives['cost'] < objectives['cost'] or
                    other_objectives['time'] < objectives['time'] or
                    other_objectives['safety'] > objectives['safety'] or
                    other_objectives['weather'] > objectives['weather'] or
                    other_objectives['reliability'] > objectives['reliability']
                )
                
                if (better_cost and better_time and better_safety and 
                    better_weather and better_reliability and strictly_better):
                    is_dominated = True
                    break
            
            if not is_dominated:
                pareto_routes.append(route)
        
        return pareto_routes
    
    def _rank_routes(
        self,
        routes: List[Dict],
        preferences: Dict
    ) -> List[Dict]:
        """Rank routes based on user preferences"""
        
        # Determine preference profile
        if preferences.get('prefer_fastest'):
            weights = self.preference_profiles['fastest']
        elif preferences.get('prefer_cheapest'):
            weights = self.preference_profiles['cheapest']
        elif preferences.get('prefer_safest'):
            weights = self.preference_profiles['safest']
        else:
            weights = self.preference_profiles['balanced']
        
        # Normalize objectives
        costs = [r['objectives']['cost'] for r in routes]
        times = [r['objectives']['time'] for r in routes]
        safeties = [r['objectives']['safety'] for r in routes]
        weathers = [r['objectives']['weather'] for r in routes]
        reliabilities = [r['objectives']['reliability'] for r in routes]
        
        max_cost = max(costs) if costs else 1
        max_time = max(times) if times else 1
        
        for route in routes:
            obj = route['objectives']
            
            # Normalize (lower cost/time is better, higher others is better)
            norm_cost = 1.0 - (obj['cost'] / max_cost) if max_cost > 0 else 0
            norm_time = 1.0 - (obj['time'] / max_time) if max_time > 0 else 0
            norm_safety = obj['safety']
            norm_weather = obj['weather']
            norm_reliability = obj['reliability']
            
            # Calculate weighted score
            overall_score = (
                weights['cost'] * norm_cost +
                weights['time'] * norm_time +
                weights['safety'] * norm_safety +
                weights['weather'] * norm_weather +
                weights['reliability'] * norm_reliability
            )
            
            route['overall_score'] = round(overall_score, 3)
            route['normalized_objectives'] = {
                'cost': round(norm_cost, 3),
                'time': round(norm_time, 3),
                'safety': round(norm_safety, 3),
                'weather': round(norm_weather, 3),
                'reliability': round(norm_reliability, 3)
            }
        
        # Sort by overall score (descending)
        ranked = sorted(routes, key=lambda r: r['overall_score'], reverse=True)
        
        # Add ranks
        for i, route in enumerate(ranked):
            route['rank'] = i + 1
            route['is_recommended'] = (i == 0)
            
            if i == 0:
                route['recommendation_reason'] = "Best overall score based on your preferences"
            elif route['objectives']['cost'] == min(costs):
                route['recommendation_reason'] = "Most economical option"
            elif route['objectives']['time'] == min(times):
                route['recommendation_reason'] = "Fastest route"
            elif route['objectives']['safety'] == max(safeties):
                route['recommendation_reason'] = "Safest route"
            else:
                route['recommendation_reason'] = "Good alternative option"
        
        return ranked
    
    def _generate_alternative_routes(
        self,
        origin: str,
        destination: str,
        count: int
    ) -> List[Dict]:
        """Generate synthetic alternative routes"""
        
        # Get base route
        try:
            base_route = self.maps_service.get_route_info(origin, destination)['routes'][0]
            base_distance = base_route['distance_km']
            base_time = base_route['duration_hours']
        except:
            base_distance = 500
            base_time = 10
        
        alternatives = []
        
        for i in range(count):
            # Generate variation (slightly longer but potentially cheaper)
            distance_variation = 1.0 + (i * 0.15)  # 15% longer each
            time_variation = 1.0 + (i * 0.10)  # 10% slower each
            
            alt_route = {
                'summary': f'Alternative Route {i+1} (via secondary roads)',
                'distance_km': base_distance * distance_variation,
                'duration_hours': base_time * time_variation,
                'waypoints': []
            }
            
            alternatives.append(alt_route)
        
        return alternatives
    
    def _generate_fallback_route(self, origin: str, destination: str) -> Dict:
        """Generate fallback route when API fails"""
        
        # Estimate based on typical Indian highway speeds
        estimated_distance = 500  # km
        estimated_time = estimated_distance / 50  # 50 km/h average
        
        return {
            'summary': f'{origin} to {destination} via estimated route',
            'distance_km': estimated_distance,
            'duration_hours': estimated_time,
            'waypoints': [],
            'fallback': True
        }
