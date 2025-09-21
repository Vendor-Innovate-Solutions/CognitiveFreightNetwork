"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCardProps } from "@/types/chart";
import { Loader2 } from "lucide-react";

export default function ChartCard({
  title,
  subtitle,
  data,
  isLoading,
  error,
  children,
}: React.PropsWithChildren<ChartCardProps>) {
  return (
    <Card className="w-full shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </CardHeader>

      <CardContent className="h-[400px] flex items-center justify-center">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-gray-500" size={24} />
            <p className="text-gray-500 text-sm">Loading data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {/* Empty State */}
        {!isLoading && !error && data && data.dataPoints.length === 0 && (
          <p className="text-gray-500 text-sm">No data available for this period.</p>
        )}

        {/* Chart Content */}
        {!isLoading && !error && data && data.dataPoints.length > 0 && (
          <div className="w-full h-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
