"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CostBreakdown } from "@/types/logistics";
import { formatIndianCurrency, formatShortCurrency } from "@/lib/currencyUtils";

interface CostBreakdownCardProps {
  costBreakdown: CostBreakdown;
  comparisonCost?: number;
}

export default function CostBreakdownCard({
  costBreakdown,
  comparisonCost,
}: CostBreakdownCardProps) {
  const costItems = [
    {
      label: "Ocean Freight",
      value: costBreakdown.ocean_freight,
      icon: "🚢",
      color: "text-blue-500",
    },
    {
      label: "Port Costs",
      value: costBreakdown.port_costs,
      icon: "⚓",
      color: "text-cyan-500",
    },
    {
      label: "Railway Freight",
      value: costBreakdown.railway_freight,
      icon: "🚂",
      color: "text-green-500",
    },
    {
      label: "Demurrage",
      value: costBreakdown.demurrage,
      icon: "⏱️",
      color: "text-red-500",
    },
    {
      label: "Storage",
      value: costBreakdown.storage,
      icon: "📦",
      color: "text-yellow-500",
    },
  ];

  const maxValue = Math.max(...costItems.map((item) => item.value));
  const savings = comparisonCost
    ? ((comparisonCost - costBreakdown.total) / comparisonCost) * 100
    : 0;

  return (
    <Card className="bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cost Breakdown</span>
          <span className="text-2xl font-bold text-primary">
            {formatIndianCurrency(costBreakdown.total)}
          </span>
        </CardTitle>
        {comparisonCost && savings > 0 && (
          <p className="text-sm text-green-500 font-semibold">
            💰 Savings: {formatIndianCurrency(comparisonCost - costBreakdown.total)} ({savings.toFixed(1)}%)
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {costItems.map((item) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
                <span className={`font-semibold ${item.color}`}>
                  {formatShortCurrency(item.value)}
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${item.color.replace("text-", "bg-")} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
