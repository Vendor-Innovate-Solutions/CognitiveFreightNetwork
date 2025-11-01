"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vessel, VesselStatus } from "@/types/logistics";
import { formatDemurrageRate } from "@/lib/currencyUtils";

interface VesselTrackerProps {
  vessels: Vessel[];
  onVesselSelect?: (vessel: Vessel) => void;
}

const getStatusColor = (status: VesselStatus): string => {
  switch (status) {
    case VesselStatus.IN_TRANSIT:
      return "bg-blue-500";
    case VesselStatus.AT_PORT:
      return "bg-green-500";
    case VesselStatus.DELAYED:
      return "bg-red-500";
    case VesselStatus.DISCHARGED:
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
};

const getStatusLabel = (status: VesselStatus): string => {
  return status.replace("_", " ").toUpperCase();
};

const getMaterialIcon = (materialType: string): string => {
  return materialType === "coking_coal" ? "⚫" : "🪨";
};

export default function VesselTracker({
  vessels,
  onVesselSelect,
}: VesselTrackerProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeUntilEta = (etaStr: string): string => {
    const eta = new Date(etaStr);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return "Arriving soon";
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🚢</span>
          <span>Vessel Tracker</span>
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {vessels.length} vessels
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vessels.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No vessels to track
          </p>
        ) : (
          vessels.map((vessel) => (
            <div
              key={vessel.id}
              className="bg-background/50 rounded-lg p-4 border border-border hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => onVesselSelect?.(vessel)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {vessel.name}
                    <span className="text-lg">{getMaterialIcon(vessel.material_type)}</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vessel.origin_port} → India
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${getStatusColor(vessel.status)}`}
                  />
                  <span className="text-xs font-medium">
                    {getStatusLabel(vessel.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Cargo</p>
                  <p className="font-semibold">
                    {vessel.cargo_mt.toLocaleString()} MT
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ETA</p>
                  <p className="font-semibold">{formatDate(vessel.eta)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Time to ETA</p>
                  <p className="font-semibold text-primary">
                    {getTimeUntilEta(vessel.eta)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Demurrage Rate</p>
                  <p className="font-semibold text-red-500">
                    {formatDemurrageRate(vessel.demurrage_rate_per_day)}
                  </p>
                </div>
              </div>

              {vessel.actual_eta && vessel.actual_eta !== vessel.eta && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-yellow-500">⚠️</span>
                    <span className="text-muted-foreground">
                      Predicted ETA:
                    </span>
                    <span className="font-semibold text-yellow-500">
                      {formatDate(vessel.actual_eta)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
