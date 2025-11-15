"use client";

import React, { useState } from "react";
import RouteSimulatorMap from "@/components/dashboard/RouteSimulatorMap";
import { Card } from "@/components/ui/card";
import { multiModalSimulationData, coastalShippingData } from "@/data/MultiModalSimulationData";
import { mockSimulationData } from "@/data/RouteSimulationData";

export default function RouteVisualizationDemo() {
  const [selectedDemo, setSelectedDemo] = useState<"multimodal" | "coastal" | "railway">("multimodal");

  const demoData = {
    multimodal: multiModalSimulationData,
    coastal: coastalShippingData,
    railway: mockSimulationData,
  };

  const demoDescriptions = {
    multimodal: "Mumbai to Singapore - Shows curved air routes (pink dotted) and sea routes (blue dashed) vs straight truck routes (green solid)",
    coastal: "Chennai to Kolkata - Demonstrates geodesic curves for coastal shipping with rail connections",
    railway: "Paradip to Jamshedpur - Traditional vs AI-optimized railway routes (original example)",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🗺️ Route Visualization Demo
        </h1>
        <p className="text-muted-foreground">
          Demonstrating curved geodesic lines for sea/air routes and layer-separated multi-modal rendering
        </p>
      </div>

      {/* Demo Selector */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-4">
            <span className="text-card-foreground font-semibold">Select Demo:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDemo("multimodal")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "multimodal"
                    ? "bg-primary text-white shadow-lg"
                    : "bg-background text-muted-foreground border border-border hover:border-primary"
                }`}
              >
                🌍 Multi-Modal (Sea/Air)
              </button>
              <button
                onClick={() => setSelectedDemo("coastal")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "coastal"
                    ? "bg-primary text-white shadow-lg"
                    : "bg-background text-muted-foreground border border-border hover:border-primary"
                }`}
              >
                🚢 Coastal Shipping
              </button>
              <button
                onClick={() => setSelectedDemo("railway")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "railway"
                    ? "bg-primary text-white shadow-lg"
                    : "bg-background text-muted-foreground border border-border hover:border-primary"
                }`}
              >
                🚂 Railway Routes
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-3">
            {demoDescriptions[selectedDemo]}
          </p>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="text-3xl">✈️</div>
            <div>
              <h3 className="font-bold text-card-foreground mb-1">Bézier Curves for Air</h3>
              <p className="text-sm text-muted-foreground">
                Realistic flight arcs using great circle paths with Bézier interpolation
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🚢</div>
            <div>
              <h3 className="font-bold text-card-foreground mb-1">Geodesic Sea Routes</h3>
              <p className="text-sm text-muted-foreground">
                Smooth curved lines for shipping routes following Earth&apos;s curvature
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎨</div>
            <div>
              <h3 className="font-bold text-card-foreground mb-1">Layer Separation</h3>
              <p className="text-sm text-muted-foreground">
                Different layers and styles for road/rail (solid) vs sea/air (dashed/animated)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="p-4 bg-card border-border">
          <h3 className="font-bold text-card-foreground mb-3">Transport Mode Legend:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-emerald-500"></div>
              <span className="text-muted-foreground">🚛 Truck (Solid Green)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-indigo-500"></div>
              <span className="text-muted-foreground">🚂 Rail (Solid Indigo)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-blue-500 border-t-2 border-dashed border-blue-500"></div>
              <span className="text-muted-foreground">🚢 Ship (Dashed Blue)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-pink-500 border-t-2 border-dotted border-pink-500"></div>
              <span className="text-muted-foreground">✈️ Air (Dotted Pink)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto">
        <RouteSimulatorMap 
          simulationData={demoData[selectedDemo]}
          height="700px"
        />
      </div>

      {/* Technical Details */}
      <div className="max-w-7xl mx-auto mt-6">
        <Card className="p-4 bg-card border-border">
          <h3 className="font-bold text-card-foreground mb-3">🔧 Technical Implementation:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Uses <code className="bg-background px-2 py-0.5 rounded text-pink-500">@turf/turf</code> for geodesic calculations and curve generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Zoom-level aware line width scaling for optimal visibility at all zoom levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Animated dashed lines for sea/air routes using requestAnimationFrame</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Layer separation ensures proper rendering order (road/rail base, sea/air overlay)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Navy blue theme using Tailwind theme variables for consistent UI across all components</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
