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
    // Build coordinates string: origin;waypoint1;waypoint2;...;destination
    const allPoints = [origin, ...(waypoints || []), destination];
    const coordsString = allPoints
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");

    // Use Mapbox Directions API with full geometry
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.statusText}`);
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

    return null;
  } catch (error) {
    console.error("Error fetching detailed route:", error);
    return null;
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
