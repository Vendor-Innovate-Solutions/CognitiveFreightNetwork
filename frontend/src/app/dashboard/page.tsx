"use client";

import { useEffect, useState } from "react";
import BarChart from "@/components/dashboard/BarChartComponent";
import LineChart from "@/components/dashboard/LineChartComponent";
import { mockChartData } from "@/data/ChartMockData";

export default function DashboardPage() {
  const [lineData, setLineData] = useState<typeof mockChartData | null>(null);
  const [barData, setBarData] = useState<typeof mockChartData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate data fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setLineData(mockChartData);       // Line chart gets data
      setBarData(mockChartData); // Bar chart empty state
      setLoading(false);
    }, 2000); // 2-second delay
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Line Chart */}
      <LineChart
        title="Port Dwell Time Analysis (Line)"
        subtitle="Last 7 Days"
        data={lineData}
        isLoading={loading}
        error={undefined}
      />

      {/* Bar Chart */}
      <BarChart
        title="Port Dwell Time Analysis (Bar)"
        subtitle="Last 7 Days"
        data={barData}
        isLoading={loading}
        error={undefined}
      />
    </div>
  );
}
