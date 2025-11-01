/**
 * Types for the AI-Enabled Logistics Optimizer
 */

export enum MaterialType {
  COKING_COAL = "coking_coal",
  LIMESTONE = "limestone",
}

export enum VesselStatus {
  IN_TRANSIT = "in_transit",
  AT_PORT = "at_port",
  DELAYED = "delayed",
  DISCHARGED = "discharged",
}

export enum PortName {
  HALDIA = "Haldia",
  PARADIP = "Paradip",
  VIZAG = "Vizag",
  CHENNAI = "Chennai",
  ENNORE = "Ennore",
}

export enum PlantName {
  PLANT_A = "Plant A",
  PLANT_B = "Plant B",
  PLANT_C = "Plant C",
  PLANT_D = "Plant D",
  PLANT_E = "Plant E",
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Vessel {
  id: string;
  name: string;
  material_type: MaterialType;
  cargo_mt: number;
  origin_port: string;
  eta: string;
  actual_eta?: string;
  status: VesselStatus;
  demurrage_rate_per_day: number;
  free_time_days: number;
  current_location?: Coordinate;
  quality_metrics?: Record<string, number>;
}

export interface Port {
  name: PortName;
  location: Coordinate;
  capacity_mt: number;
  current_stock_mt: number;
  handling_cost_per_mt: number;
  storage_cost_per_day_per_mt: number;
  discharge_rate_mt_per_day: number;
}

export interface Plant {
  name: PlantName;
  location: Coordinate;
  capacity_mt: number;
  current_stock_mt: number;
  requirements: Record<MaterialType, number>;
  quality_specs?: Record<string, number>;
}

export interface CostBreakdown {
  ocean_freight: number;
  port_costs: number;
  railway_freight: number;
  demurrage: number;
  storage: number;
  total: number;
}

export interface VesselAssignment {
  vessel_id: string;
  port: PortName;
  discharge_quantity_mt: number;
  visit_sequence: number;
  eta: string;
  expected_discharge_time_days: number;
}

export interface RakeAssignment {
  rake_id: string;
  port: PortName;
  plant: PlantName;
  quantity_mt: number;
  departure_date: string;
  arrival_date: string;
  cost: number;
}

export interface OptimizationSolution {
  solution_id: string;
  timestamp: string;
  total_cost: number;
  cost_breakdown: CostBreakdown;
  vessel_assignments: VesselAssignment[];
  rake_assignments: RakeAssignment[];
  unmet_demand: Record<string, Record<MaterialType, number>>;
  is_feasible: boolean;
  optimization_time_seconds: number;
  constraints_satisfied: Record<string, boolean>;
}

export interface DelayPrediction {
  vessel_id: string;
  predicted_delay_hours: number;
  confidence_score: number;
  predicted_eta: string;
  demurrage_risk: "low" | "medium" | "high";
  factors: Record<string, number>;
}

export interface WhatIfScenario {
  scenario_name: string;
  description: string;
  changes: Record<string, number>;
  port_closures?: PortName[];
  additional_vessels?: Vessel[];
  modified_demand?: Record<PlantName, Record<MaterialType, number>>;
}

export interface WhatIfResult {
  scenario_name: string;
  solution: OptimizationSolution;
  cost_difference: number;
  cost_difference_percentage: number;
  key_insights: string[];
}

export interface SummaryStats {
  total_vessels: number;
  active_vessels: number;
  total_ports: number;
  total_plants: number;
  total_capacity_mt: number;
  current_utilization_pct: number;
  avg_demurrage_per_vessel: number;
  total_monthly_cost: number;
  optimization_savings_pct: number;
}
