"use client";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartCardProps } from "@/types/chart";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
export default function ChartCard({
  title,
  subtitle,
  data,
  isLoading,
  error,
  children,
}: React.PropsWithChildren<ChartCardProps>) {
  return (
    <Card className="w-full bg-card border border-border/30 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/20 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg sm:text-xl font-semibold text-foreground break-words leading-tight">
            {title}
          </CardTitle>

          {subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground break-words mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent className="w-full flex flex-col items-center justify-center px-5 sm:px-6 py-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <Loader2 className="animate-spin text-primary w-8 h-8" />

            <p className="text-muted-foreground text-sm sm:text-base font-medium text-center">
              Loading chart data...
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <AlertCircle className="w-8 h-8 text-destructive" />

            <div className="text-center max-w-sm">
              <p className="text-destructive font-medium text-sm sm:text-base">
                Unable to load data
              </p>

              <p className="text-destructive/80 text-xs sm:text-sm break-words leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && data.dataPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <BarChart3 className="w-8 h-8 text-muted-foreground/50" />

            <p className="text-muted-foreground text-sm sm:text-base text-center">
              No data available for this period
            </p>
          </div>
        )}

        {!isLoading && !error && data && data.dataPoints.length > 0 && (
          <div className="w-full h-64 sm:h-80 md:h-96 lg:aspect-[16/9] min-h-0">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
