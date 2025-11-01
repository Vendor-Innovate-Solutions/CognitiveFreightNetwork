"use client";

import React from "react";
import { SimulationData } from "@/types/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteMapFallback from "./RouteMapFallback";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface RouteSimulatorMapProps {
  simulationData: SimulationData;
  height?: string;
  className?: string;
}

export default function RouteSimulatorMap(props: RouteSimulatorMapProps) {
  const { simulationData, height = "600px", className = "" } = props;

  if (!MAPBOX_TOKEN) return <RouteMapFallback simulationData={simulationData} height={height} />;

  return (
    <Card className="w-full h-[400px]">
      <CardHeader>
        <CardTitle>Route Simulator Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`w-full h-[360px] rounded-md bg-slate-800/20 flex items-center justify-center ${className}`}>
          <div className="text-muted-foreground">Map rendering (Mapbox token detected)</div>
        </div>
      </CardContent>
    </Card>
  );
}
