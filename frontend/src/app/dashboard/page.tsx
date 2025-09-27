"use client";

import { useEffect, useState } from "react";
import SmartChart from "@/components/dashboard/SmartChart";
import { mockChartData, mockBarChartData } from "@/data/ChartMockData";

export default function DashboardPage() {
  const [chartData, setChartData] = useState<typeof mockChartData | null>(null);
  const [barChartData, setBarChartData] = useState<typeof mockBarChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartData(mockChartData);
      setBarChartData(mockBarChartData);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Cognitive Freight Network Graphs
          </h1>
          <p className="text-lg text-muted-foreground">
            Real-time logistics intelligence and predictive analytics
          </p>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SmartChart
            title="Port Dwell Time Analysis"
            subtitle="Predictive vs Actual Performance - Last 24 Days"
            data={chartData}
            isLoading={loading}
          />
          <SmartChart
            title="Route Efficiency Metrics"
            subtitle="Performance by Route - Bar Chart View"
            data={barChartData}
            isLoading={loading}
          />
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SmartChart
            title="Traffic Congestion Impact"
            subtitle="Weekly Trend Analysis"
            data={chartData}
            isLoading={loading}
            yKeys={["predictedHours"]}
          />
          <SmartChart
            title="Operating Cost Analysis"
            subtitle="Cost Efficiency by Route"
            data={barChartData}
            isLoading={loading}
            yKeys={["cost"]}
          />
          <SmartChart
            title="Delivery Performance"
            subtitle="Real-time Monitoring"
            data={chartData}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
