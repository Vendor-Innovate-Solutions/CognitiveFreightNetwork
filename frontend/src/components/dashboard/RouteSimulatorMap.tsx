"use client";

import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { SimulationData, Route, RouteEvent } from "@/types/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteMapFallback from "./RouteMapFallback";

// Note: In production, this should be an environment variable
// For demo purposes, using a placeholder
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fitMapToRoutes = React.useCallback(() => {
    if (!map.current) return;

    const bounds = new mapboxgl.LngLatBounds();

    // Add all route coordinates to bounds
    simulationData.routes.forEach((route) => {
      route.coordinates.forEach((coord) => {
        bounds.extend([coord.longitude, coord.latitude]);
      });
    });

    // Add event locations to bounds
    simulationData.events.forEach((event) => {
      bounds.extend([event.location.longitude, event.location.latitude]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });
  }, [simulationData]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Trigger map resize after fullscreen toggle
    setTimeout(() => {
      if (map.current) {
        map.current.resize();
        fitMapToRoutes();
      }
    }, 100);
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
            fitMapToRoutes();
          }
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, fitMapToRoutes]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [86.5, 22.5], // Eastern India (Bay of Bengal region)
        zoom: 6,
      });

      map.current.on("load", () => {
        if (!map.current) return;

        // Add routes
        simulationData.routes.forEach((route) => {
          addRouteToMap(route);
        });

        // Add event markers
        simulationData.events.forEach((event) => {
          addEventMarker(event);
        });

        // Fit bounds to show all routes
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
  }, [simulationData, fitMapToRoutes]);

  const addRouteToMap = (route: Route) => {
    if (!map.current) return;

    const coordinates = route.coordinates.map((coord) => [
      coord.longitude,
      coord.latitude,
    ]);

    const sourceId = `route-${route.id}`;
    const layerId = `route-layer-${route.id}`;

    // Add source
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

    // Add line layer
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
        "line-width": 4,
        "line-dasharray": route.style === "dashed" ? [2, 2] : [1, 0],
        "line-opacity": 0.9,
      },
    });

    // Add hover effect
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
    });
  };

  const addEventMarker = (event: RouteEvent) => {
    if (!map.current) return;

    // Create a DOM element for the marker
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.fontSize = "24px";
    el.style.cursor = "pointer";
    el.innerHTML = getEventIcon(event.type);

    // Create popup
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

    // Create marker
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
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}>
      <Card className={`w-full bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden ${isFullscreen ? "h-screen rounded-none" : ""}`}>
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
            <div className="flex items-center gap-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-[#F97316] border-2 border-dashed border-[#F97316]"></div>
                  <span className="text-muted-foreground">Traditional Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-[#10B981]"></div>
                  <span className="text-muted-foreground">AI-Optimized Route</span>
                </div>
              </div>
              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200 text-primary hover:text-primary-foreground group"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div
          ref={mapContainer}
          className={`map-container ${className}`}
          style={{ height: isFullscreen ? "calc(100vh - 120px)" : height }}
        />
        
        {/* Route Info Sidebar - Moved to top-left and made smaller */}
        {selectedRoute && (
          <div className={`absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-10 ${isFullscreen ? 'max-w-sm' : 'max-w-xs'}`}>
            <h3 className="font-bold text-base mb-2 text-foreground">
              {selectedRoute.name}
            </h3>
            <div className="space-y-1 text-xs">
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
            </div>
          </div>
        )}

        {/* Comparison Stats - Repositioned to bottom-right corner */}
        <div className={`absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-10 ${isFullscreen ? 'max-w-md' : 'max-w-xs'}`}>
          <h3 className="font-bold text-base mb-2 text-foreground">
            Route Comparison
          </h3>
          <div className="space-y-2">
            {simulationData.routes.map((route) => (
              <div
                key={route.id}
                className="border-l-3 pl-2"
                style={{ borderColor: route.color }}
              >
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  {route.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {route.stats.duration} • {route.stats.distance}
                </p>
                {route.stats.cost && (
                  <p className="text-xs text-muted-foreground">
                    ₹{route.stats.cost.toLocaleString()}
                  </p>
                )}
                {/* Route Path Description - Condensed */}
                {route.description && (
                  <div className="mt-1 p-1.5 bg-background/60 rounded text-xs">
                    <p className="font-medium text-foreground text-xs mb-0.5">
                      {route.type === 'optimized' ? '🤖 AI:' : '🛣️ Traditional:'}
                    </p>
                    <p className="text-muted-foreground text-xs leading-tight">
                      {route.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {simulationData.routes.length === 2 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Time Saved:</p>
                  <p className="font-semibold text-success">
                    {(() => {
                      const traditional = simulationData.routes.find(r => r.type === 'actual');
                      const optimized = simulationData.routes.find(r => r.type === 'optimized');
                      if (traditional && optimized) {
                        const traditionalHours = parseInt(traditional.stats.duration);
                        const optimizedHours = parseInt(optimized.stats.duration);
                        const saved = traditionalHours - optimizedHours;
                        return saved > 0 ? `${saved} hours` : 'Optimal time';
                      }
                      return '4 hours';
                    })()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Distance Saved:</p>
                  <p className="font-semibold text-success">
                    {(() => {
                      const traditional = simulationData.routes.find(r => r.type === 'actual');
                      const optimized = simulationData.routes.find(r => r.type === 'optimized');
                      if (traditional && optimized) {
                        const traditionalKm = parseInt(traditional.stats.distance);
                        const optimizedKm = parseInt(optimized.stats.distance);
                        const saved = traditionalKm - optimizedKm;
                        return saved > 0 ? `${saved} km` : 'Optimal route';
                      }
                      return '55 km';
                    })()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Cost Saved:</p>
                  <p className="font-semibold text-success">
                    {(() => {
                      const traditional = simulationData.routes.find(r => r.type === 'actual');
                      const optimized = simulationData.routes.find(r => r.type === 'optimized');
                      if (traditional && optimized && traditional.stats.cost && optimized.stats.cost) {
                        const saved = traditional.stats.cost - optimized.stats.cost;
                        return saved > 0 ? `₹${saved.toLocaleString()}` : 'Optimal cost';
                      }
                      return '₹40,000';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

export default function RouteSimulatorMap(props: RouteSimulatorMapProps) {
  // If no Mapbox token, show fallback
  if (!MAPBOX_TOKEN) {
    return <RouteMapFallback simulationData={props.simulationData} height={props.height} />;
  }

  return <RouteSimulatorMapInner {...props} />;
}
