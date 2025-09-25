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
  ],
  xAxisKey: "date",
  yAxisKeys: [
    { key: "actualHours", color: "#8884d8", name: "Actual Dwell Time" },
    { key: "predictedHours", color: "#82ca9d", name: "Predicted Dwell Time" },
  ],
  yAxisUnit: "hours",
};
