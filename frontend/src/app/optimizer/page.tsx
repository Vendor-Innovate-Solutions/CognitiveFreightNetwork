"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CostBreakdownCard from "@/components/dashboard/CostBreakdownCard";
import VesselTracker from "@/components/dashboard/VesselTracker";
import { LogisticsAPI } from "@/lib/api";
import {
  Vessel,
  Port,
  Plant,
  OptimizationSolution,
  SummaryStats,
  DelayPrediction,
} from "@/types/logistics";

export default function LogisticsOptimizerPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [solution, setSolution] = useState<OptimizationSolution | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [predictions, setPredictions] = useState<DelayPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vessels, ports, plants, and stats in parallel
      const [vesselsData, portsData, plantsData, statsData] = await Promise.all([
        LogisticsAPI.getVessels(),
        LogisticsAPI.getPorts(),
        LogisticsAPI.getPlants(),
        LogisticsAPI.getSummaryStats(),
      ]);

      setVessels(vesselsData);
      setPorts(portsData);
      setPlants(plantsData);
      setStats(statsData);

      // Auto-predict delays for all vessels
      if (vesselsData.length > 0) {
        const predictionsData = await LogisticsAPI.predictDelaysBatch(vesselsData);
        setPredictions(predictionsData);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    if (vessels.length === 0 || ports.length === 0 || plants.length === 0) {
      setError("Missing required data for optimization");
      return;
    }

    try {
      setOptimizing(true);
      setError(null);

      const solutionData = await LogisticsAPI.optimize(vessels, ports, plants);
      setSolution(solutionData);
    } catch (err) {
      console.error("Optimization failed:", err);
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const getDemurrageRiskCount = (risk: string) => {
    return predictions.filter((p) => p.demurrage_risk === risk).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg text-muted-foreground">Loading logistics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            🚢 AI-Enabled Logistics Optimizer
          </h1>
          <p className="text-lg text-muted-foreground">
            Cost-optimal vessel scheduling and port-plant linkage for steel supply chain
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/50">
            <CardContent className="p-4">
              <p className="text-red-500 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Vessels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">
                  {stats.active_vessels}/{stats.total_vessels}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  In transit or at port
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Capacity Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {stats.current_utilization_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total_capacity_mt.toLocaleString()} MT total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/10 border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">
                  ₹{(stats.total_monthly_cost / 10000000).toFixed(1)} Cr
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All logistics costs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Optimization Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">
                  {stats.optimization_savings_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs manual planning
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Delay Prediction Risks */}
        {predictions.length > 0 && (
          <Card className="bg-card/95 backdrop-blur-sm border border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔮</span>
                <span>AI Delay Prediction Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="text-3xl font-bold text-green-500">
                    {getDemurrageRiskCount("low")}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Low Risk</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-500">
                    {getDemurrageRiskCount("medium")}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Medium Risk</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="text-3xl font-bold text-red-500">
                    {getDemurrageRiskCount("high")}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimization Control */}
        <Card className="bg-card/95 backdrop-blur-sm border border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span>Optimization Engine</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ready to optimize {vessels.length} vessels across {ports.length} ports
                  to {plants.length} plants
                </p>
                {solution && (
                  <p className="text-xs text-green-500 mt-1">
                    ✅ Last optimization: {new Date(solution.timestamp).toLocaleString()}
                    ({solution.optimization_time_seconds.toFixed(2)}s)
                  </p>
                )}
              </div>
              <button
                onClick={runOptimization}
                disabled={optimizing}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {optimizing ? "Optimizing..." : "Run Optimization"}
              </button>
            </div>

            {solution && (
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Feasibility:</span>
                  <span
                    className={`font-semibold ${
                      solution.is_feasible ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {solution.is_feasible ? "✅ Feasible" : "❌ Infeasible"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vessel Assignments:</span>
                  <span className="font-semibold">
                    {solution.vessel_assignments.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Railway Shipments:</span>
                  <span className="font-semibold">
                    {solution.rake_assignments.length}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Breakdown (2 columns) */}
          <div className="lg:col-span-2">
            {solution ? (
              <CostBreakdownCard costBreakdown={solution.cost_breakdown} />
            ) : (
              <Card className="bg-card/95 backdrop-blur-sm border border-border/40 h-full flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Optimization Yet
                  </h3>
                  <p className="text-muted-foreground">
                    Click "Run Optimization" to see cost breakdown
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vessel Tracker (1 column) */}
          <div>
            <VesselTracker vessels={vessels} />
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ports Card */}
          <Card className="bg-card/95 backdrop-blur-sm border border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚓</span>
                <span>Ports ({ports.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ports.map((port) => {
                const utilizationPct =
                  (port.current_stock_mt / port.capacity_mt) * 100;
                return (
                  <div
                    key={port.name}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{port.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {port.current_stock_mt.toLocaleString()} /{" "}
                        {port.capacity_mt.toLocaleString()} MT
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          utilizationPct > 80 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {utilizationPct.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Utilization</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Plants Card */}
          <Card className="bg-card/95 backdrop-blur-sm border border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🏭</span>
                <span>Steel Plants ({plants.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plants.map((plant) => {
                const utilizationPct =
                  (plant.current_stock_mt / plant.capacity_mt) * 100;
                const totalRequirements = Object.values(plant.requirements).reduce(
                  (sum, val) => sum + val,
                  0
                );
                return (
                  <div
                    key={plant.name}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{plant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Monthly need: {totalRequirements.toLocaleString()} MT
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          utilizationPct < 30 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {utilizationPct.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Stock Level</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
