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
  // optional override for detection (explicit yKeys)
  yKeys?: string[];
};

export default function SmartChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  yKeys,
}: Props) {
  // If no data, default to line (card will display loading/empty/error states)
  if (!data) {
    // Render LineChart by default so UI remains consistent with ChartCard states
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

  if (chartType === "bar") {
    return (
      <BarChart
        title={title}
        subtitle={subtitle}
        data={data}
        isLoading={isLoading}
        error={error ?? undefined}
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
      />
    );
  }
}
