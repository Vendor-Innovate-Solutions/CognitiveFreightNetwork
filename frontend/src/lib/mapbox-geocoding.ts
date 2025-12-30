/**
 * Mapbox Geocoding and Directions API Integration
 * Provides accurate geocoding for any city worldwide and detailed route paths
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export interface GeocodedLocation {
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  country: string;
  region?: string;
  fullName: string;
}

export interface DetailedRoute {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance_km: number;
  duration_hours: number;
  geometry: any; // GeoJSON geometry
}

/**
 * Geocode a city name to get accurate coordinates using Mapbox Geocoding API
 * Works for cities worldwide with high accuracy
 */
export async function geocodeCity(cityName: string): Promise<GeocodedLocation | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    // Use Mapbox Geocoding API with place type filter for cities
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      cityName
    )}.json?types=place,locality,district&limit=1&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.center;

      // Extract country and region from context
      let country = "";
      let region = "";

      if (feature.context) {
        for (const ctx of feature.context) {
          if (ctx.id.startsWith("country")) {
            country = ctx.text;
          } else if (ctx.id.startsWith("region")) {
            region = ctx.text;
          }
        }
      }

      return {
        city: feature.text,
        coordinates: { latitude, longitude },
        country,
        region,
        fullName: feature.place_name,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error geocoding ${cityName}:`, error);
    return null;
  }
}

/**
 * Calculate great circle (straight-line) route between two points
 * Used as fallback for long-distance ocean routes
 */
function calculateGreatCircleRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>
): DetailedRoute {
  const allPoints = [origin, ...(waypoints || []), destination];
  
  // Calculate total distance using Haversine formula
  let totalDistance = 0;
  for (let i = 0; i < allPoints.length - 1; i++) {
    totalDistance += calculateHaversineDistance(allPoints[i], allPoints[i + 1]);
  }
  
  // Generate intermediate points for a smooth curve (25 points per segment)
  const coordinates: Array<{ latitude: number; longitude: number }> = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const segmentPoints = interpolateGreatCircle(allPoints[i], allPoints[i + 1], 25);
    coordinates.push(...segmentPoints);
  }
  
  // Estimate duration (assuming average vessel speed of 25 km/h for ocean freight)
  const duration_hours = totalDistance / 25;
  
  return {
    coordinates,
    distance_km: Math.round(totalDistance),
    duration_hours: parseFloat(duration_hours.toFixed(1)),
    geometry: {
      type: "LineString",
      coordinates: coordinates.map(c => [c.longitude, c.latitude])
    }
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateHaversineDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate points along a great circle path
 */
function interpolateGreatCircle(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  numPoints: number
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat1 = toRadians(start.latitude);
    const lon1 = toRadians(start.longitude);
    const lat2 = toRadians(end.latitude);
    const lon2 = toRadians(end.longitude);
    
    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    );
    
    if (d === 0) {
      points.push({ latitude: start.latitude, longitude: start.longitude });
      continue;
    }
    
    const A = Math.sin((1 - fraction) * d) / Math.sin(d);
    const B = Math.sin(fraction * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    
    points.push({
      latitude: toDegrees(lat),
      longitude: toDegrees(lon)
    });
  }
  
  return points;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Get detailed route between two points using Mapbox Directions API
 * Returns turn-by-turn accurate route with real road geometry
 * Falls back to great circle route for long distances (ocean freight)
 */
export async function getDetailedRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>,
  profile: "driving" | "driving-traffic" | "walking" | "cycling" = "driving-traffic"
): Promise<DetailedRoute | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    // Fall back to great circle route
    return calculateGreatCircleRoute(origin, destination, waypoints);
  }

  // Calculate distance to determine if we should use Mapbox API or great circle
  const distance = calculateHaversineDistance(origin, destination);
  
  // If distance > 500km, use great circle (likely ocean/international route)
  if (distance > 500) {
    console.log(`Distance ${Math.round(distance)}km exceeds 500km threshold, using great circle route`);
    return calculateGreatCircleRoute(origin, destination, waypoints);
  }

  try {
    // Build coordinates string: origin;waypoint1;waypoint2;...;destination
    const allPoints = [origin, ...(waypoints || []), destination];
    const coordsString = allPoints
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");

    // Use Mapbox Directions API with full geometry
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.warn('Mapbox Directions API Error, falling back to great circle:', errorData);
      // Fall back to great circle route
      return calculateGreatCircleRoute(origin, destination, waypoints);
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];

      // Convert GeoJSON coordinates to our format
      const coordinates = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

      return {
        coordinates,
        distance_km: Math.round(route.distance / 1000), // Convert meters to km
        duration_hours: parseFloat((route.duration / 3600).toFixed(1)), // Convert seconds to hours
        geometry: route.geometry,
      };
    }

    // Fall back to great circle if no routes returned
    return calculateGreatCircleRoute(origin, destination, waypoints);
  } catch (error) {
    console.error("Error fetching detailed route, using great circle:", error);
    // Fall back to great circle route
    return calculateGreatCircleRoute(origin, destination, waypoints);
  }
}

/**
 * Batch geocode multiple cities efficiently
 */
export async function geocodeCities(
  cityNames: string[]
): Promise<Map<string, GeocodedLocation>> {
  const results = new Map<string, GeocodedLocation>();

  // Geocode cities in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < cityNames.length; i += batchSize) {
    const batch = cityNames.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (city) => {
        const geocoded = await geocodeCity(city);
        return { city, geocoded };
      })
    );

    batchResults.forEach(({ city, geocoded }) => {
      if (geocoded) {
        results.set(city, geocoded);
      }
    });

    // Rate limiting: wait 100ms between batches
    if (i + batchSize < cityNames.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get optimized route with strategic waypoints
 * Uses Mapbox Optimization API for best route through multiple points
 */
export async function getOptimizedRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints: Array<{ latitude: number; longitude: number }>
): Promise<DetailedRoute | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    // Build coordinates string
    const allPoints = [origin, ...waypoints, destination];
    const coordsString = allPoints
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");

    // Use Mapbox Optimization API
    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsString}?geometries=geojson&overview=full&source=first&destination=last&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Optimization API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.trips && data.trips.length > 0) {
      const trip = data.trips[0];

      const coordinates = trip.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

      return {
        coordinates,
        distance_km: Math.round(trip.distance / 1000),
        duration_hours: parseFloat((trip.duration / 3600).toFixed(1)),
        geometry: trip.geometry,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching optimized route:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get city name
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=place&limit=1&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }

    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}
