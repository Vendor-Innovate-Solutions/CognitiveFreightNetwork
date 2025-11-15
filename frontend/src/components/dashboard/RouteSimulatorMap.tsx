"use client";

import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { SimulationData, Route, RouteEvent, RouteSegment } from "@/types/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteMapFallback from "./RouteMapFallback";
import { 
  generateCurveForMode, 
  getTransportModeStyle
} from "@/lib/route-curves";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface RouteSimulatorMapProps {
  simulationData: SimulationData;
  height?: string;
  className?: string;
}

const getEventIcon = (eventType: string): string => {
  const icons: { [key: string]: string } = {
    congestion: "⚠️",
    reroute: "🔀",
    origin: "🏁",
    destination: "🎯",
    delay: "⏱️",
    checkpoint: "📍",
  };
  return icons[eventType] || "📍";
};

const getEventColor = (severity?: string): string => {
  const colors: { [key: string]: string } = {
    high: "#DC2626",
    medium: "#F59E0B",
    low: "#10B981",
  };
  return severity ? colors[severity] : "#3B82F6";
};

function RouteSimulatorMapInner({
  simulationData,
  height = "600px",
  className = "",
}: RouteSimulatorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [weatherAlongRoute, setWeatherAlongRoute] = useState<
    {
      latitude: number;
      longitude: number;
      temperature?: number;
      windspeed?: number;
      winddirection?: number;
      weathercode?: number;
    }[]
  >([]);
  const weatherCache = useRef<Record<string, {
    temperature?: number;
    windspeed?: number;
    winddirection?: number;
    weathercode?: number;
  }>>({});

  const fitMapToRoutes = React.useCallback(() => {
    if (!map.current) return;

    const bounds = new mapboxgl.LngLatBounds();

    simulationData.routes.forEach((route) => {
      // Use segment coordinates if available, otherwise use route coordinates
      if (route.segments && route.segments.length > 0) {
        route.segments.forEach(segment => {
          segment.coordinates.forEach((coord) => {
            bounds.extend([coord.longitude, coord.latitude]);
          });
        });
      } else {
        route.coordinates.forEach((coord) => {
          bounds.extend([coord.longitude, coord.latitude]);
        });
      }
    });

    simulationData.events.forEach((event) => {
      bounds.extend([event.location.longitude, event.location.latitude]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });
  }, [simulationData]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [86.5, 22.5],
        zoom: 6,
      });

      map.current.on("load", () => {
        if (!map.current) return;

        simulationData.routes.forEach((route) => {
          addRouteToMap(route);
        });

        simulationData.events.forEach((event) => {
          addEventMarker(event);
        });

        fitMapToRoutes();

        setIsLoading(false);
      });

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Failed to load map. Please check your Mapbox token.");
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationData, fitMapToRoutes]);

  const addRouteToMap = (route: Route) => {
    if (!map.current) return;

    // If route has multi-modal segments, render each segment separately
    if (route.segments && route.segments.length > 0) {
      route.segments.forEach((segment, index) => {
        addRouteSegmentToMap(segment, route, index);
      });
    } else {
      // Legacy single-route rendering with basic styling
      addLegacyRouteToMap(route);
    }
  };

  const addRouteSegmentToMap = (segment: RouteSegment, parentRoute: Route, segmentIndex: number) => {
    if (!map.current) return;

    // Generate curved coordinates for sea/air, straight for road/rail
    const curvedCoordinates = generateCurveForMode(
      segment.transportMode,
      segment.coordinates,
      { numPoints: 50, curveIntensity: 0.2 }
    );

    const coordinates = curvedCoordinates.map((coord) => [
      coord.longitude,
      coord.latitude,
    ]);

    // Get style for this transport mode
    const modeStyle = getTransportModeStyle(segment.transportMode);

    const sourceId = `route-segment-${parentRoute.id}-${segmentIndex}`;
    const layerId = `route-segment-layer-${parentRoute.id}-${segmentIndex}`;

    // Determine layer group for proper rendering order
    const layerGroup = segment.transportMode === 'ship' || segment.transportMode === 'air' 
      ? 'sea-air' 
      : 'road-rail';

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {
          name: parentRoute.name,
          segment: segmentIndex,
          transportMode: segment.transportMode,
          layerGroup: layerGroup,
        },
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      },
    });

    map.current.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": modeStyle.color,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5, modeStyle.width * 0.5,
          10, modeStyle.width,
          15, modeStyle.width * 1.5
        ],
        "line-dasharray": modeStyle.dashArray,
        "line-opacity": 0.85,
      },
    });

    // Add animation for sea/air routes
    if (modeStyle.animated) {
      animateRouteLine(layerId);
    }

    // Add hover interactions
    map.current.on("mouseenter", layerId, (e) => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "pointer";
      }
      if (e.features && e.features[0]?.properties) {
        setSelectedRoute({
          ...parentRoute,
          stats: {
            ...parentRoute.stats,
            distance: segment.distance || parentRoute.stats.distance,
            duration: segment.duration || parentRoute.stats.duration,
          },
        });
      }
    });

    map.current.on("mouseleave", layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "";
      }
      setSelectedRoute(null);
      setWeatherAlongRoute([]);
    });
  };

  const addLegacyRouteToMap = (route: Route) => {
    if (!map.current) return;

    const coordinates = route.coordinates.map((coord) => [
      coord.longitude,
      coord.latitude,
    ]);

    const sourceId = `route-${route.id}`;
    const layerId = `route-layer-${route.id}`;

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {
          name: route.name,
          type: route.type,
          duration: route.stats.duration,
          distance: route.stats.distance,
          cost: route.stats.cost,
        },
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      },
    });

    map.current.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": route.color,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5, 2,
          10, 4,
          15, 6
        ],
        "line-dasharray": route.style === "dashed" ? [2, 2] : [1, 0],
        "line-opacity": 0.9,
      },
    });

    map.current.on("mouseenter", layerId, (e) => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "pointer";
      }
      if (e.features && e.features[0]?.properties) {
        const properties = e.features[0].properties;
        setSelectedRoute({
          ...route,
          stats: {
            duration: properties.duration,
            distance: properties.distance,
            cost: properties.cost,
          },
        });
      }
    });

    map.current.on("mouseleave", layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "";
      }
      setSelectedRoute(null);
      setWeatherAlongRoute([]);
    });
  };

  const animateRouteLine = (layerId: string) => {
    if (!map.current) return;

    let dashOffset = 0;

    const animate = () => {
      if (!map.current) return;

      dashOffset -= 0.5;
      if (dashOffset < -100) {
        dashOffset = 0;
      }

      try {
        map.current.setPaintProperty(layerId, "line-dasharray", [4, 4]);
        map.current.setPaintProperty(layerId, "line-dasharray", [
          Math.abs(dashOffset % 8),
          8 - Math.abs(dashOffset % 8),
        ]);
      } catch {
        // Layer might not exist anymore
        return;
      }

      requestAnimationFrame(animate);
    };

    // Start animation
    requestAnimationFrame(animate);
  };

  const addEventMarker = (event: RouteEvent) => {
    if (!map.current) return;

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.fontSize = "24px";
    el.style.cursor = "pointer";
    el.innerHTML = getEventIcon(event.type);

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
    }).setHTML(`
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${getEventColor(event.severity)};">
          ${event.title}
        </h3>
        <p style="margin: 0; font-size: 14px; color: #666;">
          ${event.description}
        </p>
        ${event.timestamp ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">
          ${new Date(event.timestamp).toLocaleString()}
        </p>` : ""}
      </div>
    `);

    const marker = new mapboxgl.Marker(el)
      .setLngLat([event.location.longitude, event.location.latitude])
      .setPopup(popup)
      .addTo(map.current);

    el.addEventListener("mouseenter", () => {
      popup.addTo(map.current!);
    });

    el.addEventListener("click", () => {
      marker.togglePopup();
    });
  };

  const fetchWeatherForRoute = async (route: Route | null) => {
    if (!route) {
      setWeatherAlongRoute([]);
      return;
    }

    const coords = route.coordinates || [];
    if (!coords.length) return;

    const maxPoints = 8;
    const step = Math.max(1, Math.floor(coords.length / maxPoints));
    const sampled = coords.filter((_, i) => i % step === 0);

    const results: {
      latitude: number;
      longitude: number;
      temperature?: number;
      windspeed?: number;
      winddirection?: number;
      weathercode?: number;
    }[] = [];

    await Promise.all(
      sampled.map(async (pt) => {
        const key = `${pt.latitude.toFixed(5)},${pt.longitude.toFixed(5)}`;
        if (weatherCache.current[key]) {
          results.push({
            latitude: pt.latitude,
            longitude: pt.longitude,
            ...weatherCache.current[key],
          });
          return;
        }

        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${pt.latitude}&longitude=${pt.longitude}&current_weather=true`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("weather fetch failed");
          const json = await res.json();
          const cw = json.current_weather || {};
          weatherCache.current[key] = cw;
          results.push({
            latitude: pt.latitude,
            longitude: pt.longitude,
            temperature: cw.temperature,
            windspeed: cw.windspeed,
            winddirection: cw.winddirection,
            weathercode: cw.weathercode,
          });
        } catch {
          results.push({ latitude: pt.latitude, longitude: pt.longitude });
        }
      })
    );

    setWeatherAlongRoute(results);
  };

  useEffect(() => {
    fetchWeatherForRoute(selectedRoute);
  }, [selectedRoute]);

  if (error) {
    return (
      <Card className="w-full bg-card/95 backdrop-blur-sm border border-border/40">
        <CardHeader>
          <CardTitle>Route Simulator Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            <div className="text-center">
              <p className="text-red-500 mb-2">⚠️ {error}</p>
              <p className="text-sm">
                To enable the map, set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable
                with your Mapbox access token.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Route Simulator Map
            </CardTitle>
            {simulationData.metadata?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {simulationData.metadata.description}
              </p>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-orange-500 border-2 border-dashed border-orange-500"></div>
              <span className="text-muted-foreground">Traditional Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-emerald-500"></div>
              <span className="text-muted-foreground">AI-Optimized Route</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div
          ref={mapContainer}
          className={`map-container ${className}`}
          style={{ height }}
        />
        
        {selectedRoute && (
          <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg max-w-xs z-10">
            <h3 className="font-bold text-lg mb-2 text-card-foreground">
              {selectedRoute.name}
            </h3>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <span className="font-semibold">Duration:</span>{" "}
                {selectedRoute.stats.duration}
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold">Distance:</span>{" "}
                {selectedRoute.stats.distance}
              </p>
              {selectedRoute.stats.cost && (
                <p className="text-muted-foreground">
                  <span className="font-semibold">Cost:</span> ₹
                  {selectedRoute.stats.cost.toLocaleString()}
                </p>
              )}
              {weatherAlongRoute.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-card-foreground">Weather along route</p>
                  <div className="mt-2 space-y-2 text-xs text-muted-foreground max-h-40 overflow-auto">
                    {weatherAlongRoute.map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-card-foreground">Point {idx + 1}</div>
                          <div className="text-muted-foreground">{w.latitude.toFixed(3)}, {w.longitude.toFixed(3)}</div>
                        </div>
                        <div className="text-right">
                          {typeof w.temperature !== "undefined" ? (
                            <div className="font-semibold text-card-foreground">{w.temperature}°C</div>
                          ) : (
                            <div className="text-muted-foreground">N/A</div>
                          )}
                          {typeof w.windspeed !== "undefined" && (
                            <div className="text-muted-foreground">{w.windspeed} km/h</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 w-80 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-card-foreground flex items-center gap-2">
              🌤️ Route Weather
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[
              { name: "Kolkata", lat: 22.57, lon: 88.36, temp: 28, weather: "☀️" },
              { name: "Vizag", lat: 17.69, lon: 83.22, temp: 30, weather: "🌤️" },
              { name: "Chennai", lat: 13.08, lon: 80.27, temp: 31, weather: "☁️" },
              { name: "Paradip", lat: 20.32, lon: 86.62, temp: 29, weather: "⛅" },
              { name: "Bay Center", lat: 15.0, lon: 85.0, temp: 27, weather: "🌈" },
            ].map((loc, idx) => (
              <div
                key={idx}
                className="bg-background/60 rounded-md p-2 border border-border hover:border-muted transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-card-foreground font-semibold text-xs truncate">{loc.name}</p>
                    <p className="text-muted-foreground text-xs">{loc.lat}°, {loc.lon}°</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="text-xl">{loc.weather}</div>
                    <div className="text-card-foreground font-bold text-sm">{loc.temp}°C</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg z-10">
          <h3 className="font-bold text-lg mb-3 text-card-foreground">
            Route Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {simulationData.routes.map((route) => (
              <div
                key={route.id}
                className="border-l-4 pl-3"
                style={{ borderColor: route.color }}
              >
                <h4 className="font-semibold text-card-foreground mb-1">
                  {route.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {route.stats.duration} • {route.stats.distance}
                </p>
                {route.stats.cost && (
                  <p className="text-sm text-muted-foreground">
                    ₹{route.stats.cost.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
          {simulationData.routes.length === 2 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Time Saved</p>
                  <p className="font-semibold text-card-foreground">4 hours</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Distance Saved</p>
                  <p className="font-semibold text-card-foreground">55 km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost Saved</p>
                  <p className="font-semibold text-card-foreground">₹40,000</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RouteSimulatorMap(props: RouteSimulatorMapProps) {
  if (!MAPBOX_TOKEN) {
    return <RouteMapFallback simulationData={props.simulationData} height={props.height} />;
  }

  return <RouteSimulatorMapInner {...props} />;
}
