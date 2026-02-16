/**
 * API client for Cognitive Freight Network
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface ShipmentPlanRequest {
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  cargo_weight_tons: number;
  cargo_value: number;
  cargo_type: string;
  is_fragile: boolean;
  is_hazardous: boolean;
  pickup_datetime: string;
  delivery_deadline: string;
  transport_mode: string;
  vehicle_type: string;
  preference?: 'fastest' | 'cheapest' | 'safest' | 'balanced';
}

export interface RouteOption {
  route_id: string;
  route_name: string;
  total_distance_km: number;
  estimated_time_hours: number;
  segments: RouteSegment[];
  cost_breakdown: CostBreakdown;
  risk_assessment: RiskAssessment;
  weather_forecast: WeatherInfo[];
  cost_rank: number;
  time_rank: number;
  safety_rank: number;
  overall_score: number;
  is_recommended: boolean;
  recommendation_reason: string;
}

export interface RouteSegment {
  segment_id: number;
  from_location: string;
  to_location: string;
  distance_km: number;
  estimated_time_hours: number;
  road_quality: string;
  weather_impact: string;
}

export interface CostBreakdown {
  fuel_cost: number;
  toll_charges: number;
  driver_wages: number;
  vehicle_maintenance: number;
  insurance_cost: number;
  loading_unloading: number;
  permits_and_docs: number;
  contingency: number;
  total_estimated_cost: number;
  cost_per_km: number;
  cost_per_ton: number;
  confidence_level: number;
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_level: string;
  delay_risk: number;
  damage_risk: number;
  theft_risk: number;
  weather_risk: number;
  risk_factors: string[];
  mitigation_recommendations: string[];
}

export interface WeatherInfo {
  location: string;
  date: string;
  condition: string;
  temperature_c: number;
  precipitation_chance: number;
  wind_speed_kmh: number;
  impact: string;
}

export interface HistoricalShipment {
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  distance_km: number;
  cargo_weight_tons: number;
  cargo_value: number;
  cargo_type: string;
  is_fragile: boolean;
  is_hazardous: boolean;
  pickup_datetime: string;
  delivery_datetime: string;
  transport_mode: string;
  total_cost: number;
  fuel_cost?: number;
  toll_charges?: number;
  labor_cost?: number;
  maintenance_cost?: number;
  weather_conditions?: string;
  delays_hours?: number;
  incidents?: string;
  driver_rating?: number;
  notes?: string;
}

export interface DashboardAnalytics {
  total_shipments: number;
  total_cost: number;
  total_distance_km: number;
  avg_cost_per_km: number;
  avg_delivery_time_hours: number;
  on_time_delivery_rate: number;
  cost_savings_percentage: number;
  recent_shipments: RecentShipment[];
  cost_trends: { month: string; cost: number }[];
  popular_routes: { route: string; count: number }[];
}

export interface RecentShipment {
  id: number;
  origin: string;
  destination: string;
  status: string;
  cost: number;
  date: string;
}

class APIClient {
  private getAuthHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  // ==================== AUTHENTICATION ====================

  async register(data: {
    name: string;
    email: string;
    password: string;
    company_type: string;
    phone?: string;
    gstin?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }

  async getProfile(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  // ==================== SHIPMENT PLANNING ====================

  async planShipment(data: ShipmentPlanRequest, token?: string): Promise<{ routes: RouteOption[] }> {
    const response = await fetch(`${API_BASE_URL}/shipments/plan`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to plan shipment');
    }

    const result = await response.json();
    // Map the backend response to what the frontend expects
    return {
      routes: result.route_options || []
    };
  }

  // ==================== SHIPMENT MANAGEMENT ====================

  async getShipments(token?: string, limit = 50, offset = 0, status?: string) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    const url = `${API_BASE_URL}/shipments?${params}`;
    console.log(`🔵 API Call: GET ${url}`);

    const response = await fetch(url, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      console.error(`❌ API Error: GET /shipments - ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch shipments');
    }

    const data = await response.json();
    console.log(`✅ API Response: GET /shipments - ${data.shipments?.length || 0} shipments`);
    return data;
  }

  async getShipmentDetails(shipmentId: number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shipment details');
    }

    return response.json();
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(token?: string, period = '30d') {
    const url = `${API_BASE_URL}/analytics/dashboard?period=${period}`;
    console.log(`🔵 API Call: GET ${url}`);

    const response = await fetch(url, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      console.error(`❌ API Error: GET /analytics/dashboard - ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch analytics');
    }

    const data = await response.json();
    console.log(`✅ API Response: GET /analytics/dashboard`, data);
    return data;
  }

  // ==================== HISTORICAL DATA ====================

  async submitHistoricalShipment(data: HistoricalShipment, token?: string) {
    const response = await fetch(`${API_BASE_URL}/shipments/historical`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit historical data');
    }

    return response.json();
  }

  // ==================== ANALYTICS ====================

  async getDashboardAnalytics(token?: string): Promise<DashboardAnalytics> {
    const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch analytics');
    }

    return response.json();
  }

  // ==================== ML MODELS ====================

  async trainModels(token?: string) {
    const response = await fetch(`${API_BASE_URL}/ml/train`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to train models');
    }

    return response.json();
  }

  // ==================== HEALTH CHECK ====================

  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error('Backend is not healthy');
    }

    return response.json();
  }
}

export const apiClient = new APIClient();
