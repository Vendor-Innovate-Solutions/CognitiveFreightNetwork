import { SimulationData } from "@/types/route";

// Sample route from Los Angeles to Chicago
export const mockSimulationData: SimulationData = {
  routes: [
    {
      id: "actual-route-1",
      name: "Actual Route",
      type: "actual",
      coordinates: [
        { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
        { latitude: 34.4208, longitude: -114.0723 }, // Near Needles, CA
        { latitude: 35.0844, longitude: -110.9741 }, // Near Holbrook, AZ
        { latitude: 35.4676, longitude: -108.7453 }, // Near Grants, NM
        { latitude: 35.0844, longitude: -106.6504 }, // Albuquerque, NM
        { latitude: 35.1983, longitude: -101.9453 }, // Amarillo, TX
        { latitude: 35.4676, longitude: -97.5164 },  // Oklahoma City, OK
        { latitude: 36.1540, longitude: -95.9928 },  // Tulsa, OK
        { latitude: 37.0902, longitude: -94.5133 },  // Joplin, MO
        { latitude: 38.5767, longitude: -92.1735 },  // Jefferson City, MO
        { latitude: 39.7817, longitude: -89.6501 },  // Springfield, IL
        { latitude: 40.6331, longitude: -89.3985 },  // Peoria, IL
        { latitude: 41.8781, longitude: -87.6298 },  // Chicago, IL
      ],
      stats: {
        duration: "48 hours",
        distance: "2,500 km",
        cost: 3200,
      },
      color: "#F97316",
      style: "dashed",
    },
    {
      id: "optimized-route-1",
      name: "Optimized Route",
      type: "optimized",
      coordinates: [
        { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
        { latitude: 35.1983, longitude: -114.8199 }, // Las Vegas, NV
        { latitude: 36.1699, longitude: -115.1398 }, // Near Las Vegas
        { latitude: 37.0902, longitude: -112.5263 }, // Near Cedar City, UT
        { latitude: 38.5733, longitude: -109.5498 }, // Near Moab, UT
        { latitude: 39.5501, longitude: -105.7821 }, // Denver, CO
        { latitude: 40.2338, longitude: -103.7077 }, // Near Sterling, CO
        { latitude: 40.8136, longitude: -99.0876 },  // Near Kearney, NE
        { latitude: 41.2565, longitude: -95.9345 },  // Omaha, NE
        { latitude: 41.5868, longitude: -93.6250 },  // Des Moines, IA
        { latitude: 41.8781, longitude: -87.6298 },  // Chicago, IL
      ],
      stats: {
        duration: "36 hours",
        distance: "2,200 km",
        cost: 2600,
      },
      color: "#10B981",
      style: "solid",
    },
  ],
  events: [
    {
      id: "event-1",
      type: "origin",
      location: { latitude: 34.0522, longitude: -118.2437 },
      title: "Origin: Los Angeles Port",
      description: "Shipment started from Los Angeles",
      timestamp: "2025-01-15T08:00:00Z",
    },
    {
      id: "event-2",
      type: "congestion",
      location: { latitude: 35.1983, longitude: -101.9453 },
      title: "Heavy Traffic Detected",
      description: "Predicted 8-hour delay due to highway construction",
      timestamp: "2025-01-15T18:00:00Z",
      severity: "high",
    },
    {
      id: "event-3",
      type: "reroute",
      location: { latitude: 36.1699, longitude: -115.1398 },
      title: "AI-Recommended Reroute",
      description: "Route optimized through Denver to avoid congestion",
      timestamp: "2025-01-15T12:00:00Z",
      severity: "medium",
    },
    {
      id: "event-4",
      type: "checkpoint",
      location: { latitude: 39.5501, longitude: -105.7821 },
      title: "Checkpoint: Denver Hub",
      description: "Quick fuel and inspection stop",
      timestamp: "2025-01-16T02:00:00Z",
    },
    {
      id: "event-5",
      type: "delay",
      location: { latitude: 38.5767, longitude: -92.1735 },
      title: "Weather Delay Averted",
      description: "Optimized route avoided storm system",
      timestamp: "2025-01-16T10:00:00Z",
      severity: "low",
    },
    {
      id: "event-6",
      type: "destination",
      location: { latitude: 41.8781, longitude: -87.6298 },
      title: "Destination: Chicago Warehouse",
      description: "Shipment delivered successfully",
      timestamp: "2025-01-16T20:00:00Z",
    },
  ],
  metadata: {
    simulationDate: "2025-01-15",
    description: "Los Angeles to Chicago freight route comparison",
  },
};
