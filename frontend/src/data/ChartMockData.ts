import { ChartData } from "@/types/chart";

export const mockChartData: ChartData = {
  dataPoints: [
    { date: "2025-09-01", actualHours: 22, predictedHours: 21 },
    { date: "2025-09-02", actualHours: 25, predictedHours: 24 },
    { date: "2025-09-03", actualHours: 28, predictedHours: 26 },
    { date: "2025-09-04", actualHours: 24, predictedHours: 25 },
    { date: "2025-09-05", actualHours: 35, predictedHours: 28 },
    { date: "2025-09-06", actualHours: 32, predictedHours: 30 },
    { date: "2025-09-07", actualHours: 26, predictedHours: 27 },
    { date: "2025-09-08", actualHours: 27, predictedHours: 28 },
    { date: "2025-09-09", actualHours: 31, predictedHours: 29 },
    { date: "2025-09-10", actualHours: 40, predictedHours: 33 }, // spike/outlier
    { date: "2025-09-11", actualHours: 29, predictedHours: 28 },
    { date: "2025-09-12", actualHours: 30, predictedHours: 31 },
    { date: "2025-09-13", actualHours: 34, predictedHours: 32 },
    { date: "2025-09-14", actualHours: 37, predictedHours: 35 },
    { date: "2025-09-15", actualHours: 33, predictedHours: 31 },
    { date: "2025-09-16", actualHours: 25, predictedHours: 26 },
    { date: "2025-09-17", actualHours: 28, predictedHours: 27 },
    { date: "2025-09-18", actualHours: 42, predictedHours: 34 }, // spike/outlier
    { date: "2025-09-19", actualHours: 36, predictedHours: 32 },
    { date: "2025-09-20", actualHours: 29, predictedHours: 30 },
    { date: "2025-09-21", actualHours: 27, predictedHours: 28 },
    { date: "2025-09-22", actualHours: 31, predictedHours: 30 },
    { date: "2025-09-23", actualHours: 38, predictedHours: 36 },
    { date: "2025-09-24", actualHours: 35, predictedHours: 33 },
  ],
  xAxisKey: "date",
  yAxisKeys: [
    { key: "actualHours", color: "#3B82F6", name: "Actual Dwell Time" },
    { key: "predictedHours", color: "#0EA5E9", name: "Predicted Dwell Time" },
  ],
  yAxisUnit: "hours",
};

// Additional mock data for bar charts
export const mockBarChartData: ChartData = {
  dataPoints: [
    { route: "Route A", efficiency: 85, cost: 12500 },
    { route: "Route B", efficiency: 92, cost: 11200 },
    { route: "Route C", efficiency: 78, cost: 13800 },
    { route: "Route D", efficiency: 88, cost: 11900 },
    { route: "Route E", efficiency: 95, cost: 10500 },
    { route: "Route F", efficiency: 82, cost: 12800 },
  ],
  xAxisKey: "route",
  yAxisKeys: [
    { key: "efficiency", color: "#059669", name: "Efficiency Score" },
    { key: "cost", color: "#DC2626", name: "Operating Cost" },
  ],
  yAxisUnit: "%",
};
