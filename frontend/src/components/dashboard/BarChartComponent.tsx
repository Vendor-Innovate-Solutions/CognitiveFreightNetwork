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
  Brush,
} from "recharts";
import type { ChartData } from "@/types/chart";
import ChartCard from "./ChartCard";
import type { GenericDataPoint } from "@/lib/chartUtils";

interface Props {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
  yDomain?: [number, number] | ["auto", "auto"];
}

// --- helper for outlier-aware Y domain ---
function computeYDomain(
  points: GenericDataPoint[],
  yKeys: string[]
): [number, number] | ["auto", "auto"] {
  if (!points.length || !yKeys.length) return ["auto", "auto"];

  const values = points.flatMap((p) =>
    yKeys.map((key) => Number(p[key])).filter((v) => !isNaN(v))
  );

  if (!values.length) return ["auto", "auto"];

  values.sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + 1.5 * iqr;

  const nonOutlierMax = Math.max(...values.filter((v) => v <= upperFence));
  const safeMax = Math.max(nonOutlierMax, 1);

  return [0, safeMax];
}

export default function BarChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  yDomain,
}: Props) {
  // Compute yDomain dynamically if not passed
  const finalYDomain =
    yDomain ||
    (data
      ? computeYDomain(
          data.dataPoints as unknown as GenericDataPoint[],
          data.yAxisKeys.map((y) => y.key)
        )
      : ["auto", "auto"]);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      data={data}
      isLoading={isLoading}
      error={error}
    >
      {data && (
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart
            data={data.dataPoints}
            barGap={8}
            margin={{ top: 10, right: 5, left: 5, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey={data.xAxisKey}
              fontSize={12}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fill: "var(--foreground)" }}
            />
            <YAxis
              domain={finalYDomain} // ✅ dynamic Y-axis scaling
              unit={` ${data.yAxisUnit}`}
              fontSize={12}
              width={60}
              tick={{ fill: "var(--foreground)" }}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                return (
                  <div className="bg-card text-card-foreground border border-border rounded shadow p-2 text-xs sm:text-sm max-w-xs">
                    <p className="font-semibold break-words">{label}</p>
                    {payload.map((entry) => (
                      <p
                        key={entry.dataKey}
                        style={{ color: entry.color }}
                        className="break-words"
                      >
                        {entry.name}: {entry.value} {data.yAxisUnit}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: "12px", color: "var(--foreground)" }}
            />
            {data.yAxisKeys.map((y) => (
              <Bar
                key={y.key}
                dataKey={y.key}
                fill={y.color}
                name={y.name}
                barSize={40}
              />
            ))}
            <Brush
              dataKey={data.xAxisKey}
              height={25}
              stroke="var(--primary)"
            />
          </ReBarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
