"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/cfn-api";
import RouteSimulatorMap from "@/components/dashboard/RouteSimulatorMap";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { geocodeCity, getDetailedRoute, geocodeCities } from "@/lib/mapbox-geocoding";
import { SimulationData, Route, RouteEvent } from "@/types/route";
import { planMultiModalRoute, type MultiModalRoute, type RouteError } from "@/lib/multi-modal-api";
import MultiModalRouteCard from "@/components/dashboard/MultiModalRouteCard";

// Route distance response from backend
interface RouteDistanceData {
  direct_distance_km: number;
  direct_duration_min: number;
  optimized_distance_km: number;
  optimized_duration_min: number;
  savings_distance_km: number;
  savings_duration_min: number;
}

interface Analytics {
  total_shipments: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
  profit_margin_percentage: number;
  avg_cost_per_shipment: number;
  on_time_delivery_rate: number;
  avg_delay_hours: number;
  incident_rate: number;
  period: string;
}

interface Shipment {
  _id: string;
  shipment_ref: string;
  status: string;
  origin_city: string;
  destination_city: string;
  cargo_type: string;
  cargo_weight_tons: number;
  transport_mode: string;
  vehicle_type: string;
  pickup_datetime: string;
  actual_delivery_datetime?: string;
  total_cost?: number;
  predicted_cost?: number;
  freight_charge?: number;
  distance_km: number;
  delay_hours?: number;
  created_at: string;
  cargo_value?: number;
  is_fragile?: boolean;
  is_perishable?: boolean;
  requires_refrigeration?: boolean;
  predicted_time_hours?: number;
  risk_score?: number;
}

