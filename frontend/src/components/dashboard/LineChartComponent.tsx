"use client";

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { ChartData } from "@/types/chart";
import ChartCard from "./ChartCard";

interface Props {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
}

export default function LineChart({ title, subtitle, data, isLoading, error }: Props) {
  return (
    <ChartCard title={title} subtitle={subtitle} data={data} isLoading={isLoading} error={error}>
      {data && (
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data.dataPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={data.xAxisKey} />
            <YAxis unit={` ${data.yAxisUnit}`} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                return (
                  <div className="bg-white border rounded shadow p-2 text-sm">
                    <p className="font-semibold">{label}</p>
                    {payload.map((entry) => (
                      <p key={entry.dataKey} style={{ color: entry.color }}>
                        {entry.name}: {entry.value} {data.yAxisUnit}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend />
            {data.yAxisKeys.map((y) => (
              <Line
                key={y.key}
                type="monotone"
                dataKey={y.key}
                stroke={y.color}
                name={y.name}
                dot={false}
              />
            ))}
            <Brush dataKey={data.xAxisKey} height={30} stroke="#8884d8" />
          </ReLineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
