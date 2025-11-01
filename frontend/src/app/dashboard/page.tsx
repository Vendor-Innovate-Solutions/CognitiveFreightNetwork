"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiClient, type DashboardAnalytics } from "@/lib/cfn-api";
import SmartChart from "@/components/dashboard/SmartChart";
import RouteSimulatorMap from "@/components/dashboard/RouteSimulatorMap";
import { mockBarChartData, mockChartData } from "@/data/ChartMockData";
import { mockSimulationData } from "@/data/RouteSimulationData";

export default function DashboardPage() {
  const { company, token, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Mock chart data
  const [chartData, setChartData] = useState<typeof mockChartData | null>(null);
  const [barChartData, setBarChartData] = useState<typeof mockBarChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) {
      router.push('/login');
      return;
    }

    // Load analytics data
    const loadAnalytics = async () => {
      try {
        const data = await apiClient.getDashboardAnalytics(token || undefined);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();

    // Load mock chart data
    const timer = setTimeout(() => {
      setChartData(mockChartData);
      setBarChartData(mockBarChartData);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [company, token, router]);

  if (!company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950">
      {/* Navigation */}
      <header className="bg-slate-800 shadow-xl border-b-4 border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                🚚 Cognitive Freight Network
              </h1>
              <p className="text-base text-slate-300 font-semibold">Welcome back, {company.name}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/plan-shipment')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl border-2 border-blue-500"
              >
                📦 Plan Shipment
              </button>
              <button
                onClick={() => router.push('/historical')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl border-2 border-green-500"
              >
                📊 Add Data
              </button>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl border-2 border-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative">
        {/* Stats Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-to-br from-slate-700 to-slate-800 border-3 border-slate-600 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="text-sm text-slate-300 font-bold mb-2">Total Shipments</div>
              <div className="text-4xl font-bold text-white">{analytics.total_shipments || 0}</div>
              <div className="text-xs text-slate-400 font-semibold mt-2">All time</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-900 to-blue-950 border-3 border-blue-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="text-sm text-blue-300 font-bold mb-2">Total Cost</div>
              <div className="text-4xl font-bold text-blue-200">₹{((analytics.total_cost || 0) / 100000).toFixed(1)}L</div>
              <div className="text-xs text-blue-400 font-semibold mt-2">Cumulative</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-900 to-purple-950 border-3 border-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="text-sm text-purple-300 font-bold mb-2">Avg Cost/km</div>
              <div className="text-4xl font-bold text-purple-200">₹{(analytics.avg_cost_per_km || 0).toFixed(2)}</div>
              <div className="text-xs text-purple-400 font-semibold mt-2">Efficiency metric</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-900 to-green-950 border-3 border-green-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="text-sm text-green-300 font-bold mb-2">On-Time Rate</div>
              <div className="text-4xl font-bold text-green-200">{(analytics.on_time_delivery_rate || 0).toFixed(1)}%</div>
              <div className="text-xs text-green-400 font-semibold mt-2">Delivery performance</div>
            </Card>
          </div>
        )}

        {isLoading && !analytics && (
          <div className="text-center py-12">
            <p className="text-slate-200 text-lg font-bold">🔄 Loading analytics...</p>
          </div>
        )}

        {error && !isLoading && (
          <Card className="p-6 bg-gradient-to-br from-yellow-900 to-orange-950 border-3 border-yellow-700 shadow-xl">
            <p className="text-yellow-200 font-bold text-lg">
              📊 Add historical shipment data to see analytics and train ML models.
            </p>
            <button
              onClick={() => router.push('/historical')}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl border-2 border-yellow-500"
            >
              Add Data Now
            </button>
          </Card>
        )}

        {/* Header */}
        <div className="text-center space-y-3 mb-8 p-6 bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl border-3 border-blue-700 shadow-lg">
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Logistics Intelligence Dashboard
          </h2>
          <p className="text-xl text-slate-300 font-semibold">
            Real-time analytics and predictive insights
          </p>
        </div>

        {/* Route Simulator Map */}
        <div className="mb-8">
          <RouteSimulatorMap simulationData={mockSimulationData} height="700px" />
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
