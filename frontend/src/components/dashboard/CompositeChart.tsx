"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from "@/types/chart";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

interface CompositeChartProps {
  title: string;
  subtitle?: string;
  data: ChartData | null;
  isLoading?: boolean;
  error?: string;
}

type ChartType = "line" | "bar" | "area" | "pie";

const CompositeChart: React.FC<CompositeChartProps> = ({
  title,
  subtitle,
  data,
  isLoading = false,
  error,
}) => {
  const [activeChart, setActiveChart] = useState<ChartType>("line");

  // Transform data for pie chart
  const getPieData = () => {
    if (!data || !data.dataPoints.length) return [];
    
    const totalActual = data.dataPoints.reduce((sum, point) => sum + (point.actualHours as number), 0);
    const totalPredicted = data.dataPoints.reduce((sum, point) => sum + (point.predictedHours as number), 0);
    const efficiency = ((totalPredicted / totalActual) * 100);
    
    return [
      { name: "Efficient Operations", value: efficiency, color: "#22c55e" },
      { name: "Inefficient Operations", value: 100 - efficiency, color: "#ef4444" },
    ];
  };

  // Transform data with additional metrics
  const getEnhancedData = () => {
    if (!data || !data.dataPoints.length) return [];
    
    return data.dataPoints.map((point, index) => ({
      ...point,
      actualHours: point.actualHours as number,
      predictedHours: point.predictedHours as number,
      efficiency: ((point.predictedHours as number) / (point.actualHours as number) * 100),
      variance: (point.actualHours as number) - (point.predictedHours as number),
      dayOfWeek: new Date(point.date).toLocaleDateString('en', { weekday: 'short' }),
      cumulative: data.dataPoints.slice(0, index + 1).reduce((sum, p) => sum + (p.actualHours as number), 0),
    }));
  };

  const enhancedData = getEnhancedData();
  const pieData = getPieData();

  const chartTypes = [
    { key: "line", label: "Line Chart", icon: "📈" },
    { key: "bar", label: "Bar Chart", icon: "📊" },
    { key: "area", label: "Area Chart", icon: "📉" },
    { key: "pie", label: "Pie Chart", icon: "🥧" },
  ] as const;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (activeChart) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={enhancedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayOfWeek" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="actualHours" 
                stroke="#8884d8" 
                strokeWidth={3}
                name="Actual Dwell Time"
                dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="predictedHours" 
                stroke="#82ca9d" 
                strokeWidth={3}
                name="Predicted Dwell Time"
                dot={{ fill: "#82ca9d", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#ffc658" 
                strokeWidth={2}
                name="Efficiency %"
                dot={{ fill: "#ffc658", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={enhancedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayOfWeek" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="actualHours" fill="#8884d8" name="Actual Hours" />
              <Bar dataKey="predictedHours" fill="#82ca9d" name="Predicted Hours" />
              <Bar dataKey="variance" fill="#ff7300" name="Variance" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={enhancedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayOfWeek" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6}
                name="Cumulative Hours"
              />
              <Area 
                type="monotone" 
                dataKey="actualHours" 
                stackId="2" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6}
                name="Daily Actual"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={(props) => {
                    // PieLabelRenderProps type: { name?: string; value?: number; ... }
                    const { name, value } = props;
                    return `${name}: ${typeof value === "number" ? value.toFixed(1) : value}%`;
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {/* Chart Type Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {chartTypes.map((chart) => (
              <button
                key={chart.key}
                onClick={() => setActiveChart(chart.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeChart === chart.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title={chart.label}
              >
                {chart.icon}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Container */}
          <div className="w-full">
            {renderChart()}
          </div>

          {/* Chart Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
            <span>Chart Type: {chartTypes.find(c => c.key === activeChart)?.label}</span>
            <span>Data Points: {enhancedData.length}</span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {enhancedData.reduce((sum, point) => sum + point.actualHours, 0)}h
              </div>
              <div className="text-xs text-gray-600">Total Actual</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {enhancedData.reduce((sum, point) => sum + point.predictedHours, 0)}h
              </div>
              <div className="text-xs text-gray-600">Total Predicted</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">
                {(enhancedData.reduce((sum, point) => sum + point.efficiency, 0) / enhancedData.length).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Avg Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {Math.max(...enhancedData.map(point => Math.abs(point.variance))).toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600">Max Variance</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompositeChart;