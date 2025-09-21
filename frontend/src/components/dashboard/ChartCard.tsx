"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartCardProps } from "@/types/chart"
import { Loader2 } from "lucide-react"

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
      <CardHeader className="px-3 py-4 sm:px-6 sm:py-6">
        <CardTitle className="text-base sm:text-lg font-semibold break-words">{title}</CardTitle>
        {subtitle && <p className="text-xs sm:text-sm text-gray-500 break-words">{subtitle}</p>}
      </CardHeader>

      <CardContent className="w-full flex flex-col items-center justify-center px-2 sm:px-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 sm:py-10">
            <Loader2 className="animate-spin text-gray-500" size={20} />
            <p className="text-gray-500 text-xs sm:text-sm">Loading data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <p className="text-red-500 text-xs sm:text-sm py-8 sm:py-10 text-center break-words">{error}</p>
        )}

        {/* Empty State */}
        {!isLoading && !error && data && data.dataPoints.length === 0 && (
          <p className="text-gray-500 text-xs sm:text-sm py-8 sm:py-10 text-center">
            No data available for this period.
          </p>
        )}

        {/* Chart Content */}
        {!isLoading && !error && data && data.dataPoints.length > 0 && (
          <div className="w-full h-64 sm:h-80 md:h-96 lg:aspect-[16/9] min-h-0">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
