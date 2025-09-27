export interface DataPoint {
  [key: string]: string | number; 
}

export interface YAxisKey {
  key: string;
  color: string;
  name: string;
}

export interface ChartData {
  dataPoints: DataPoint[];
  xAxisKey: keyof DataPoint; 
  yAxisKeys: YAxisKey[];
  yAxisUnit: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
  type?: "line" | "bar";
}
