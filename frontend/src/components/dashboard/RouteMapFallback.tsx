"use client";

import React from "react";
import { SimulationData } from "@/types/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteMapFallbackProps {
  simulationData: SimulationData;
  height?: string;
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

const getSeverityColor = (severity?: string): string => {
  const colors: { [key: string]: string } = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-green-500",
  };
  return severity ? colors[severity] : "text-blue-500";
};

// Helper to parse duration string like "8h" or "27h" to hours
const parseDuration = (duration: string): number => {
  const match = duration.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

// Helper to parse distance string like "377km" or "1363km" to km
const parseDistance = (distance: string): number => {
  const match = distance.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

// Calculate savings between two routes
const calculateSavings = (routes: { stats: { duration: string; distance: string; cost?: number }; type: string }[]): { timeSaved: string; distanceSaved: string; costSaved: string } => {
  if (routes.length < 2) {
    return { timeSaved: "0 hours", distanceSaved: "0 km", costSaved: "₹0" };
  }
  
  const traditionalRoute = routes.find(r => r.type === "actual") || routes[0];
  const optimizedRoute = routes.find(r => r.type === "optimized") || routes[1];
  
  const traditionalTime = parseDuration(traditionalRoute.stats.duration);
  const optimizedTime = parseDuration(optimizedRoute.stats.duration);
  const timeSaved = Math.max(0, traditionalTime - optimizedTime);
  
  const traditionalDist = parseDistance(traditionalRoute.stats.distance);
  const optimizedDist = parseDistance(optimizedRoute.stats.distance);
  const distanceSaved = Math.max(0, traditionalDist - optimizedDist);
  
  const traditionalCost = traditionalRoute.stats.cost || 0;
  const optimizedCost = optimizedRoute.stats.cost || 0;
  const costSaved = Math.max(0, traditionalCost - optimizedCost);
  
  return {
    timeSaved: `${timeSaved.toFixed(0)} hours`,
    distanceSaved: `${distanceSaved.toFixed(0)} km`,
    costSaved: `₹${costSaved.toLocaleString()}`
  };
};

export default function RouteMapFallback({
  simulationData,
  height = "600px",
}: RouteMapFallbackProps) {
  return (
    <Card className="w-full bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Route Simulator - Static View
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
              <span className="text-muted-foreground">Actual Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-emerald-500"></div>
              <span className="text-muted-foreground">Optimized Route</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 relative overflow-hidden"
          style={{ minHeight: height }}
        >
          {/* Map placeholder with route visualization */}
          <div className="absolute inset-0 opacity-10">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 600"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* US Map outline (simplified) */}
              <path
                d="M100,200 L150,150 L250,160 L300,140 L400,150 L500,160 L600,180 L650,200 L700,240 L680,300 L650,350 L600,380 L500,400 L400,410 L300,400 L200,380 L150,350 L120,300 Z"
                fill="none"
                stroke="#334155"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Route lines */}
          <div className="relative z-10">
            <svg
              className="w-full h-full absolute inset-0"
              viewBox="0 0 800 600"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Actual route (dashed) */}
              <path
                d="M120,400 L180,380 L240,360 L300,340 L360,320 L420,310 L480,300 L540,290 L600,280 L660,270"
                fill="none"
                stroke="#F97316"
                strokeWidth="4"
                strokeDasharray="10,10"
                opacity="0.8"
              />
              {/* Optimized route (solid) */}
              <path
                d="M120,400 L160,360 L220,320 L280,290 L340,270 L400,260 L460,250 L520,245 L580,242 L660,240"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                opacity="0.8"
              />
            </svg>

            {/* Info Box */}
            <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-4 rounded-lg max-w-md">
              <h3 className="font-bold mb-2">⚠️ Mapbox Token Required</h3>
              <p className="text-sm">
                To enable the interactive map, configure your Mapbox access token:
              </p>
              <ol className="text-xs mt-2 space-y-1 ml-4 list-decimal">
                <li>Get a token from <span className="font-mono">https://mapbox.com</span></li>
                <li>Create <span className="font-mono">.env.local</span> file</li>
                <li>Add: <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN=your_token</span></li>
                <li>Restart the development server</li>
              </ol>
            </div>

            {/* Route Comparison Box */}
            <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
              <h3 className="font-bold text-lg mb-3 text-foreground">
                Route Comparison
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {simulationData.routes.map((route) => (
                  <div
                    key={route.id}
                    className="border-l-4 pl-3"
                    style={{ borderColor: route.color }}
                  >
                    <h4 className="font-semibold text-foreground mb-1">
                      {route.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {route.stats.duration} • {route.stats.distance}
                    </p>
                    {route.stats.cost && (
                      <p className="text-sm text-muted-foreground">
                        ${route.stats.cost.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {simulationData.routes.length === 2 && (() => {
                const savings = calculateSavings(simulationData.routes);
                return (
                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Time Saved</p>
                      <p className="font-semibold text-green-500">{savings.timeSaved}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Distance Saved</p>
                      <p className="font-semibold text-green-500">{savings.distanceSaved}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost Saved</p>
                      <p className="font-semibold text-green-500">{savings.costSaved}</p>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="mt-6">
          <h3 className="font-bold text-lg mb-3 text-foreground">
            Key Events Along Routes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {simulationData.events.map((event) => (
              <div
                key={event.id}
                className="bg-card/50 border border-border rounded-lg p-3 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${getSeverityColor(event.severity)}`}>
                      {event.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.description}
                    </p>
                    {event.timestamp && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
