export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends Coordinate {
  timestamp?: string;
}

export type EventType = 
  | "congestion"
  | "reroute"
  | "origin"
  | "destination"
  | "delay"
  | "checkpoint";

export interface RouteEvent {
  id: string;
  type: EventType;
  location: Coordinate;
  title: string;
  description: string;
  timestamp?: string;
  severity?: "low" | "medium" | "high";
}

export interface Route {
  id: string;
  name: string;
  type: "actual" | "optimized";
  coordinates: RoutePoint[];
  stats: {
    duration: string;
    distance: string;
    cost?: number;
  };
  color: string;
  style: "solid" | "dashed";
}

export interface SimulationData {
  routes: Route[];
  events: RouteEvent[];
  metadata?: {
    simulationDate?: string;
    description?: string;
  };
}
