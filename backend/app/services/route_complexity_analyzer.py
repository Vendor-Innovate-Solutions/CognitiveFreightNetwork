"""
Advanced Route Complexity Analyzer for Multi-Modal Transport
Data Science-driven approach to calculate realistic ETAs and Costs

Features:
1. Topography Analysis - Mountain/terrain penalties  
2. Border Crossing Detection - Customs delay modeling
3. Port Efficiency Database - Dwell time by port congestion
4. Urban Congestion - City size impact on truck speeds
5. Seasonal Factors - Weather/monsoon impacts
6. Distance-based Complexity - Non-linear scaling

Author: Supply Chain Data Science Team
Version: 2.0 - Professional Grade
"""

import math
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
from geopy.distance import geodesic


@dataclass
class ComplexityPenalties:
    """Penalties calculated for a route segment"""
    terrain_multiplier: float  # 1.0 = flat, 0.6 = mountainous (60% of normal speed)
    border_delay_hours: float  # Customs clearance time
    port_dwell_hours: float  # Port congestion dwell time
    congestion_multiplier: float  # Urban traffic factor
    seasonal_multiplier: float  # Weather/season impact
    distance_complexity_factor: float  # Long-distance efficiency loss
    
    # Explanations for transparency
    terrain_reason: str
    border_reason: str
    port_reason: str
    congestion_reason: str
    seasonal_reason: str


