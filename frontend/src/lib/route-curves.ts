/**
 * Route Curve Generation Utilities
 * Generates smooth, geodesic curves for air and sea routes
 * Uses Turf.js for geographic calculations
 */

import * as turf from '@turf/turf';

export type TransportMode = 'truck' | 'rail' | 'ship' | 'air';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Generate a smooth curved line for air routes using great circle path with Bézier interpolation
 * Creates realistic flight arcs that follow the curvature of the Earth
 */
export function generateAirRouteCurve(
  start: Coordinate,
  end: Coordinate,
  options: { numPoints?: number; curveIntensity?: number } = {}
): Coordinate[] {
  const { numPoints = 50, curveIntensity = 0.2 } = options;

  // Create GeoJSON points
  const startPoint = turf.point([start.longitude, start.latitude]);
  const endPoint = turf.point([end.longitude, end.latitude]);

  // Calculate the great circle line
  const greatCircle = turf.greatCircle(startPoint, endPoint, { npoints: numPoints });

  if (!greatCircle || greatCircle.geometry.type !== 'LineString') {
    return [start, end];
  }

  // Apply Bézier-like smoothing by adjusting intermediate points
  const coordinates = greatCircle.geometry.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  // Add slight arc elevation for visual effect
  const arcCoordinates = coordinates.map((coord, index) => {
    if (index === 0 || index === coordinates.length - 1) {
      return coord;
    }

    // Calculate arc offset - peaks at the middle
    const progress = index / (coordinates.length - 1);
    const arcFactor = Math.sin(progress * Math.PI) * curveIntensity;
    
    // Apply perpendicular offset to create arc
    const bearing = turf.bearing(startPoint, endPoint);
    const offsetBearing = bearing + 90; // Perpendicular to route
    const distance = turf.distance(startPoint, endPoint);
    const offsetDistance = distance * arcFactor;

    const currentPoint = turf.point([coord.longitude, coord.latitude]);
    const offsetPoint = turf.destination(currentPoint, offsetDistance, offsetBearing);

    return {
      latitude: offsetPoint.geometry.coordinates[1],
      longitude: offsetPoint.geometry.coordinates[0],
    };
  });

  return arcCoordinates;
}

/**
 * Generate a smooth curved line for sea routes using geodesic interpolation
 * Creates realistic shipping routes that follow ocean paths
 */
export function generateSeaRouteCurve(
  start: Coordinate,
  end: Coordinate,
  options: { numPoints?: number; curveIntensity?: number } = {}
): Coordinate[] {
  const { numPoints = 40, curveIntensity = 0.15 } = options;

  // Create GeoJSON points
  const startPoint = turf.point([start.longitude, start.latitude]);
  const endPoint = turf.point([end.longitude, end.latitude]);

  // Calculate the great circle line (geodesic path)
  const greatCircle = turf.greatCircle(startPoint, endPoint, { npoints: numPoints });

  if (!greatCircle || greatCircle.geometry.type !== 'LineString') {
    return [start, end];
  }

  const coordinates = greatCircle.geometry.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  // Add subtle curvature for sea routes (less pronounced than air)
  const curvedCoordinates = coordinates.map((coord, index) => {
    if (index === 0 || index === coordinates.length - 1) {
      return coord;
    }

    const progress = index / (coordinates.length - 1);
    const arcFactor = Math.sin(progress * Math.PI) * curveIntensity;
    
    const bearing = turf.bearing(startPoint, endPoint);
    const offsetBearing = bearing + 90;
    const distance = turf.distance(startPoint, endPoint);
    const offsetDistance = distance * arcFactor;

    const currentPoint = turf.point([coord.longitude, coord.latitude]);
    const offsetPoint = turf.destination(currentPoint, offsetDistance, offsetBearing);

    return {
      latitude: offsetPoint.geometry.coordinates[1],
      longitude: offsetPoint.geometry.coordinates[0],
    };
  });

  return curvedCoordinates;
}

