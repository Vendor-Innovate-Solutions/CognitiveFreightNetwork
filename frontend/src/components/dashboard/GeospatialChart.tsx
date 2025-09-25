"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from "@/types/chart";

interface GeospatialChartProps {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
}

interface Location {
  id: string;
  name: string;
  x: number; // Longitude simulation
  y: number; // Latitude simulation
  type: "port" | "warehouse" | "route";
  dwellTime: number;
  status: "optimal" | "delayed" | "critical";
}

const GeospatialChart: React.FC<GeospatialChartProps> = ({
  title,
  subtitle,
  data,
  isLoading = false,
  error,
}) => {
  // Transform data into geospatial locations
  const generateLocations = (): Location[] => {
    if (!data || !data.dataPoints.length) return [];

    const locations: Location[] = [];
    
    data.dataPoints.forEach((point, index) => {
      const actualHours = point.actualHours as number;
      const predictedHours = point.predictedHours as number;
      
      // Generate port location
      locations.push({
        id: `port-${index}`,
        name: `Port ${String.fromCharCode(65 + index)}`,
        x: 100 + (index * 80) + Math.random() * 40,
        y: 100 + Math.random() * 200,
        type: "port",
        dwellTime: actualHours,
        status: actualHours > predictedHours * 1.2 ? "critical" : 
                actualHours > predictedHours * 1.1 ? "delayed" : "optimal"
      });

      // Generate warehouse location
      locations.push({
        id: `warehouse-${index}`,
        name: `Warehouse ${index + 1}`,
        x: 150 + (index * 80) + Math.random() * 40,
        y: 150 + Math.random() * 200,
        type: "warehouse",
        dwellTime: predictedHours,
        status: "optimal"
      });
    });

    return locations;
  };

  const locations = generateLocations();

  const getLocationColor = (location: Location): string => {
    if (location.type === "route") return "#6366f1";
    
    switch (location.status) {
      case "optimal": return "#22c55e";
      case "delayed": return "#f59e0b";
      case "critical": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getLocationSize = (location: Location): number => {
    const baseSize = location.type === "port" ? 12 : 8;
    return baseSize + (location.dwellTime / 5);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Container */}
          <div className="relative w-full h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 overflow-hidden">
            {/* Grid lines for map effect */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i}>
                  <div 
                    className="absolute w-full border-t border-blue-300"
                    style={{ top: `${i * 10}%` }}
                  />
                  <div 
                    className="absolute h-full border-l border-blue-300"
                    style={{ left: `${i * 10}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Locations */}
            {locations.map((location) => (
              <div
                key={location.id}
                className="absolute group cursor-pointer transition-transform hover:scale-125"
                style={{
                  left: `${(location.x / 600) * 100}%`,
                  top: `${(location.y / 400) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Location marker */}
                <div
                  className="rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    backgroundColor: getLocationColor(location),
                    width: `${getLocationSize(location)}px`,
                    height: `${getLocationSize(location)}px`,
                  }}
                >
                  {location.type === "port" ? "P" : "W"}
                </div>

                {/* Route lines */}
                {location.type === "port" && (
                  <div
                    className="absolute w-16 h-0.5 bg-indigo-400 opacity-60"
                    style={{
                      left: '100%',
                      top: '50%',
                      transformOrigin: 'left center',
                      transform: 'rotate(25deg)',
                    }}
                  />
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                    <div className="font-semibold">{location.name}</div>
                    <div>Dwell Time: {location.dwellTime}h</div>
                    <div>Status: <span className={`font-semibold ${
                      location.status === 'optimal' ? 'text-green-400' : 
                      location.status === 'delayed' ? 'text-yellow-400' : 'text-red-400'
                    }`}>{location.status}</span></div>
                    <div className="w-2 h-2 bg-gray-800 rotate-45 absolute top-full left-1/2 transform -translate-x-1/2 -mt-1"></div>
                  </div>
                </div>
              </div>
            ))}

            {/* Compass */}
            <div className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
              N
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 border border-white"></div>
                <span className="text-sm">Ports</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-600 border border-white"></div>
                <span className="text-sm">Warehouses</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Optimal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Delayed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Critical</span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {locations.filter(l => l.type === "port").length}
              </div>
              <div className="text-xs text-gray-600">Active Ports</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-600">
                {locations.filter(l => l.type === "warehouse").length}
              </div>
              <div className="text-xs text-gray-600">Warehouses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {Math.round(locations.filter(l => l.status === "optimal").length / locations.length * 100)}%
              </div>
              <div className="text-xs text-gray-600">Optimal Performance</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeospatialChart;