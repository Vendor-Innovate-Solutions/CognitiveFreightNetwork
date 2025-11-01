/**
 * API client for the AI-Enabled Logistics Optimizer backend
 */
import {
  Vessel,
  Port,
  Plant,
  OptimizationSolution,
  DelayPrediction,
  WhatIfResult,
  SummaryStats,
} from "@/types/logistics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class LogisticsAPI {
  // ==================== OPTIMIZATION ====================
  
  static async optimize(
    vessels: Vessel[],
    ports: Port[],
    plants: Plant[]
  ): Promise<OptimizationSolution> {
    const response = await fetch(`${API_BASE_URL}/api/optimize/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vessels, ports, plants }),
    });
    
    if (!response.ok) {
      throw new Error(`Optimization failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // ==================== AI PREDICTION ====================
  
  static async predictDelay(vesselId: string, vessel: Vessel): Promise<DelayPrediction> {
    const response = await fetch(`${API_BASE_URL}/api/predict/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vessel_id: vesselId,
        origin_port: vessel.origin_port,
        destination_port: "Paradip",
        scheduled_eta: vessel.eta,
        cargo_mt: vessel.cargo_mt,
        material_type: vessel.material_type,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Delay prediction failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  static async predictDelaysBatch(vessels: Vessel[]): Promise<DelayPrediction[]> {
    const inputs = vessels.map(v => ({
      vessel_id: v.id,
      origin_port: v.origin_port,
      destination_port: "Paradip",
      scheduled_eta: v.eta,
      cargo_mt: v.cargo_mt,
      material_type: v.material_type,
    }));
    
    const response = await fetch(`${API_BASE_URL}/api/predict/delays/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    });
    
    if (!response.ok) {
      throw new Error(`Batch delay prediction failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // ==================== DATA ====================
  
  static async getVessels(): Promise<Vessel[]> {
    const response = await fetch(`${API_BASE_URL}/api/vessels`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vessels: ${response.statusText}`);
    }
    return response.json();
  }
  
  static async getPorts(): Promise<Port[]> {
    const response = await fetch(`${API_BASE_URL}/api/ports`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ports: ${response.statusText}`);
    }
    return response.json();
  }
  
  static async getPlants(): Promise<Plant[]> {
    const response = await fetch(`${API_BASE_URL}/api/plants`);
    if (!response.ok) {
      throw new Error(`Failed to fetch plants: ${response.statusText}`);
    }
    return response.json();
  }
  
  static async getSummaryStats(): Promise<SummaryStats> {
    const response = await fetch(`${API_BASE_URL}/api/stats/summary`);
    if (!response.ok) {
      throw new Error(`Failed to fetch summary stats: ${response.statusText}`);
    }
    return response.json();
  }
}
