/**
 * Multi-Modal Route Display Component
 * Shows route segments with transport modes, transfer points, and costs
 */

import { Card } from "@/components/ui/card";
import type { 
  MultiModalRoute, 
  RouteSegment, 
  Location 
} from "@/lib/multi-modal-api";
import {
  getTransportModeDisplay,
  getTransportModeColor,
  formatDuration,
  formatCost,
  getLocationTypeIcon,
} from "@/lib/multi-modal-api";

interface MultiModalRouteCardProps {
  route: MultiModalRoute | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function MultiModalRouteCard({ 
  route, 
  loading = false,
  error = null,
  onRetry
}: MultiModalRouteCardProps) {
  
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Calculating optimal multi-modal route...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    // Categorize error type for better guidance
    const isValidationError = error.includes("could not be found") || error.includes("spelling");
    const isNotImplemented = error.includes("require") || error.includes("integration");
    const isAPIError = error.includes("API") || error.includes("failed") || error.includes("MAPBOX_TOKEN");
    
    return (
      <Card className="p-4 border-red-300 bg-red-50">
        <div className="flex items-start">
          <span className="text-2xl mr-3">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-1">Route Calculation Error</h3>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            
            {/* Actionable guidance based on error type */}
            {isValidationError && (
              <div className="bg-white/50 rounded p-2 mb-2">
                <p className="text-xs font-medium text-red-700 mb-1">💡 Try:</p>
                <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                  <li>Check spelling (e.g., "Mumbai" not "Bombay")</li>
                  <li>Use full city names (e.g., "New York City, USA")</li>
                  <li>Try alternate names or nearby major cities</li>
                </ul>
              </div>
            )}
            
            {isNotImplemented && (
              <div className="bg-yellow-50 rounded p-2 mb-2">
                <p className="text-xs font-medium text-yellow-800 mb-1">🚧 Coming Soon</p>
                <p className="text-xs text-yellow-700">
                  This feature requires additional infrastructure integration and will be available in a future update.
                </p>
              </div>
            )}
            
            {isAPIError && (
              <div className="bg-white/50 rounded p-2 mb-2">
                <p className="text-xs font-medium text-red-700 mb-1">🔧 Server Issue</p>
                <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                  <li>Check if backend server is running</li>
                  <li>Verify MAPBOX_TOKEN is configured</li>
                  <li>Check network connectivity</li>
                </ul>
              </div>
            )}
            
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                🔄 Retry Calculation
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (!route) {
    return (
      <Card className="p-4 border-gray-300 bg-gray-50">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <span className="text-4xl mb-2 block">🗺️</span>
            <p className="text-gray-600">Select a shipment to view multi-modal route details</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      {/* Header */}
      <div className="border-b pb-2 mb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {route.is_international ? "🌍 International" : "🏠 Domestic"} Multi-Modal Route
          </h3>
          <div className="flex gap-1">
            {route.transport_modes_used.map((mode, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${getTransportModeColor(mode)}20`,
                  color: getTransportModeColor(mode),
                }}
              >
                {mode.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Duration</div>
          <div className="text-base font-semibold text-gray-900">
            {formatDuration(route.total_duration_hours)}
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Distance</div>
          <div className="text-base font-semibold text-gray-900">
            {Math.round(route.total_distance_km)}km
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Cost</div>
          <div className="text-base font-semibold text-gray-900">
            {formatCost(route.total_cost_usd, "INR")}
          </div>
        </div>
      </div>

      {/* Route Segments */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 mb-1">Route Breakdown:</div>
        {route.segments.map((segment, idx) => (
          <div key={idx}>
            <RouteSegmentItem 
              segment={segment} 
              isLast={idx === route.segments.length - 1}
            />
          </div>
        ))}
      </div>

      {/* Transfer Points */}
      {route.transfer_points.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Transfer Points:
          </div>
          <div className="flex flex-wrap gap-2">
            {route.transfer_points.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs"
              >
                <span>{getLocationTypeIcon(point.type)}</span>
                <span className="font-medium">{point.name}</span>
                <span className="text-gray-500">({point.country})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function RouteSegmentItem({ 
  segment, 
  isLast 
}: { 
  segment: RouteSegment; 
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {/* Mode Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: getTransportModeColor(segment.transport_mode) }}
      >
        {segment.transport_mode === "truck" && "🚛"}
        {segment.transport_mode === "rail" && "🚂"}
        {segment.transport_mode === "ship" && "🚢"}
        {segment.transport_mode === "air" && "✈️"}
      </div>

      {/* Segment Details */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-800 mb-0.5">
          {getTransportModeDisplay(segment.transport_mode)}
        </div>
        <div className="text-xs text-gray-600">
          {getLocationTypeIcon(segment.origin.type)} {segment.origin.name} → {getLocationTypeIcon(segment.destination.type)} {segment.destination.name}
        </div>
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span>📏 {Math.round(segment.distance_km)}km</span>
          <span>⏱️ {formatDuration(segment.duration_hours)}</span>
          <span>💰 {formatCost(segment.cost_usd, "INR")}</span>
        </div>
      </div>

      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[16px] top-[32px] w-0.5 h-[calc(100%+8px)] bg-gray-200" />
      )}
    </div>
  );
}
