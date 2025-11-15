import { SimulationData } from "@/types/route";

/**
 * Multi-Modal Route Example: Mumbai to Singapore
 * Demonstrates curved lines for sea/air segments and straight lines for road/rail
 */
export const multiModalSimulationData: SimulationData = {
  routes: [
    {
      id: "traditional-multimodal",
      name: "Traditional Sea Route",
      type: "actual",
      coordinates: [], // Will be generated from segments
      segments: [
        {
          id: "truck-1",
          transportMode: "truck",
          coordinates: [
            { latitude: 19.0760, longitude: 72.8777 }, // Mumbai City
            { latitude: 19.0969, longitude: 72.8570 }, // Dadar
            { latitude: 19.1136, longitude: 72.8697 }, // Kurla
            { latitude: 18.9388, longitude: 72.8354 }, // JNPT Port
          ],
          distance: "35 km",
          duration: "1.5 hours",
        },
        {
          id: "ship-1",
          transportMode: "ship",
          coordinates: [
            { latitude: 18.9388, longitude: 72.8354 }, // JNPT Port, Mumbai
            { latitude: 15.0, longitude: 75.0 }, // Arabian Sea waypoint 1
            { latitude: 10.0, longitude: 78.0 }, // Arabian Sea waypoint 2
            { latitude: 6.9271, longitude: 79.8612 }, // Colombo Port, Sri Lanka
            { latitude: 3.0, longitude: 85.0 }, // Bay of Bengal waypoint
            { latitude: 1.3521, longitude: 103.8198 }, // Singapore Port
          ],
          distance: "3,800 km",
          duration: "8 days",
        },
        {
          id: "truck-2",
          transportMode: "truck",
          coordinates: [
            { latitude: 1.3521, longitude: 103.8198 }, // Singapore Port
            { latitude: 1.3000, longitude: 103.8500 }, // Jurong
            { latitude: 1.2800, longitude: 103.8700 }, // Tuas Industrial
          ],
          distance: "15 km",
          duration: "0.5 hours",
        },
      ],
      stats: {
        duration: "8 days 2 hours",
        distance: "3,850 km",
        cost: 450000, // ₹4,50,000
      },
      color: "#F97316",
      style: "dashed",
    },
    {
      id: "optimized-multimodal",
      name: "AI-Optimized Air Route",
      type: "optimized",
      coordinates: [], // Will be generated from segments
      segments: [
        {
          id: "truck-opt-1",
          transportMode: "truck",
          coordinates: [
            { latitude: 19.0760, longitude: 72.8777 }, // Mumbai City
            { latitude: 19.0886, longitude: 72.8679 }, // Andheri
            { latitude: 19.0896, longitude: 72.8656 }, // Mumbai Airport
          ],
          distance: "8 km",
          duration: "0.5 hours",
        },
        {
          id: "air-1",
          transportMode: "air",
          coordinates: [
            { latitude: 19.0896, longitude: 72.8656 }, // Mumbai Airport
            { latitude: 1.3644, longitude: 103.9915 }, // Singapore Changi Airport
          ],
          distance: "4,100 km",
          duration: "5.5 hours",
        },
        {
          id: "truck-opt-2",
          transportMode: "truck",
          coordinates: [
            { latitude: 1.3644, longitude: 103.9915 }, // Singapore Changi Airport
            { latitude: 1.3000, longitude: 103.8500 }, // Jurong
            { latitude: 1.2800, longitude: 103.8700 }, // Tuas Industrial
          ],
          distance: "25 km",
          duration: "1 hour",
        },
      ],
      stats: {
        duration: "7 hours",
        distance: "4,133 km",
        cost: 850000, // ₹8,50,000 (air freight premium)
      },
      color: "#10B981",
      style: "solid",
    },
  ],
  events: [
    {
      id: "origin",
      type: "origin",
      location: { latitude: 19.0760, longitude: 72.8777 },
      title: "Origin: Mumbai",
      description: "Shipment pickup - Electronics cargo (5 tons)",
      timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "transfer-1",
      type: "checkpoint",
      location: { latitude: 18.9388, longitude: 72.8354 },
      title: "Transfer: JNPT Port",
      description: "Cargo loaded onto vessel MV Eastern Star",
      timestamp: new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "waypoint-colombo",
      type: "checkpoint",
      location: { latitude: 6.9271, longitude: 79.8612 },
      title: "Waypoint: Colombo Port",
      description: "Transshipment port - customs clearance",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "air-transfer",
      type: "checkpoint",
      location: { latitude: 19.0896, longitude: 72.8656 },
      title: "Air Transfer: Mumbai Airport",
      description: "Express shipment via air cargo - same cargo, faster route",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      severity: "medium",
    },
    {
      id: "destination",
      type: "destination",
      location: { latitude: 1.2800, longitude: 103.8700 },
      title: "Destination: Singapore",
      description: "Cargo delivered to Tuas Industrial Area",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  metadata: {
    simulationDate: new Date().toISOString().split('T')[0],
    description: "Mumbai to Singapore - Multi-Modal Freight Comparison (Sea vs Air)",
  },
};

/**
 * Coastal Shipping Route Example: Chennai to Kolkata
 * Demonstrates sea route curves along Indian coastline
 */
export const coastalShippingData: SimulationData = {
  routes: [
    {
      id: "coastal-route",
      name: "Coastal Shipping Route",
      type: "actual",
      coordinates: [], // Will be generated from segments
      segments: [
        {
          id: "rail-1",
          transportMode: "rail",
          coordinates: [
            { latitude: 13.0827, longitude: 80.2707 }, // Chennai Central
            { latitude: 13.0598, longitude: 80.2209 }, // Chennai Port
          ],
          distance: "12 km",
          duration: "0.5 hours",
        },
        {
          id: "ship-coastal",
          transportMode: "ship",
          coordinates: [
            { latitude: 13.0598, longitude: 80.2209 }, // Chennai Port
            { latitude: 15.8281, longitude: 80.9647 }, // Kakinada
            { latitude: 17.6869, longitude: 83.2185 }, // Visakhapatnam
            { latitude: 20.2606, longitude: 86.6944 }, // Paradip
            { latitude: 21.6417, longitude: 87.7472 }, // Haldia
            { latitude: 22.5626, longitude: 88.3535 }, // Kolkata Port
          ],
          distance: "1,450 km",
          duration: "3 days",
        },
        {
          id: "rail-2",
          transportMode: "rail",
          coordinates: [
            { latitude: 22.5626, longitude: 88.3535 }, // Kolkata Port
            { latitude: 22.5726, longitude: 88.3639 }, // Kolkata Central
          ],
          distance: "8 km",
          duration: "0.5 hours",
        },
      ],
      stats: {
        duration: "3 days 1 hour",
        distance: "1,470 km",
        cost: 180000, // ₹1,80,000
      },
      color: "#3B82F6",
      style: "solid",
    },
  ],
  events: [
    {
      id: "origin-chennai",
      type: "origin",
      location: { latitude: 13.0827, longitude: 80.2707 },
      title: "Origin: Chennai",
      description: "Bulk cargo shipment - Steel coils (200 tons)",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "stop-vizag",
      type: "checkpoint",
      location: { latitude: 17.6869, longitude: 83.2185 },
      title: "Stopover: Visakhapatnam",
      description: "Partial unloading - 50 tons",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "stop-paradip",
      type: "checkpoint",
      location: { latitude: 20.2606, longitude: 86.6944 },
      title: "Stopover: Paradip",
      description: "Additional cargo loading - 30 tons",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "destination-kolkata",
      type: "destination",
      location: { latitude: 22.5726, longitude: 88.3639 },
      title: "Destination: Kolkata",
      description: "Remaining cargo delivered - 180 tons",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  metadata: {
    simulationDate: new Date().toISOString().split('T')[0],
    description: "Chennai to Kolkata - Coastal Shipping Route with Rail Transfers",
  },
};
