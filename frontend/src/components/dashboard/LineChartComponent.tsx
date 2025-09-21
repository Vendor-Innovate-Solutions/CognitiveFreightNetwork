"use client"

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
} from "recharts"
import type { ChartData } from "@/types/chart"
import ChartCard from "./ChartCard"

interface Props {
  title: string
  subtitle?: string
  data: ChartData | null
  isLoading?: boolean
  error?: string
}

export default function LineChart({ title, subtitle, data, isLoading, error }: Props) {
  return (
    <ChartCard title={title} subtitle={subtitle} data={data} isLoading={isLoading} error={error}>
      {data && (
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart
            data={data.dataPoints}
            margin={{
              top: 10,
              right: 5,
              left: 5,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={data.xAxisKey}
              fontSize={12}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis unit={` ${data.yAxisUnit}`} fontSize={12} width={60} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null
                return (
                  <div className="bg-white border rounded shadow p-2 text-xs sm:text-sm max-w-xs">
                    <p className="font-semibold break-words">{label}</p>
                    {payload.map((entry) => (
                      <p key={entry.dataKey} style={{ color: entry.color }} className="break-words">
                        {entry.name}: {entry.value} {data.yAxisUnit}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
            {data.yAxisKeys.map((y) => (
              <Line
                key={y.key}
                type="monotone"
                dataKey={y.key}
                stroke={y.color}
                name={y.name}
                dot={false}
                strokeWidth={2}
              />
            ))}
            <Brush dataKey={data.xAxisKey} height={25} stroke="#8884d8" />
          </ReLineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
