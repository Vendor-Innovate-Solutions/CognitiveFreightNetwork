"use client";

import { useEffect, useState } from "react";
import SmartChart from "@/components/dashboard/SmartChart";
import { mockChartData } from "@/data/ChartMockData";

export default function DashboardPage() {
  const [chartData, setChartData] = useState<typeof mockChartData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate fetch delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartData(mockChartData);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-background">
      <SmartChart
        title="Port Dwell Time Analysis (Auto)"
        subtitle="Last 7 Days"
        data={chartData}
        isLoading={loading}
      />
      <SmartChart
        title="Another View (Auto)"
        subtitle="Last 30 Days"
        data={chartData}
        isLoading={loading}
      />
    </div>
  );
}
