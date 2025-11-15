/**
 * Multi-Modal Transport Routing API Integration
 * NO FALLBACKS - Returns errors for display in UI
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  type: "city" | "seaport" | "airport" | "rail_station";
}

export interface RouteSegment {
  segment_type: "origin_to_port" | "port_to_port" | "port_to_destination" | "direct" | "rail_segment" | "air_segment";
  transport_mode: "truck" | "rail" | "ship" | "air";
  origin: Location;
  destination: Location;
  distance_km: number;
  duration_hours: number;
  cost_usd: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  description: string;
}

export interface MultiModalRoute {
  segments: RouteSegment[];
  total_distance_km: number;
  total_duration_hours: number;
  total_cost_usd: number;
  transport_modes_used: string[];
  transfer_points: Location[];
  route_description: string;
  is_international: boolean;
}

export interface RouteResponse {
  success: boolean;
  route: MultiModalRoute;
}

export interface RouteError {
  success: false;
  error: string;
  error_type: "validation_error" | "not_implemented" | "routing_error";
}

/**
 * Plan multi-modal route
 * Returns either route data or error object - NO FALLBACKS
 */
export async function planMultiModalRoute(
  origin: string,
  destination: string,
  cargoWeightTons: number,
  isUrgent: boolean = false,
  avoidAir: boolean = false
): Promise<RouteResponse | RouteError> {
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      cargo_weight_tons: cargoWeightTons.toString(),
      is_urgent: isUrgent.toString(),
      avoid_air: avoidAir.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/api/route/multi-modal?${params}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      
      // Categorize error type
      let errorType: "validation_error" | "not_implemented" | "routing_error";
      if (response.status === 400) {
        errorType = "validation_error";
      } else if (response.status === 501) {
        errorType = "not_implemented";
      } else {
        errorType = "routing_error";
      }

      return {
        success: false,
        error: errorData.detail || "Failed to plan route",
        error_type: errorType,
      };
    }

    const data: RouteResponse = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred. Please check your connection and try again.",
      error_type: "routing_error",
    };
  }
}

/**
 * Get transport mode display name
 */
export function getTransportModeDisplay(mode: string): string {
  const modeMap: Record<string, string> = {
    truck: "🚛 Ground Transport (Truck)",
    rail: "🚂 Rail Freight",
    ship: "🚢 Sea Freight",
    air: "✈️ Air Freight",
  };
  return modeMap[mode] || mode;
}

/**
 * Get transport mode color for UI
 */
export function getTransportModeColor(mode: string): string {
  const colorMap: Record<string, string> = {
    truck: "#10B981", // green
    rail: "#6366F1", // indigo
    ship: "#3B82F6", // blue
    air: "#EC4899", // pink
  };
  return colorMap[mode] || "#6B7280"; // gray default
}

/**
 * Format duration for display
 */
export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

/**
 * Format cost for display
 */
export function formatCost(usd: number, currency: "USD" | "INR" = "USD"): string {
  if (currency === "INR") {
    const inr = usd * 83; // Approximate conversion
    return `₹${inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * Get location type icon
 */
export function getLocationTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    city: "📍",
    seaport: "⚓",
    airport: "✈️",
    rail_station: "🚂",
  };
  return iconMap[type] || "📍";
}
