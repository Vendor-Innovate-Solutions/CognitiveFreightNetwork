"use client";

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

export default function BarChart({ title, subtitle, data, isLoading, error }: Props) {
  return (
    <ChartCard title={title} subtitle={subtitle} data={data} isLoading={isLoading} error={error}>
      {data && (
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={data.dataPoints} barGap={8}>
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
            <Legend verticalAlign="bottom" />
            {data.yAxisKeys.map((y) => (
              <Bar key={y.key} dataKey={y.key} fill={y.color} name={y.name} barSize={40} />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
