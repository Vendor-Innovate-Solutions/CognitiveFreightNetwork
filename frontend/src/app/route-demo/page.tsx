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
    <div className="min-h-screen bg-[#0B1426] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">
          🗺️ Route Visualization Demo
        </h1>
        <p className="text-[#94A3B8]">
          Demonstrating curved geodesic lines for sea/air routes and layer-separated multi-modal rendering
        </p>
      </div>

      {/* Demo Selector */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <div className="flex items-center gap-4">
            <span className="text-[#F1F5F9] font-semibold">Select Demo:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDemo("multimodal")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "multimodal"
                    ? "bg-[#3B82F6] text-white shadow-lg"
                    : "bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]"
                }`}
              >
                🌍 Multi-Modal (Sea/Air)
              </button>
              <button
                onClick={() => setSelectedDemo("coastal")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "coastal"
                    ? "bg-[#3B82F6] text-white shadow-lg"
                    : "bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]"
                }`}
              >
                🚢 Coastal Shipping
              </button>
              <button
                onClick={() => setSelectedDemo("railway")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDemo === "railway"
                    ? "bg-[#3B82F6] text-white shadow-lg"
                    : "bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]"
                }`}
              >
                🚂 Railway Routes
              </button>
            </div>
          </div>
          <p className="text-[#94A3B8] text-sm mt-3">
            {demoDescriptions[selectedDemo]}
          </p>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <div className="flex items-start gap-3">
            <div className="text-3xl">✈️</div>
            <div>
              <h3 className="font-bold text-[#F1F5F9] mb-1">Bézier Curves for Air</h3>
              <p className="text-sm text-[#94A3B8]">
                Realistic flight arcs using great circle paths with Bézier interpolation
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🚢</div>
            <div>
              <h3 className="font-bold text-[#F1F5F9] mb-1">Geodesic Sea Routes</h3>
              <p className="text-sm text-[#94A3B8]">
                Smooth curved lines for shipping routes following Earth&apos;s curvature
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎨</div>
            <div>
              <h3 className="font-bold text-[#F1F5F9] mb-1">Layer Separation</h3>
              <p className="text-sm text-[#94A3B8]">
                Different layers and styles for road/rail (solid) vs sea/air (dashed/animated)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <h3 className="font-bold text-[#F1F5F9] mb-3">Transport Mode Legend:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-[#10B981]"></div>
              <span className="text-[#94A3B8]">🚛 Truck (Solid Green)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-[#6366F1]"></div>
              <span className="text-[#94A3B8]">🚂 Rail (Solid Indigo)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-[#3B82F6] border-t-2 border-dashed border-[#3B82F6]"></div>
              <span className="text-[#94A3B8]">🚢 Ship (Dashed Blue)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-1 bg-[#EC4899] border-t-2 border-dotted border-[#EC4899]"></div>
              <span className="text-[#94A3B8]">✈️ Air (Dotted Pink)</span>
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
        <Card className="p-4 bg-[#1E293B] border-[#334155]">
          <h3 className="font-bold text-[#F1F5F9] mb-3">🔧 Technical Implementation:</h3>
          <ul className="space-y-2 text-sm text-[#94A3B8]">
            <li className="flex items-start gap-2">
              <span className="text-[#3B82F6]">•</span>
              <span>Uses <code className="bg-[#0F172A] px-2 py-0.5 rounded text-[#EC4899]">@turf/turf</code> for geodesic calculations and curve generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3B82F6]">•</span>
              <span>Zoom-level aware line width scaling for optimal visibility at all zoom levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3B82F6]">•</span>
              <span>Animated dashed lines for sea/air routes using requestAnimationFrame</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3B82F6]">•</span>
              <span>Layer separation ensures proper rendering order (road/rail base, sea/air overlay)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3B82F6]">•</span>
              <span>Navy blue theme (#1E293B, #334155) for consistent UI across all components</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
