"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from "@/types/chart";

interface HeatMapProps {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
}

interface HeatMapCell {
  x: number;
  y: number;
  value: number;
  label: string;
}

const HeatMap: React.FC<HeatMapProps> = ({
  title,
  subtitle,
  data,
  isLoading = false,
  error,
}) => {
  // Transform the data for heatmap visualization
  const transformDataToHeatMap = (): HeatMapCell[] => {
    if (!data || !data.dataPoints.length) return [];

    return data.dataPoints.map((point, index) => {
      const actualValue = point.actualHours as number;
      const predictedValue = point.predictedHours as number;
      const efficiency = ((predictedValue / actualValue) * 100);
      
      return {
        x: index,
        y: 0,
        value: efficiency,
        label: `${point.date}: ${efficiency.toFixed(1)}% efficiency`,
      };
    });
  };

  const heatMapData = transformDataToHeatMap();

  // Color scale for efficiency (green = high efficiency, red = low efficiency)
  const getColorFromValue = (value: number): string => {
    if (value >= 90) return "#22c55e"; // Green - High efficiency
    if (value >= 75) return "#84cc16"; // Light green
    if (value >= 60) return "#eab308"; // Yellow
    if (value >= 45) return "#f97316"; // Orange
    return "#ef4444"; // Red - Low efficiency
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
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
          <div className="flex items-center justify-center h-48 text-red-500">
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
          {/* Heatmap Grid */}
          <div className="grid grid-cols-7 gap-2 p-4">
            {heatMapData.map((cell, index) => (
              <div
                key={index}
                className="relative group"
              >
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center text-xs font-semibold text-white cursor-pointer transition-transform hover:scale-105"
                  style={{ backgroundColor: getColorFromValue(cell.value) }}
                  title={cell.label}
                >
                  {cell.value.toFixed(0)}%
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                  <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {cell.label}
                    <div className="w-2 h-2 bg-gray-800 rotate-45 absolute top-full left-1/2 transform -translate-x-1/2 -mt-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Route Efficiency:</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-xs">Low</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f97316" }}></div>
              <span className="text-xs">Fair</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#eab308" }}></div>
              <span className="text-xs">Good</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#84cc16" }}></div>
              <span className="text-xs">High</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#22c55e" }}></div>
              <span className="text-xs">Optimal</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {heatMapData.filter(cell => cell.value >= 75).length}
              </div>
              <div className="text-xs text-gray-600">Efficient Routes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">
                {heatMapData.filter(cell => cell.value >= 45 && cell.value < 75).length}
              </div>
              <div className="text-xs text-gray-600">Needs Optimization</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {heatMapData.filter(cell => cell.value < 45).length}
              </div>
              <div className="text-xs text-gray-600">Critical Routes</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeatMap;