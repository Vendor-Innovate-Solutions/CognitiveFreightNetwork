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
    console.error("❌ Mapbox token not configured");
    return null;
  }

  try {
    // First try without country bias for international cities
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      cityName
    )}.json?types=place,locality&limit=1&access_token=${MAPBOX_TOKEN}`;

    console.log(`🗺️  Mapbox Geocoding: ${cityName}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Mapbox Geocoding failed for ${cityName}: ${response.status} ${response.statusText}`);
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const result = parseGeocodingResult(data.features[0]);
      console.log(`✅ Geocoded ${cityName}: ${result.fullName} (${result.coordinates.latitude.toFixed(4)}, ${result.coordinates.longitude.toFixed(4)})`);
      return result;
    }

    console.error(`❌ No geocoding results found for ${cityName}`);
    return null;
  } catch (error) {
    console.error(`❌ Error geocoding ${cityName}:`, error);
    return null;
  }
}

/**
 * Parse geocoding result from Mapbox API response
 */
function parseGeocodingResult(feature: any): GeocodedLocation {
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

/**
 * Get detailed route between two points using Mapbox Directions API
 * Returns turn-by-turn accurate route with real road geometry
 */
export async function getDetailedRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>,
  profile: "driving" | "driving-traffic" | "walking" | "cycling" = "driving-traffic"
): Promise<DetailedRoute | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    // Calculate straight-line distance to check if route is too long
    const distance = calculateHaversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    // For very long routes (>800km), use segmented approach for more detail
    if (distance > 800) {
      console.log(`Long distance route (${distance}km), using segmented approach`);
      return getDetailedRouteWithWaypoints(origin, destination, 400);
    }

    // Mapbox Directions API has a limit of 25 coordinates total
    // If too many waypoints, reduce them
    let filteredWaypoints = waypoints || [];
    if (filteredWaypoints.length > 23) {
      // Keep only evenly distributed waypoints
      const step = Math.ceil(filteredWaypoints.length / 23);
      filteredWaypoints = filteredWaypoints.filter((_, index) => index % step === 0).slice(0, 23);
    }

    // Build coordinates string: origin;waypoint1;waypoint2;...;destination
    const allPoints = [origin, ...filteredWaypoints, destination];
    const coordsString = allPoints
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");

    // Use Mapbox Directions API with full geometry
    // For long routes or specific countries, prefer 'driving' over 'driving-traffic' for better routing
    // Add exclude=ferry to ensure it routes on land roads only
    const actualProfile = distance > 1000 ? 'driving' : profile;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${actualProfile}/${coordsString}?geometries=geojson&overview=full&steps=true&alternatives=false&continue_straight=false&exclude=ferry&access_token=${MAPBOX_TOKEN}`;

    console.log(`Fetching route: ${actualProfile}, points: ${allPoints.length}, distance: ${distance}km`);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Directions API error (${response.status}):`, errorText);
      
      // Check if it's a distance limitation error
      if (errorText.includes("maximum distance") || errorText.includes("InvalidInput")) {
        console.log("Route exceeds API limits, using segmented route");
        return getDetailedRouteWithWaypoints(origin, destination, 400);
      }
      
      // If driving-traffic fails, fallback to regular driving
      if (profile === "driving-traffic") {
        console.log("Falling back to regular driving profile");
        return getDetailedRoute(origin, destination, waypoints, "driving");
      }
      
      // Last resort: create direct route
      return createDirectRoute(origin, destination, distance);
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

    return createDirectRoute(origin, destination, distance);
  } catch (error) {
    console.error("Error fetching detailed route:", error);
    // Fallback to direct route on any error
    const distance = calculateHaversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );
    return createDirectRoute(origin, destination, distance);
  }
}

/**
 * Calculate Haversine distance between two coordinates in kilometers
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Create a curved route with realistic waypoints
 * Used as fallback when API fails or distance is too long
 */
function createDirectRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  distance: number
): DetailedRoute {
  const coordinates: Array<{ latitude: number; longitude: number }> = [];
  
  // Calculate the number of points based on distance (more points for longer routes)
  const numPoints = Math.min(50, Math.max(10, Math.floor(distance / 50)));
  
  // Add origin
  coordinates.push(origin);
  
  // Create a more realistic curved path with slight variations
  // This simulates a road network rather than a straight line
  for (let i = 1; i < numPoints; i++) {
    const fraction = i / numPoints;
    
    // Base interpolation
    const baseLat = origin.latitude + (destination.latitude - origin.latitude) * fraction;
    const baseLng = origin.longitude + (destination.longitude - origin.longitude) * fraction;
    
    // Add slight curve to simulate road networks
    // Use sine wave to create natural-looking curves
    const curveOffset = Math.sin(fraction * Math.PI) * 0.3; // Maximum 0.3 degree offset
    const perpLat = -(destination.longitude - origin.longitude) * 0.001 * curveOffset;
    const perpLng = (destination.latitude - origin.latitude) * 0.001 * curveOffset;
    
    coordinates.push({
      latitude: baseLat + perpLat,
      longitude: baseLng + perpLng,
    });
  }
  
  // Add destination
  coordinates.push(destination);

  // Estimate duration based on distance (average 65 km/h including stops)
  const duration_hours = parseFloat((distance / 65).toFixed(1));

  return {
    coordinates,
    distance_km: distance,
    duration_hours,
    geometry: {
      type: "LineString",
      coordinates: coordinates.map((c) => [c.longitude, c.latitude]),
    },
  };
}

/**
 * Get route with strategic waypoints for long distances
 * Breaks long routes into segments and fetches each separately
 */
export async function getDetailedRouteWithWaypoints(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  maxSegmentDistance: number = 500
): Promise<DetailedRoute | null> {
  const totalDistance = calculateHaversineDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  // If route is short enough, use regular API
  if (totalDistance <= maxSegmentDistance) {
    return getDetailedRoute(origin, destination, undefined, "driving");
  }

  try {
    // Calculate number of segments needed
    const numSegments = Math.ceil(totalDistance / maxSegmentDistance);
    const segmentRoutes: DetailedRoute[] = [];

    // Create waypoints along the route
    for (let i = 0; i < numSegments; i++) {
      const startFraction = i / numSegments;
      const endFraction = (i + 1) / numSegments;

      const segmentStart = i === 0 ? origin : {
        latitude: origin.latitude + (destination.latitude - origin.latitude) * startFraction,
        longitude: origin.longitude + (destination.longitude - origin.longitude) * startFraction,
      };

      const segmentEnd = i === numSegments - 1 ? destination : {
        latitude: origin.latitude + (destination.latitude - origin.latitude) * endFraction,
        longitude: origin.longitude + (destination.longitude - origin.longitude) * endFraction,
      };

      const segmentRoute = await getDetailedRoute(segmentStart, segmentEnd, undefined, "driving");
      
      if (segmentRoute) {
        segmentRoutes.push(segmentRoute);
      }
    }

    if (segmentRoutes.length === 0) {
      return createDirectRoute(origin, destination, totalDistance);
    }

    // Combine all segment routes
    const allCoordinates: Array<{ latitude: number; longitude: number }> = [];
    let totalSegmentDistance = 0;
    let totalSegmentDuration = 0;

    segmentRoutes.forEach((segment, index) => {
      // Add all coordinates except the last one (to avoid duplicates at segment boundaries)
      if (index < segmentRoutes.length - 1) {
        allCoordinates.push(...segment.coordinates.slice(0, -1));
      } else {
        allCoordinates.push(...segment.coordinates);
      }
      totalSegmentDistance += segment.distance_km;
      totalSegmentDuration += segment.duration_hours;
    });

    return {
      coordinates: allCoordinates,
      distance_km: totalSegmentDistance,
      duration_hours: parseFloat(totalSegmentDuration.toFixed(1)),
      geometry: {
        type: "LineString",
        coordinates: allCoordinates.map((c) => [c.longitude, c.latitude]),
      },
    };
  } catch (error) {
    console.error("Error creating segmented route:", error);
    return createDirectRoute(origin, destination, totalDistance);
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