class RouteComplexityAnalyzer:
    """
    Professional-grade route complexity analyzer
    Transforms linear cost/time calculations into realistic estimates
    """
    
    def __init__(self):
        """Initialize with real-world data tables"""
        
        # ===== PORT EFFICIENCY DATABASE =====
        # Based on: Container dwell time studies, port congestion indices
        # Source: World Bank Port Performance Indicators
        self.PORT_EFFICIENCY = {
            # Format: "Port Name": (avg_dwell_hours, efficiency_score, congestion_level)
            
            # Major Asian Ports
            "Shanghai Port": (48, 0.75, "high"),  # World's busiest, 48h dwell
            "Singapore Port": (24, 0.95, "medium"),  # Efficient, well-managed
            "Ningbo-Zhoushan Port": (36, 0.80, "high"),
            "Shenzhen Port": (40, 0.78, "high"),
            "Busan Port": (30, 0.85, "medium"),
            "Hong Kong Port": (32, 0.82, "medium"),
            "Guangzhou Port": (38, 0.76, "high"),
            "Qingdao Port": (36, 0.79, "high"),
            "Tianjin Port": (42, 0.74, "high"),
            "Port Klang": (28, 0.86, "medium"),
            
            # Indian Ports
            "Jawaharlal Nehru Port Trust (JNPT)": (72, 0.65, "very_high"),  # Mumbai's main port
            "Chennai Port": (60, 0.70, "high"),
            "Visakhapatnam Port": (54, 0.72, "high"),
            "Kolkata Port": (66, 0.68, "high"),
            "Cochin Port": (48, 0.75, "high"),
            "Tuticorin Port": (50, 0.73, "high"),
            "Paradip Port": (52, 0.71, "high"),
            "Mundra Port": (44, 0.76, "high"),  # Private, more efficient
            "Haldia Port": (58, 0.69, "high"),
            "Ennore Port": (56, 0.70, "high"),
            
            # US Ports
            "Port of Los Angeles": (60, 0.68, "very_high"),  # Congested
            "Port of Long Beach": (58, 0.70, "very_high"),
            "Port of New York and New Jersey": (54, 0.72, "high"),
            "Port of Savannah": (36, 0.82, "medium"),
            "Port of Houston": (42, 0.77, "high"),
            "Port of Seattle": (38, 0.79, "medium"),
            "Port of Oakland": (48, 0.74, "high"),
            "Port of Charleston": (34, 0.83, "medium"),
            "Port of Virginia": (36, 0.81, "medium"),
            "Port of Tacoma": (40, 0.78, "medium"),
            
            # European Ports
            "Port of Rotterdam": (24, 0.92, "low"),  # Very efficient
            "Port of Antwerp": (28, 0.88, "low"),
            "Port of Hamburg": (32, 0.85, "medium"),
            "Port of Valencia": (30, 0.86, "medium"),
            "Port of Felixstowe": (36, 0.81, "medium"),
            "Port of Piraeus": (40, 0.78, "medium"),
            "Port of Algeciras": (28, 0.87, "low"),
            
            # Middle East Ports
            "Port of Jebel Ali": (26, 0.89, "low"),  # Dubai, very efficient
            "Port of Salalah": (30, 0.86, "medium"),
            "Port of Doha": (32, 0.84, "medium"),
            
            # African Ports
            "Port of Durban": (48, 0.74, "high"),
            "Port of Lagos": (72, 0.62, "very_high"),  # Highly congested
            "Port of Mombasa": (60, 0.68, "high"),
            
            # Default for unlisted ports
            "DEFAULT": (36, 0.78, "medium"),
        }
        
        # ===== BORDER CROSSING DATABASE =====
        # Based on: World Bank Logistics Performance Index, Trading Across Borders data
        self.BORDER_CROSSING_DELAYS = {
            # Border Type: (avg_delay_hours, variability_factor)
            "india_bangladesh": (12, 1.5),  # High documentation burden
            "india_pakistan": (24, 2.0),  # Complex relations, strict checks
            "india_nepal": (6, 1.2),  # Relatively smooth
            "india_china": (18, 1.8),  # Limited crossings, strict
            "india_myanmar": (14, 1.6),  # Developing infrastructure
            "india_sri_lanka": (8, 1.3),  # Sea route, moderate
            
            "usa_canada": (3, 1.1),  # USMCA agreement, efficient
            "usa_mexico": (6, 1.4),  # USMCA, but more checks
            "eu_internal": (1, 1.05),  # Schengen, minimal delays
            "eu_uk": (4, 1.3),  # Post-Brexit checks
            "eu_turkey": (8, 1.5),  # Customs union, but checks
            
            "china_vietnam": (10, 1.5),
            "china_russia": (12, 1.6),
            "china_kazakhstan": (14, 1.7),
            
            "singapore_malaysia": (2, 1.1),  # Efficient land link
            
            # Default for unlisted borders
            "default_same_region": (6, 1.3),  # Same region, moderate
            "default_different_region": (12, 1.6),  # Different regions, complex
        }
        
        # ===== SEASONAL IMPACT FACTORS =====
        self.SEASONAL_FACTORS = {
            # Month: (weather_factor, description)
            # Indian Context: Monsoon season (Jun-Sep) impacts significantly
            1: (1.0, "Winter - Good conditions"),
            2: (1.0, "Winter - Good conditions"),
            3: (1.05, "Pre-monsoon - Warm"),
            4: (1.10, "Pre-monsoon - Hot"),
            5: (1.15, "Pre-monsoon - Very hot"),
            6: (1.30, "Monsoon - Heavy rains"),
            7: (1.35, "Monsoon - Peak rainfall"),
            8: (1.30, "Monsoon - Heavy rains"),
            9: (1.20, "Post-monsoon - Floods risk"),
            10: (1.05, "Post-monsoon - Clearing"),
            11: (1.0, "Winter - Good conditions"),
            12: (1.0, "Winter - Good conditions"),
        }
    
    def _detect_border_crossing(
        self, 
        origin_country: str, 
        dest_country: str
    ) -> Tuple[float, str]:
        """
        Detect if route crosses border and calculate delay
        
        Returns:
            (delay_hours, explanation)
        """
        if origin_country.lower() == dest_country.lower():
            return 0.0, "Domestic route - No border crossing"
        
        # Create border key (alphabetical order for consistency)
        countries = sorted([origin_country.lower(), dest_country.lower()])
        border_key = f"{countries[0]}_{countries[1]}"
        
        # Check specific border
        if border_key in self.BORDER_CROSSING_DELAYS:
            delay, variability = self.BORDER_CROSSING_DELAYS[border_key]
            # Add random variability (for now, use average)
            actual_delay = delay * variability * 0.8  # 80% of max variability
            return actual_delay, f"Border crossing {origin_country}-{dest_country}: {actual_delay:.1f}h customs clearance"
        
        # Check if same region (heuristic: both in Asia, both in Europe, etc.)
        same_region = self._are_countries_same_region(origin_country, dest_country)
        
        if same_region:
            delay, variability = self.BORDER_CROSSING_DELAYS["default_same_region"]
        else:
            delay, variability = self.BORDER_CROSSING_DELAYS["default_different_region"]
        
        actual_delay = delay * variability * 0.8
        return actual_delay, f"International border crossing: {actual_delay:.1f}h estimated clearance"
    
    def _are_countries_same_region(self, country1: str, country2: str) -> bool:
        """Heuristic to determine if countries are in same region"""
        asian_countries = {"india", "china", "japan", "singapore", "malaysia", "thailand", 
                          "vietnam", "indonesia", "philippines", "bangladesh", "pakistan",
                          "nepal", "myanmar", "sri lanka", "south korea", "taiwan"}
        european_countries = {"uk", "france", "germany", "italy", "spain", "netherlands",
                            "belgium", "poland", "portugal", "greece", "austria", "switzerland",
                            "sweden", "norway", "denmark", "finland", "ireland"}
        north_american = {"usa", "united states", "canada", "mexico"}
        south_american = {"brazil", "argentina", "chile", "peru", "colombia", "venezuela"}
        middle_eastern = {"uae", "saudi arabia", "qatar", "oman", "kuwait", "bahrain", "iran"}
        african_countries = {"south africa", "nigeria", "egypt", "kenya", "ghana", "morocco"}
        
        c1, c2 = country1.lower(), country2.lower()
        
        regions = [asian_countries, european_countries, north_american, 
                  south_american, middle_eastern, african_countries]
        
        for region in regions:
            if c1 in region and c2 in region:
                return True
        
        return False
    
    def _calculate_terrain_penalty(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        transport_mode: str
    ) -> Tuple[float, float, str]:
        """
        Calculate terrain-based penalties using heuristics
        
        Real implementation would use Mapbox Elevation API:
        https://docs.mapbox.com/api/maps/elevation/
        
        Returns:
            (speed_multiplier, cost_multiplier, explanation)
        """
        # Only apply to truck/rail (not air/ship)
        if transport_mode not in ["truck", "rail"]:
            return 1.0, 1.0, "Air/Sea transport unaffected by terrain"
        
        # Calculate route midpoint
        mid_lat = (origin_lat + dest_lat) / 2
        mid_lon = (origin_lon + dest_lon) / 2
        
        # Elevation change heuristic (based on latitude ranges)
        # Real system would query Mapbox Elevation API
        terrain_type = "flat"
        speed_mult = 1.0
        cost_mult = 1.0
        
        # Himalayan region (India, Nepal, Pakistan, China border)
        if (25 <= mid_lat <= 40) and (70 <= mid_lon <= 95):
            terrain_type = "mountainous"
            speed_mult = 0.60  # 40% slower
            cost_mult = 1.40  # 40% more fuel
        
        # Western Ghats (India west coast)
        elif (8 <= mid_lat <= 21) and (73 <= mid_lon <= 77):
            terrain_type = "hilly"
            speed_mult = 0.75
            cost_mult = 1.25
        
        # Eastern Ghats (India east coast)
        elif (11 <= mid_lat <= 22) and (78 <= mid_lon <= 87):
            terrain_type = "hilly"
            speed_mult = 0.80
            cost_mult = 1.20
        
        # Rocky Mountains (North America)
        elif (35 <= mid_lat <= 50) and (-115 <= mid_lon <= -105):
            terrain_type = "mountainous"
            speed_mult = 0.65
            cost_mult = 1.35
        
        # Andes (South America)
        elif (-35 <= mid_lat <= 10) and (-75 <= mid_lon <= -65):
            terrain_type = "mountainous"
            speed_mult = 0.60
            cost_mult = 1.40
        
        # Alps (Europe)
        elif (43 <= mid_lat <= 48) and (6 <= mid_lon <= 14):
            terrain_type = "mountainous"
            speed_mult = 0.65
            cost_mult = 1.35
        
        explanation = f"Terrain: {terrain_type} ({int((1-speed_mult)*100)}% slower, {int((cost_mult-1)*100)}% more expensive)"
        
        return speed_mult, cost_mult, explanation
    
    def _calculate_port_dwell_time(
        self,
        port_name: Optional[str],
        cargo_weight_tons: float
    ) -> Tuple[float, str]:
        """
        Calculate port dwell time based on congestion and cargo size
        
        Returns:
            (dwell_hours, explanation)
        """
        if not port_name:
            return 24.0, "Default port handling: 24h"
        
        # Look up port efficiency
        port_data = self.PORT_EFFICIENCY.get(port_name, self.PORT_EFFICIENCY["DEFAULT"])
        base_dwell, efficiency, congestion = port_data
        
        # Adjust for cargo size (larger cargo = more dwell time)
        size_factor = 1.0
        if cargo_weight_tons > 1000:
            size_factor = 1.3  # +30% for very large shipments
        elif cargo_weight_tons > 500:
            size_factor = 1.15  # +15% for large shipments
        
        actual_dwell = base_dwell * size_factor
        
        explanation = f"{port_name}: {actual_dwell:.0f}h dwell (congestion: {congestion}, efficiency: {efficiency:.0%})"
        
        return actual_dwell, explanation
    
    def _calculate_urban_congestion(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        transport_mode: str
    ) -> Tuple[float, str]:
        """
        Calculate urban congestion penalty for truck segments
        
        Returns:
            (speed_multiplier, explanation)
        """
        if transport_mode != "truck":
            return 1.0, "Non-truck transport unaffected by urban congestion"
        
        # Check if route passes through major cities
        # In real system, would use geocoding to identify cities along route
        
        # For now, apply moderate penalty if route is short (likely urban)
        distance = geodesic((origin_lat, origin_lon), (dest_lat, dest_lon)).kilometers
        
        if distance < 100:  # Urban/suburban route
            return 0.70, "Urban route: 30% speed reduction due to city traffic"
        elif distance < 300:  # Regional route, some urban
            return 0.85, "Semi-urban route: 15% speed reduction"
        else:  # Long-haul, mostly highways
            return 0.95, "Highway route: 5% speed reduction"
    
    def _get_seasonal_factor(self) -> Tuple[float, str]:
        """Get current seasonal impact factor"""
        current_month = datetime.now().month
        factor, description = self.SEASONAL_FACTORS[current_month]
        return factor, description
    
    def _calculate_distance_complexity(
        self,
        distance_km: float
    ) -> Tuple[float, str]:
        """
        Long distances have diminishing efficiency (driver fatigue, maintenance)
        
        Returns:
            (time_multiplier, explanation)
        """
        if distance_km < 500:
            return 1.0, "Short distance - No complexity penalty"
        elif distance_km < 1500:
            multiplier = 1.0 + (distance_km - 500) * 0.00005  # +5% per 1000km
            return multiplier, f"Medium distance: {int((multiplier-1)*100)}% efficiency loss"
        else:
            multiplier = 1.05 + (distance_km - 1500) * 0.0001  # +10% per 1000km after 1500km
            return multiplier, f"Long distance: {int((multiplier-1)*100)}% efficiency loss"
    
    def calculate_segment_penalties(
        self,
        origin_lat: float,
        origin_lon: float,
        origin_country: str,
        dest_lat: float,
        dest_lon: float,
        dest_country: str,
        transport_mode: str,
        distance_km: float,
        port_name: Optional[str] = None,
        cargo_weight_tons: float = 100
    ) -> ComplexityPenalties:
        """
        Master function: Calculate all complexity penalties for a route segment
        
        Returns:
            ComplexityPenalties object with all factors
        """
        # 1. Terrain Analysis
        terrain_speed_mult, terrain_cost_mult, terrain_exp = self._calculate_terrain_penalty(
            origin_lat, origin_lon, dest_lat, dest_lon, transport_mode
        )
        
        # 2. Border Crossing
        border_delay, border_exp = self._detect_border_crossing(origin_country, dest_country)
        
        # 3. Port Dwell Time
        port_dwell, port_exp = self._calculate_port_dwell_time(port_name, cargo_weight_tons)
        
        # 4. Urban Congestion
        congestion_mult, congestion_exp = self._calculate_urban_congestion(
            origin_lat, origin_lon, dest_lat, dest_lon, transport_mode
        )
        
        # 5. Seasonal Factors
        seasonal_mult, seasonal_exp = self._get_seasonal_factor()
        
        # 6. Distance Complexity
        distance_mult, distance_exp = self._calculate_distance_complexity(distance_km)
        
        return ComplexityPenalties(
            terrain_multiplier=terrain_speed_mult,
            border_delay_hours=border_delay,
            port_dwell_hours=port_dwell if transport_mode == "ship" else 0,
            congestion_multiplier=congestion_mult,
            seasonal_multiplier=seasonal_mult,
            distance_complexity_factor=distance_mult,
            terrain_reason=terrain_exp,
            border_reason=border_exp,
            port_reason=port_exp if transport_mode == "ship" else "Not applicable",
            congestion_reason=congestion_exp,
            seasonal_reason=seasonal_exp
        )
    
    def apply_penalties_to_segment(
        self,
        base_distance_km: float,
        base_cost_usd: float,
        base_duration_hours: float,
        penalties: ComplexityPenalties
    ) -> Tuple[float, float, str]:
        """
        Apply calculated penalties to base cost and duration
        
        Returns:
            (adjusted_cost, adjusted_duration, explanation)
        """
        # Cost adjustments
        adjusted_cost = base_cost_usd
        adjusted_cost *= (2.0 - penalties.terrain_multiplier)  # Terrain increases cost (inverse of speed mult)
        adjusted_cost *= penalties.seasonal_multiplier  # Weather increases cost
        
        # Duration adjustments
        adjusted_duration = base_duration_hours
        adjusted_duration /= penalties.terrain_multiplier  # Slower speed = more time
        adjusted_duration /= penalties.congestion_multiplier  # Congestion slows down
        adjusted_duration *= penalties.distance_complexity_factor  # Long routes less efficient
        adjusted_duration *= penalties.seasonal_multiplier  # Weather slows down
        adjusted_duration += penalties.border_delay_hours  # Add border crossing time
        adjusted_duration += penalties.port_dwell_hours  # Add port waiting time
        
        # Build explanation
        explanation_parts = []
        
        if penalties.terrain_multiplier < 1.0:
            explanation_parts.append(penalties.terrain_reason)
        
        if penalties.border_delay_hours > 0:
            explanation_parts.append(penalties.border_reason)
        
        if penalties.port_dwell_hours > 0:
            explanation_parts.append(penalties.port_reason)
        
        if penalties.congestion_multiplier < 1.0:
            explanation_parts.append(penalties.congestion_reason)
        
        if penalties.seasonal_multiplier > 1.0:
            explanation_parts.append(f"Season: {penalties.seasonal_reason}")
        
        if penalties.distance_complexity_factor > 1.0:
            explanation_parts.append(f"Distance complexity penalty applied")
        
        if not explanation_parts:
            explanation = "Ideal conditions - No penalties applied"
        else:
            # Safely calculate percentage increases with zero checks
            if base_cost_usd > 0:
                cost_increase = ((adjusted_cost / base_cost_usd) - 1) * 100
            else:
                cost_increase = 0
            
            if base_duration_hours > 0:
                time_increase = ((adjusted_duration / base_duration_hours) - 1) * 100
            else:
                time_increase = 0
            
            explanation = f"Adjusted: +{cost_increase:.0f}% cost, +{time_increase:.0f}% time. " + "; ".join(explanation_parts)
        
        return adjusted_cost, adjusted_duration, explanation