/**
 * Generate a straight line for road/rail routes with intermediate waypoints
 * Uses linear interpolation between waypoints
 */
export function generateRoadRailRoute(
  waypoints: Coordinate[],
  options: { pointsPerSegment?: number } = {}
): Coordinate[] {
  const { pointsPerSegment = 10 } = options;

  if (waypoints.length < 2) {
    return waypoints;
  }

  const allPoints: Coordinate[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    // Create a straight line segment with interpolation
    const line = turf.lineString([
      [start.longitude, start.latitude],
      [end.longitude, end.latitude],
    ]);

    const length = turf.length(line);
    const segmentPoints = Math.max(2, Math.ceil(length / 50) * pointsPerSegment);

    for (let j = 0; j < segmentPoints; j++) {
      const fraction = j / (segmentPoints - 1);
      const interpolatedPoint = turf.along(line, length * fraction);
      
      allPoints.push({
        latitude: interpolatedPoint.geometry.coordinates[1],
        longitude: interpolatedPoint.geometry.coordinates[0],
      });
    }
  }

  // Remove duplicates
  return allPoints.filter((point, index, arr) => {
    if (index === 0) return true;
    const prev = arr[index - 1];
    return point.latitude !== prev.latitude || point.longitude !== prev.longitude;
  });
}

/**
 * Generate smooth transitions at transfer points (ports/airports)
 * Creates a smooth connection between two route segments
 */
export function generateTransferTransition(
  fromPoint: Coordinate,
  transferPoint: Coordinate,
  toPoint: Coordinate,
  options: { numPoints?: number } = {}
): Coordinate[] {
  const { numPoints = 8 } = options;

  const point1 = turf.point([fromPoint.longitude, fromPoint.latitude]);
  const point2 = turf.point([transferPoint.longitude, transferPoint.latitude]);
  const point3 = turf.point([toPoint.longitude, toPoint.latitude]);

  // Create a smooth curve through the three points
  const controlPoints = [point1, point2, point3];
  
  try {
    // Use Bézier spline for smooth transitions
    const bezierSpline = turf.bezierSpline(turf.lineString(
      controlPoints.map(p => p.geometry.coordinates)
    ), { resolution: numPoints });

    return bezierSpline.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch {
    // Fallback to linear interpolation if Bézier fails
    return [fromPoint, transferPoint, toPoint];
  }
}

/**
 * Determine the appropriate curve generation function based on transport mode
 */
export function generateCurveForMode(
  transportMode: TransportMode,
  waypoints: Coordinate[],
  options: { numPoints?: number; curveIntensity?: number } = {}
): Coordinate[] {
  if (waypoints.length < 2) {
    return waypoints;
  }

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];

  switch (transportMode) {
    case 'air':
      return generateAirRouteCurve(start, end, options);
    case 'ship':
      return generateSeaRouteCurve(start, end, options);
    case 'truck':
    case 'rail':
      return generateRoadRailRoute(waypoints, { pointsPerSegment: options.numPoints || 10 });
    default:
      return waypoints;
  }
}

/**
 * Get style configuration for a transport mode
 */
export function getTransportModeStyle(mode: TransportMode): {
  color: string;
  dashArray: number[];
  width: number;
  animated?: boolean;
} {
  switch (mode) {
    case 'truck':
      return {
        color: '#10B981', // Green
        dashArray: [1, 0], // Solid
        width: 4,
      };
    case 'rail':
      return {
        color: '#6366F1', // Indigo
        dashArray: [1, 0], // Solid
        width: 4,
      };
    case 'ship':
      return {
        color: '#3B82F6', // Blue
        dashArray: [4, 4], // Dashed
        width: 3,
        animated: true,
      };
    case 'air':
      return {
        color: '#EC4899', // Pink
        dashArray: [2, 6], // Dotted
        width: 3,
        animated: true,
      };
    default:
      return {
        color: '#6B7280', // Gray
        dashArray: [1, 0],
        width: 3,
      };
  }
}