// Function to get cities along route path
const getRouteCities = (originCity: string, destinationCity: string): string[] => {
  // Define major route connections between Indian cities
  const routeConnections: Record<string, Record<string, string[]>> = {
    "Mumbai": {
      "Delhi": ["Mumbai", "Nashik", "Indore", "Gwalior", "Delhi"],
      "Bangalore": ["Mumbai", "Pune", "Solapur", "Hubli", "Bangalore"],
      "Chennai": ["Mumbai", "Pune", "Hyderabad", "Chennai"],
      "Kolkata": ["Mumbai", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Mumbai", "Pune", "Solapur", "Hyderabad"],
      "Pune": ["Mumbai", "Pune"],
      "Ahmedabad": ["Mumbai", "Ahmedabad"],
      "Jaipur": ["Mumbai", "Indore", "Kota", "Jaipur"],
      "Surat": ["Mumbai", "Surat"]
    },
    "Delhi": {
      "Mumbai": ["Delhi", "Gwalior", "Indore", "Nashik", "Mumbai"],
      "Bangalore": ["Delhi", "Gwalior", "Nagpur", "Hyderabad", "Bangalore"],
      "Chennai": ["Delhi", "Gwalior", "Nagpur", "Hyderabad", "Chennai"],
      "Kolkata": ["Delhi", "Agra", "Kanpur", "Allahabad", "Varanasi", "Patna", "Kolkata"],
      "Hyderabad": ["Delhi", "Gwalior", "Nagpur", "Hyderabad"],
      "Pune": ["Delhi", "Gwalior", "Indore", "Mumbai", "Pune"],
      "Ahmedabad": ["Delhi", "Jaipur", "Ajmer", "Udaipur", "Ahmedabad"],
      "Jaipur": ["Delhi", "Jaipur"],
      "Surat": ["Delhi", "Jaipur", "Ahmedabad", "Surat"]
    },
    "Bangalore": {
      "Mumbai": ["Bangalore", "Hubli", "Solapur", "Pune", "Mumbai"],
      "Delhi": ["Bangalore", "Hyderabad", "Nagpur", "Gwalior", "Delhi"],
      "Chennai": ["Bangalore", "Hosur", "Chennai"],
      "Kolkata": ["Bangalore", "Hyderabad", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Bangalore", "Anantapur", "Hyderabad"],
      "Pune": ["Bangalore", "Hubli", "Solapur", "Pune"],
      "Ahmedabad": ["Bangalore", "Hubli", "Mumbai", "Ahmedabad"],
      "Jaipur": ["Bangalore", "Hyderabad", "Nagpur", "Gwalior", "Delhi", "Jaipur"],
      "Surat": ["Bangalore", "Hubli", "Mumbai", "Surat"]
    },
    "Chennai": {
      "Mumbai": ["Chennai", "Hyderabad", "Pune", "Mumbai"],
      "Delhi": ["Chennai", "Hyderabad", "Nagpur", "Gwalior", "Delhi"],
      "Bangalore": ["Chennai", "Hosur", "Bangalore"],
      "Kolkata": ["Chennai", "Hyderabad", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Chennai", "Hyderabad"],
      "Pune": ["Chennai", "Hyderabad", "Pune"],
      "Ahmedabad": ["Chennai", "Hyderabad", "Mumbai", "Ahmedabad"],
      "Jaipur": ["Chennai", "Hyderabad", "Nagpur", "Gwalior", "Delhi", "Jaipur"],
      "Surat": ["Chennai", "Hyderabad", "Mumbai", "Surat"]
    },
    "Kolkata": {
      "Mumbai": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Mumbai"],
      "Delhi": ["Kolkata", "Patna", "Varanasi", "Allahabad", "Kanpur", "Agra", "Delhi"],
      "Bangalore": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Hyderabad", "Bangalore"],
      "Chennai": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Hyderabad", "Chennai"],
      "Hyderabad": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Hyderabad"],
      "Pune": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Mumbai", "Pune"],
      "Ahmedabad": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Mumbai", "Ahmedabad"],
      "Jaipur": ["Kolkata", "Patna", "Varanasi", "Allahabad", "Kanpur", "Agra", "Delhi", "Jaipur"],
      "Surat": ["Kolkata", "Ranchi", "Raipur", "Nagpur", "Mumbai", "Surat"]
    },
    "Hyderabad": {
      "Mumbai": ["Hyderabad", "Solapur", "Pune", "Mumbai"],
      "Delhi": ["Hyderabad", "Nagpur", "Gwalior", "Delhi"],
      "Bangalore": ["Hyderabad", "Anantapur", "Bangalore"],
      "Chennai": ["Hyderabad", "Chennai"],
      "Kolkata": ["Hyderabad", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Pune": ["Hyderabad", "Pune"],
      "Ahmedabad": ["Hyderabad", "Mumbai", "Ahmedabad"],
      "Jaipur": ["Hyderabad", "Nagpur", "Gwalior", "Delhi", "Jaipur"],
      "Surat": ["Hyderabad", "Mumbai", "Surat"]
    },
    "Pune": {
      "Mumbai": ["Pune", "Mumbai"],
      "Delhi": ["Pune", "Mumbai", "Indore", "Gwalior", "Delhi"],
      "Bangalore": ["Pune", "Solapur", "Hubli", "Bangalore"],
      "Chennai": ["Pune", "Hyderabad", "Chennai"],
      "Kolkata": ["Pune", "Mumbai", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Pune", "Hyderabad"],
      "Ahmedabad": ["Pune", "Mumbai", "Ahmedabad"],
      "Jaipur": ["Pune", "Mumbai", "Indore", "Kota", "Jaipur"],
      "Surat": ["Pune", "Mumbai", "Surat"]
    },
    "Ahmedabad": {
      "Mumbai": ["Ahmedabad", "Mumbai"],
      "Delhi": ["Ahmedabad", "Udaipur", "Ajmer", "Jaipur", "Delhi"],
      "Bangalore": ["Ahmedabad", "Mumbai", "Hubli", "Bangalore"],
      "Chennai": ["Ahmedabad", "Mumbai", "Hyderabad", "Chennai"],
      "Kolkata": ["Ahmedabad", "Mumbai", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Ahmedabad", "Mumbai", "Hyderabad"],
      "Pune": ["Ahmedabad", "Mumbai", "Pune"],
      "Jaipur": ["Ahmedabad", "Udaipur", "Ajmer", "Jaipur"],
      "Surat": ["Ahmedabad", "Surat"]
    },
    "Jaipur": {
      "Mumbai": ["Jaipur", "Kota", "Indore", "Mumbai"],
      "Delhi": ["Jaipur", "Delhi"],
      "Bangalore": ["Jaipur", "Delhi", "Gwalior", "Nagpur", "Hyderabad", "Bangalore"],
      "Chennai": ["Jaipur", "Delhi", "Gwalior", "Nagpur", "Hyderabad", "Chennai"],
      "Kolkata": ["Jaipur", "Delhi", "Agra", "Kanpur", "Allahabad", "Varanasi", "Patna", "Kolkata"],
      "Hyderabad": ["Jaipur", "Delhi", "Gwalior", "Nagpur", "Hyderabad"],
      "Pune": ["Jaipur", "Kota", "Indore", "Mumbai", "Pune"],
      "Ahmedabad": ["Jaipur", "Ajmer", "Udaipur", "Ahmedabad"],
      "Surat": ["Jaipur", "Ajmer", "Udaipur", "Ahmedabad", "Surat"]
    },
    "Surat": {
      "Mumbai": ["Surat", "Mumbai"],
      "Delhi": ["Surat", "Ahmedabad", "Jaipur", "Delhi"],
      "Bangalore": ["Surat", "Mumbai", "Hubli", "Bangalore"],
      "Chennai": ["Surat", "Mumbai", "Hyderabad", "Chennai"],
      "Kolkata": ["Surat", "Mumbai", "Nagpur", "Raipur", "Ranchi", "Kolkata"],
      "Hyderabad": ["Surat", "Mumbai", "Hyderabad"],
      "Pune": ["Surat", "Mumbai", "Pune"],
      "Ahmedabad": ["Surat", "Ahmedabad"],
      "Jaipur": ["Surat", "Ahmedabad", "Udaipur", "Ajmer", "Jaipur"]
    }
  };

  // For other combinations or same city, return direct route
  if (originCity === destinationCity) {
    return [originCity];
  }

  const route = routeConnections[originCity]?.[destinationCity];
  if (route) {
    console.log(`Route found for ${originCity} → ${destinationCity}:`, route);
    return route;
  }

  // Fallback to direct route if no predefined path exists
  console.log(`No route defined for ${originCity} → ${destinationCity}, using direct route`);
  return [originCity, destinationCity];
};

// Function to fetch real distances from Google Maps API
const fetchRouteDistances = async (origin: string, destination: string, routeCities: string[]): Promise<RouteDistanceData | null> => {
  try {
    const response = await fetch('http://localhost:8000/route-distances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin,
        destination,
        route_cities: routeCities
      })
    });

    if (!response.ok) {
      console.error('Failed to fetch route distances:', response.statusText);
      return null;
    }

    const data: RouteDistanceData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching route distances:', error);
    return null;
  }
};

// Fallback distance calculation (Haversine formula) - used if API fails
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Function to convert shipment to simulation data for map
const createSimulationData = (
  shipment: Shipment, 
  routeDistances?: RouteDistanceData | null,
  geocodedCities?: Map<string, {lat: number, lng: number}>,
  detailedRoutes?: {traditional: any, optimized: any} | null
): SimulationData => {
  // Use geocoded coordinates if available, otherwise fallback
  const fallbackCoords: Record<string, { lat: number; lng: number }> = {
    "Mumbai": { lat: 19.0760, lng: 72.8777 },
    "Delhi": { lat: 28.6139, lng: 77.2090 }, // Fixed: Delhi, India (not USA)
    "New Delhi": { lat: 28.6139, lng: 77.2090 },
    "Bangalore": { lat: 12.9716, lng: 77.5946 },
    "Bengaluru": { lat: 12.9716, lng: 77.5946 },
    "Chennai": { lat: 13.0827, lng: 80.2707 },
    "Kolkata": { lat: 22.5726, lng: 88.3639 },
    "Hyderabad": { lat: 17.3850, lng: 78.4867 },
    "Pune": { lat: 18.5204, lng: 73.8567 },
    "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "Jaipur": { lat: 26.9124, lng: 75.7873 },
    "Surat": { lat: 21.1702, lng: 72.8311 }
  };

  const originCoords = geocodedCities?.get(shipment.origin_city) || fallbackCoords[shipment.origin_city] || { lat: 19.0760, lng: 72.8777 };
  const destCoords = geocodedCities?.get(shipment.destination_city) || fallbackCoords[shipment.destination_city] || { lat: 28.6139, lng: 77.2090 }; // Fixed: Delhi, India

  // Get the optimized route cities
  const routeCities = getRouteCities(shipment.origin_city, shipment.destination_city);
  
  // Use Google Maps distances if available, otherwise fallback to estimates
  let optimizedDistance, traditionalDistance, optimizedTime, traditionalTime, optimizedCost, traditionalCost;
  
  if (routeDistances) {
    // Use real Google Maps data
    optimizedDistance = routeDistances.optimized_distance_km;
    traditionalDistance = routeDistances.direct_distance_km;
    optimizedTime = Math.round(routeDistances.optimized_duration_min / 60); // Convert to hours
    traditionalTime = Math.round(routeDistances.direct_duration_min / 60); // Convert to hours
    
    // Calculate costs based on real distances (₹15/km for optimized, ₹18/km for traditional)
    optimizedCost = Math.round(optimizedDistance * 15 * (shipment.cargo_weight_tons || 1));
    traditionalCost = Math.round(traditionalDistance * 18 * (shipment.cargo_weight_tons || 1));
  } else {
    // Fallback to estimated calculations
    optimizedDistance = calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng) + 100; // Add some distance for waypoints
    traditionalDistance = calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    optimizedTime = Math.round(optimizedDistance / 60);
    traditionalTime = Math.round(traditionalDistance / 50);
    optimizedCost = Math.round(optimizedDistance * 15 * (shipment.cargo_weight_tons || 1));
    traditionalCost = Math.round(traditionalDistance * 18 * (shipment.cargo_weight_tons || 1));
  }
  
  // Create AI-optimized route description
  const optimizedRouteText = routeCities.join(" → ");
  const traditionalRouteText = `${shipment.origin_city} → Direct Highway → ${shipment.destination_city}`;

  // Use detailed routes from Mapbox if available, otherwise create simple routes
  const createRoutePoints = (start: {lat: number, lng: number}, end: {lat: number, lng: number}, isDirect = false) => {
    const points = [
      { latitude: start.lat, longitude: start.lng }
    ];
    
    if (!isDirect) {
      // Add some intermediate points for more realistic route
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      points.push({ latitude: midLat + 0.5, longitude: midLng + 0.3 });
      points.push({ latitude: midLat - 0.2, longitude: midLng - 0.1 });
    }
    
    points.push({ latitude: end.lat, longitude: end.lng });
    return points;
  };

  const routes: Route[] = [
    {
      id: "actual",
      name: "Traditional Route",
      type: "actual",
      coordinates: detailedRoutes?.traditional?.coordinates || createRoutePoints(originCoords, destCoords, false),
      stats: {
        duration: `${traditionalTime}h`,
        distance: `${traditionalDistance}km`,
        cost: traditionalCost
      },
      color: "#F97316",
      style: "dashed",
      description: traditionalRouteText
    },
    {
      id: "optimized",
      name: "AI-Optimized Route",
      type: "optimized",
      coordinates: detailedRoutes?.optimized?.coordinates || createRoutePoints(originCoords, destCoords, true),
      stats: {
        duration: `${optimizedTime}h`,
        distance: `${optimizedDistance}km`,
        cost: optimizedCost
      },
      color: "#10B981",
      style: "solid",
      description: optimizedRouteText
    }
  ];

  const events: RouteEvent[] = [
    {
      id: "origin",
      type: "origin",
      location: { latitude: originCoords.lat, longitude: originCoords.lng },
      title: "Pickup Location",
      description: `${shipment.origin_city} - ${shipment.cargo_type} (${shipment.cargo_weight_tons}t)`,
      timestamp: shipment.pickup_datetime
    },
    {
      id: "destination",
      type: "destination",
      location: { latitude: destCoords.lat, longitude: destCoords.lng },
      title: "Delivery Location",
      description: `${shipment.destination_city} - ${shipment.transport_mode}`,
    }
  ];

  // Add risk-based events
  if (shipment.risk_score && shipment.risk_score > 0.1) {
    events.push({
      id: "risk-warning",
      type: "congestion",
      location: { 
        latitude: (originCoords.lat + destCoords.lat) / 2, 
        longitude: (originCoords.lng + destCoords.lng) / 2 
      },
      title: "Route Risk Alert",
      description: `Risk Score: ${(shipment.risk_score * 100).toFixed(1)}%`,
      severity: shipment.risk_score > 0.15 ? "high" : "medium"
    });
  }

  return {
    routes,
    events,
    metadata: {
      description: `${shipment.shipment_ref} - ${shipment.origin_city} to ${shipment.destination_city}`,
      simulationDate: shipment.created_at
    }
  };
};

export default function DashboardPage() {
  const { company, token, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeDistances, setRouteDistances] = useState<RouteDistanceData | null>(null);
  const [distancesLoading, setDistancesLoading] = useState(false);
  const [geocodedCities, setGeocodedCities] = useState<Map<string, {lat: number, lng: number}>>(new Map());
  const [detailedRoutes, setDetailedRoutes] = useState<{traditional: any, optimized: any} | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [error, setError] = useState('');
  const [shipmentsToShow, setShipmentsToShow] = useState(5);
  // Multi-modal routing state
  const [multiModalRoute, setMultiModalRoute] = useState<MultiModalRoute | null>(null);
  const [multiModalLoading, setMultiModalLoading] = useState(false);
  const [multiModalError, setMultiModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!company) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [company, token, router]);

  // Fetch route distances when selectedShipment changes
  useEffect(() => {
    if (selectedShipment) {
      fetchRouteDistancesForShipment(selectedShipment);
      fetchDetailedRoutesForShipment(selectedShipment);
      fetchMultiModalRoute(selectedShipment);
    } else {
      setRouteDistances(null);
      setDetailedRoutes(null);
      setMultiModalRoute(null);
      setMultiModalError(null);
    }
  }, [selectedShipment]);

  const fetchDetailedRoutesForShipment = async (shipment: Shipment) => {
    setRoutesLoading(true);
    try {
      // Get route cities for waypoints
      const routeCities = getRouteCities(shipment.origin_city, shipment.destination_city);
      
      // Geocode origin, destination, and waypoints (excluding first and last)
      const citiesToGeocode = [
        shipment.origin_city,
        ...routeCities.slice(1, -1), // Intermediate cities as waypoints
        shipment.destination_city
      ];
      
      const geocodedResults = await geocodeCities(citiesToGeocode);
      
      const originGeo = geocodedResults.get(shipment.origin_city);
      const destGeo = geocodedResults.get(shipment.destination_city);

      if (originGeo && destGeo) {
        // Update geocoded cities map
        const newGeocodedCities = new Map(geocodedCities);
        geocodedResults.forEach((geo, city) => {
          newGeocodedCities.set(city, { lat: geo.coordinates.latitude, lng: geo.coordinates.longitude });
        });
        setGeocodedCities(newGeocodedCities);

        // Build waypoints from intermediate cities
        const waypoints: Array<{ latitude: number; longitude: number }> = [];
        for (let i = 1; i < routeCities.length - 1; i++) {
          const waypointGeo = geocodedResults.get(routeCities[i]);
          if (waypointGeo) {
            waypoints.push(waypointGeo.coordinates);
          }
        }

        console.log(`Fetching detailed routes with ${waypoints.length} waypoints:`, routeCities.join(' → '));

        // Fetch detailed routes from Mapbox Directions API with waypoints
        const [traditionalRoute, optimizedRoute] = await Promise.all([
          getDetailedRoute(
            originGeo.coordinates,
            destGeo.coordinates,
            waypoints.length > 0 ? waypoints : undefined,
            "driving"
          ),
          getDetailedRoute(
            originGeo.coordinates,
            destGeo.coordinates,
            waypoints.length > 0 ? waypoints.slice(0, 3) : undefined, // Limit optimized route waypoints
            "driving-traffic"
          )
        ]);

        if (traditionalRoute && optimizedRoute) {
          console.log(`Routes fetched successfully - Traditional: ${traditionalRoute.distance_km}km, Optimized: ${optimizedRoute.distance_km}km`);
          setDetailedRoutes({
            traditional: traditionalRoute,
            optimized: optimizedRoute
          });
        }
      }
    } catch (error) {
      console.error("Error fetching detailed routes:", error);
    } finally {
      setRoutesLoading(false);
    }
  };

  const fetchMultiModalRoute = async (shipment: Shipment) => {
    setMultiModalLoading(true);
    setMultiModalError(null);
    
    try {
      const result = await planMultiModalRoute(
        shipment.origin_city,
        shipment.destination_city,
        shipment.cargo_weight_tons || 10,
        false, // is_urgent
        false  // avoid_air
      );

      if (result.success) {
        setMultiModalRoute(result.route);
      } else {
        const error = result as RouteError;
        setMultiModalError(error.error);
      }
    } catch (error) {
      console.error("Error fetching multi-modal route:", error);
      setMultiModalError("Failed to calculate route. Please try again.");
    } finally {
      setMultiModalLoading(false);
    }
  };

  const fetchRouteDistancesForShipment = async (shipment: Shipment) => {
    setDistancesLoading(true);
    const routeCities = getRouteCities(shipment.origin_city, shipment.destination_city);
    
    try {
      const distances = await fetchRouteDistances(
        shipment.origin_city,
        shipment.destination_city,
        routeCities
      );
      setRouteDistances(distances);
    } catch (error) {
      console.error('Failed to fetch route distances:', error);
      setRouteDistances(null);
    } finally {
      setDistancesLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load analytics and recent shipments in parallel
      const [analyticsData, shipmentsData] = await Promise.all([
        apiClient.getAnalytics(token || undefined),
        apiClient.getShipments(token || undefined, 10, 0)
      ]);
      
      setAnalytics(analyticsData);
      setShipments(shipmentsData.shipments || []);
      
      // Set the most recent shipment as selected for map display
      if (shipmentsData.shipments && shipmentsData.shipments.length > 0) {
        setSelectedShipment(shipmentsData.shipments[0]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShipmentSelect = (shipment: Shipment) => {
    setSelectedShipment(shipment);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CFN Dashboard</h1>
            <p className="text-gray-700 font-medium">Welcome back, {company?.name || 'User'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/plan-shipment')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Plan New Shipment
            </button>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Total Shipments</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.total_shipments}</p>
                  <p className="text-xs text-gray-500 mt-1">Last {analytics.period}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8h4v4" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">₹{analytics.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">↗ Profit: ₹{analytics.profit.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Profit Margin</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.profit_margin_percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">Revenue - Costs</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">On-Time Delivery</p>
                  <p className="text-3xl font-bold text-gray-900">{(analytics.on_time_delivery_rate * 100).toFixed(1)}%</p>
                  <p className="text-xs text-blue-600 mt-1">Reliability Score</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Error or No Data State */}
        {error && (
          <Card className="p-8 mb-8 bg-yellow-50 border-2 border-yellow-300 shadow-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-yellow-900 mb-3">No Data Available</h3>
              <p className="text-yellow-800 font-medium mb-6">Add historical shipment data to see analytics and train ML models.</p>
              <button
                onClick={() => router.push('/plan-shipment')}
                className="bg-yellow-600 text-white px-8 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-bold shadow-sm"
              >
                Create Your First Shipment
              </button>
            </div>
          </Card>
        )}

        {/* Shipments Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipments List */}
          <Card className="p-6 border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: 'fit-content', maxHeight: '800px' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Shipments</h2>
            {shipments.length > 0 ? (
              <>
                <div className="space-y-4 overflow-y-auto flex-1" style={{ maxHeight: '600px' }}>
                  {shipments.slice(0, shipmentsToShow).map((shipment) => (
                  <div
                    key={shipment._id}
                    className={`bg-white border-2 rounded-lg p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedShipment?._id === shipment._id
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedShipment(shipment)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{shipment.shipment_ref}</h4>
                        <p className="text-gray-700 font-medium mb-2">
                          {shipment.origin_city} → {shipment.destination_city}
                        </p>
                        <p className="text-sm text-gray-600">
                          {shipment.cargo_type} • {shipment.cargo_weight_tons}t • {shipment.transport_mode}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                        className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          shipment.status === 'completed' ? 'bg-green-100 text-green-900 border border-green-200' :
                          shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                          shipment.status === 'pending' || shipment.status === 'planned' ? 'bg-yellow-100 text-yellow-900 border border-yellow-200' :
                          'bg-gray-100 text-gray-900 border border-gray-200'
                        }`}
                        >
                          {shipment.status.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-gray-800 font-bold mt-2">
                          ₹{(shipment.total_cost || shipment.predicted_cost || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
                {shipments.length > shipmentsToShow && (
                  <button
                    onClick={() => setShipmentsToShow(prev => prev + 5)}
                    className="mt-4 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View More ({shipments.length - shipmentsToShow} remaining)
                  </button>
                )}
                {shipmentsToShow > 5 && (
                  <button
                    onClick={() => setShipmentsToShow(5)}
                    className="mt-2 w-full py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Show Less
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg font-medium mb-4">No shipments found.</p>
                <button
                  onClick={() => router.push('/plan-shipment')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm"
                >
                  Create First Shipment
                </button>
              </div>
            )}
          </Card>

          {/* Shipment Details */}
          <Card className="p-6 border border-blue-200 bg-white shadow-sm flex flex-col" style={{ height: 'fit-content', maxHeight: '800px' }}>
            <h3 className="text-2xl font-bold text-blue-900 mb-6">Shipment Details</h3>
            {selectedShipment ? (
              <div className="space-y-4 overflow-y-auto flex-1" style={{ maxHeight: '700px' }}>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 text-xl mb-2">{selectedShipment.shipment_ref}</h4>
                  <p className="text-blue-800 font-medium text-lg">{selectedShipment.origin_city} → {selectedShipment.destination_city}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-blue-700 font-semibold text-sm mb-1">Status</span>
                      <span className="text-blue-900 font-bold text-base">{selectedShipment.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-blue-700 font-semibold text-sm mb-1">Weight</span>
                      <span className="text-blue-900 font-bold text-base">{selectedShipment.cargo_weight_tons}t</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-700 font-semibold text-sm mb-1">Distance</span>
                    <span className="text-blue-900 font-bold text-base">
                      {multiModalLoading ? (
                        <span className="animate-pulse">Calculating...</span>
                      ) : multiModalRoute ? (
                        `${Math.round(multiModalRoute.total_distance_km)}km`
                      ) : multiModalError ? (
                        <span className="text-red-600 text-xs">Cannot calculate</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No route data</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-700 font-semibold text-sm mb-1">Cost</span>
                    <span className="text-blue-900 font-bold text-base">
                      {multiModalRoute ? (
                        `₹${Math.round(multiModalRoute.total_cost_usd * 83).toLocaleString()}`
                      ) : (
                        selectedShipment.total_cost || selectedShipment.predicted_cost ? 
                        `₹${(selectedShipment.total_cost || selectedShipment.predicted_cost || 0).toLocaleString()}` :
                        <span className="text-gray-400 text-xs">Not calculated</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Route Weather Information */}
                <WeatherCard 
                  routeCities={getRouteCities(selectedShipment.origin_city, selectedShipment.destination_city)}
                  className=""
                />

                {/* Multi-Modal Route Information */}
                <MultiModalRouteCard
                  route={multiModalRoute}
                  loading={multiModalLoading}
                  error={multiModalError}
                  onRetry={() => selectedShipment && fetchMultiModalRoute(selectedShipment)}
                />

                {/* Route Summary Card */}
                {multiModalRoute && (
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 shadow-sm">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📊</span>
                        <h4 className="font-bold text-blue-900 text-base">Route Summary</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-blue-200">
                          <p className="text-xs text-blue-700 font-medium mb-1">Transport Modes:</p>
                          <p className="text-blue-900 font-semibold text-sm">
                            {multiModalRoute.transport_modes_used.map(mode => 
                              mode === 'truck' ? '🚛 Truck' :
                              mode === 'ship' ? '🚢 Ship' :
                              mode === 'air' ? '✈️ Air' : '🚂 Rail'
                            ).join(' → ')}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-blue-200 text-center">
                            <p className="text-xs text-blue-700 font-medium">Duration</p>
                            <p className="text-blue-900 font-bold text-base">
                              {Math.round(multiModalRoute.total_duration_hours)}h
                            </p>
                          </div>
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-blue-200 text-center">
                            <p className="text-xs text-blue-700 font-medium">Distance</p>
                            <p className="text-blue-900 font-bold text-base">
                              {Math.round(multiModalRoute.total_distance_km)}km
                            </p>
                          </div>
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-blue-200 text-center">
                            <p className="text-xs text-blue-700 font-medium">Total Cost</p>
                            <p className="text-blue-900 font-bold text-base">
                              ₹{Math.round(multiModalRoute.total_cost_usd * 83).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="bg-blue-100/80 backdrop-blur-sm rounded-lg p-2 border border-blue-300">
                          <p className="text-xs text-blue-900 font-medium">
                            {multiModalRoute.is_international ? '🌍 International route with optimal port/airport selection' : '🏠 Domestic route optimized for efficiency'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg font-medium">Select a shipment to view details and route visualization</p>
              </div>
            )}
          </Card>
        </div>

        {/* Interactive Route Map - Full Width Below */}
        {selectedShipment && (
          <div className="mt-8 mb-8">
            <RouteSimulatorMap 
              simulationData={createSimulationData(selectedShipment, routeDistances, geocodedCities, detailedRoutes)}
              height="600px"
              className="rounded-lg shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
