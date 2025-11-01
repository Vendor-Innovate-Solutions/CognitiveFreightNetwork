import { SimulationData } from "@/types/route";

// Railway route from Paradip Port to Jamshedpur Steel Plant (Eastern India)
export const mockSimulationData: SimulationData = {
  routes: [
    {
      id: "actual-route-1",
      name: "Traditional Railway Route",
      type: "actual",
      coordinates: [
        { latitude: 20.2606, longitude: 86.6944 }, // Paradip Port, Odisha
        { latitude: 20.4726, longitude: 86.3029 }, // Cuttack
        { latitude: 20.9517, longitude: 85.0985 }, // Bhubaneswar Junction
        { latitude: 21.4668, longitude: 84.9812 }, // Angul
        { latitude: 21.9546, longitude: 84.0417 }, // Rourkela Junction
        { latitude: 22.5645, longitude: 84.3803 }, // Ranchi approach
        { latitude: 22.8046, longitude: 86.2029 }, // Bokaro Steel City
        { latitude: 23.3441, longitude: 85.3096 }, // Adityapur
        { latitude: 23.6693, longitude: 85.3067 }, // Jamshedpur Steel Plant
      ],
      stats: {
        duration: "18 hours",
        distance: "420 km",
        cost: 175000, // ₹1,75,000
      },
      color: "#F97316",
      style: "dashed",
    },
    {
      id: "optimized-route-1",
      name: "AI-Optimized Railway Route",
      type: "optimized",
      coordinates: [
        { latitude: 20.2606, longitude: 86.6944 }, // Paradip Port, Odisha
        { latitude: 20.7099, longitude: 85.8314 }, // Dhenkanal (bypass)
        { latitude: 21.4668, longitude: 83.9812 }, // Sambalpur (direct route)
        { latitude: 22.0797, longitude: 84.6056 }, // Raigarh
        { latitude: 22.2543, longitude: 84.9119 }, // Ranchi bypass route
        { latitude: 23.3441, longitude: 85.3096 }, // Adityapur
        { latitude: 23.6693, longitude: 85.3067 }, // Jamshedpur Steel Plant
      ],
      stats: {
        duration: "14 hours",
        distance: "365 km",
        cost: 135000, // ₹1,35,000
      },
      color: "#10B981",
      style: "solid",
    },
  ],
  events: [
    {
      id: "event-1",
      type: "origin",
      location: { latitude: 20.2606, longitude: 86.6944 },
      title: "Origin: Paradip Port",
      description: "60 MT railway rake loaded with coking coal from vessel MV Sagar Ratna",
      timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "event-2",
      type: "congestion",
      location: { latitude: 20.9517, longitude: 85.0985 },
      title: "Track Congestion Alert",
      description: "Heavy goods traffic at Bhubaneswar Junction - 3 hour delay predicted",
      timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
      severity: "high",
    },
    {
      id: "event-3",
      type: "reroute",
      location: { latitude: 21.4668, longitude: 83.9812 },
      title: "AI Reroute via Sambalpur",
      description: "System detected congestion and rerouted through Sambalpur, avoiding Bhubaneswar",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      severity: "medium",
    },
    {
      id: "event-4",
      type: "checkpoint",
      location: { latitude: 22.2543, longitude: 84.9119 },
      title: "Checkpoint: Ranchi Bypass",
      description: "Rake inspection complete - running 2 hours ahead of schedule",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "event-5",
      type: "delay",
      location: { latitude: 22.8046, longitude: 86.2029 },
      title: "Delay Avoided - Bokaro Junction",
      description: "AI route avoided 5-hour delay due to track maintenance at Bokaro",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      severity: "low",
    },
    {
      id: "event-6",
      type: "destination",
      location: { latitude: 23.6693, longitude: 85.3067 },
      title: "Destination: Jamshedpur Steel Plant",
      description: "Coking coal delivered 4 hours early - Cost saved: ₹40,000",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ],
  metadata: {
    simulationDate: new Date().toISOString().split('T')[0],
    description: "Paradip Port to Jamshedpur Steel Plant - Railway freight route comparison",
  },
};
