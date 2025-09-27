"use client";

import React from "react";
import { detectChartType } from "@/lib/chartUtils";
import type { GenericDataPoint } from "@/lib/chartUtils";
import type { ChartData } from "@/types/chart";
import LineChart from "@/components/dashboard/LineChartComponent";
import BarChart from "@/components/dashboard/BarChartComponent";

type Props = {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string | null;
  yKeys?: string[];
};

function computeYDomain(
  points: GenericDataPoint[],
  yKeys: string[]
): [number, number] | ["auto", "auto"] {
  if (!points.length || !yKeys.length) return ["auto", "auto"];

  const values = points.flatMap((p) =>
    yKeys.map((key) => Number(p[String(key)])).filter((v) => !isNaN(v))
  );

  if (!values.length) return ["auto", "auto"];

  values.sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + 1.5 * iqr;

  const nonOutlierMax = Math.max(...values.filter((v) => v <= upperFence));
  const safeMax = Math.max(nonOutlierMax, 1);

  return [0, safeMax] as [number, number];
}

export default function SmartChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  yKeys,
}: Props) {
  if (!data) {
    return (
      <LineChart
        title={title}
        subtitle={subtitle}
        data={null}
        isLoading={isLoading}
        error={error ?? undefined}
      />
    );
  }

  const genericPoints = data.dataPoints as unknown as GenericDataPoint[];

  const inferredYKeys =
    yKeys && yKeys.length > 0
      ? yKeys
      : data.yAxisKeys
      ? data.yAxisKeys.map((y) => y.key)
      : Object.keys(genericPoints[0] || {}).filter((k) => k !== data.xAxisKey);

  const chartType = detectChartType(
    genericPoints,
    data.xAxisKey as string,
    inferredYKeys
  );

  const yDomain = computeYDomain(genericPoints, inferredYKeys);

  if (chartType === "bar") {
    return (
      <BarChart
        title={title}
        subtitle={subtitle}
        data={data}
        isLoading={isLoading}
        error={error ?? undefined}
        yDomain={yDomain}
      />
    );
  } else {
    return (
      <LineChart
        title={title}
        subtitle={subtitle}
        data={data}
        isLoading={isLoading}
        error={error ?? undefined}
        yDomain={yDomain}
      />
    );
  }
}
