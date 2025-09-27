"use client";

import React from "react";
import {
  detectChartType,
  computeYDomain,
  type GenericDataPoint,
} from "@/lib/chartUtils";
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


  const genericPoints: GenericDataPoint[] = data.dataPoints.map((point) => {
    const gPoint: GenericDataPoint = {};
    Object.keys(point).forEach((key) => {
      gPoint[key] = point[key as keyof typeof point];
    });
    return gPoint;
  });

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
