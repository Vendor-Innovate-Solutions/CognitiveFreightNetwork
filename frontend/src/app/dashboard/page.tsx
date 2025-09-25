"use client";

import { useEffect, useState } from "react";
import BarChart from "@/components/dashboard/BarChartComponent";
import LineChart from "@/components/dashboard/LineChartComponent";
import HeatMap from "@/components/dashboard/HeatMap";
import GeospatialChart from "@/components/dashboard/GeospatialChart";
import CompositeChart from "@/components/dashboard/CompositeChart";
import { mockChartData } from "@/data/ChartMockData";

export default function DashboardPage() {
  const [lineData, setLineData] = useState<typeof mockChartData | null>(null);
  const [barData, setBarData] = useState<typeof mockChartData | null>(null);
  const [heatMapData, setHeatMapData] = useState<typeof mockChartData | null>(null);
  const [geospatialData, setGeospatialData] = useState<typeof mockChartData | null>(null);
  const [compositeData, setCompositeData] = useState<typeof mockChartData | null>(null);
  const [loading, setLoading] = useState(true);
  
  //Just to simulate 2second delay so the loading is visible for now.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLineData(mockChartData);
      setBarData(mockChartData);
      setHeatMapData(mockChartData);
      setGeospatialData(mockChartData);
      setCompositeData(mockChartData);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 p-6 bg-background">
      {/* Top Row - Original Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LineChart
          title="Port Dwell Time Analysis (Line)"
          subtitle="Last 7 Days"
          data={lineData}
          isLoading={loading}
          error={undefined}
        />
        <BarChart
          title="Port Dwell Time Analysis (Bar)"
          subtitle="Last 7 Days"
          data={barData}
          isLoading={loading}
          error={undefined}
        />
      </div>

      {/* Middle Row - Heat Map and Geospatial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatMap
          title="Route Optimization Heat Map"
          subtitle="Route efficiency visualization"
          data={heatMapData}
          isLoading={loading}
          error={undefined}
        />
        <GeospatialChart
          title="Port & Warehouse Locations"
          subtitle="Geographic distribution and status"
          data={geospatialData}
          isLoading={loading}
          error={undefined}
        />
      </div>

      {/* Bottom Row - Composite Chart (Full Width) */}
      <div className="grid grid-cols-1 gap-6">
        <CompositeChart
          title="Multi-View Analytics Dashboard"
          subtitle="Interactive chart with multiple visualization types"
          data={compositeData}
          isLoading={loading}
          error={undefined}
        />
      </div>
    </div>
  );
}
