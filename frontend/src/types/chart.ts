export interface DataPoint {
  date: string;
  [key: string]: string | number; // allows actualHours, predictedHours, etc.
}

export interface YAxisKey {
  key: string;
  color: string;
  name: string;
}

export interface ChartData {
  dataPoints: DataPoint[];
  xAxisKey: keyof DataPoint; // ensures valid property of DataPoint
  yAxisKeys: YAxisKey[];
  yAxisUnit: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartData | null; // null = loading/error state
  isLoading?: boolean;
  error?: string;
  type?: "line" | "bar"; // flexibility for future
}
