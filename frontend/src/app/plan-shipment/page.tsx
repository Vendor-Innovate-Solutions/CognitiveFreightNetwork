'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { apiClient, type RouteOption, type ShipmentPlanRequest } from '@/lib/cfn-api';

export default function PlanShipmentPage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<ShipmentPlanRequest>({
    origin_city: '',
    origin_state: '',
    destination_city: '',
    destination_state: '',
    cargo_weight_tons: 10,
    cargo_value: 500000,
    cargo_type: 'General',
    is_fragile: false,
    is_hazardous: false,
    pickup_datetime: new Date().toISOString().slice(0, 16),
    delivery_deadline: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
    transport_mode: 'Road',
    vehicle_type: 'Medium Truck (7.5-16T)',
    preference: 'balanced',
  });

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await apiClient.planShipment(formData, token || undefined);
      setRoutes(result.routes);
      
      // Show success message and redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to plan shipment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">📦 Plan New Shipment</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-bold underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="p-6 bg-white shadow-lg border-2 border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Shipment Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Origin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Origin City *
                  </label>
                  <input
                    type="text"
                    name="origin_city"
                    required
                    value={formData.origin_city}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Origin State *
                  </label>
                  <input
                    type="text"
                    name="origin_state"
                    required
                    value={formData.origin_state}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    name="destination_city"
                    required
                    value={formData.destination_city}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                    placeholder="Delhi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Destination State *
                  </label>
                  <input
                    type="text"
                    name="destination_state"
                    required
                    value={formData.destination_state}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                    placeholder="Delhi"
                  />
                </div>
              </div>

              {/* Cargo Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Weight (Tons) *
                  </label>
                  <input
                    type="number"
                    name="cargo_weight_tons"
                    required
                    min="0.1"
                    step="0.1"
                    value={formData.cargo_weight_tons}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Value (₹) *
                  </label>
                  <input
                    type="number"
                    name="cargo_value"
                    required
                    min="0"
                    value={formData.cargo_value}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Cargo Type *
                  </label>
                  <select
                    name="cargo_type"
                    value={formData.cargo_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Food">Food</option>
                    <option value="Chemicals">Chemicals</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Textiles">Textiles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Transport Mode *
                  </label>
                  <select
                    name="transport_mode"
                    value={formData.transport_mode}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  >
                    <option value="Road">Road</option>
                    <option value="Rail">Rail</option>
                    <option value="Air">Air</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  >
                    <option value="Small Truck (<7.5T)">Small Truck (&lt;7.5T)</option>
                    <option value="Medium Truck (7.5-16T)">Medium Truck (7.5-16T)</option>
                    <option value="Heavy Truck (16-25T)">Heavy Truck (16-25T)</option>
                    <option value="Multi-Axle (>25T)">Multi-Axle (&gt;25T)</option>
                    <option value="20ft Container">20ft Container</option>
                    <option value="40ft Container">40ft Container</option>
                    <option value="Rail Wagon">Rail Wagon</option>
                    <option value="Cargo Aircraft">Cargo Aircraft</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_fragile"
                    checked={formData.is_fragile}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Fragile</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_hazardous"
                    checked={formData.is_hazardous}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Hazardous</span>
                </label>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Pickup Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="pickup_datetime"
                    required
                    value={formData.pickup_datetime}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Delivery Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    name="delivery_deadline"
                    required
                    value={formData.delivery_deadline}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                  />
                </div>
              </div>

              {/* Preference */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Optimization Preference *
                </label>
                <select
                  name="preference"
                  value={formData.preference}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder-slate-400 bg-white"
                >
                  <option value="fastest">⚡ Fastest - Minimize time</option>
                  <option value="cheapest">💰 Cheapest - Minimize cost</option>
                  <option value="safest">🛡️ Safest - Minimize risk</option>
                  <option value="balanced">⚖️ Balanced - Best overall</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                {isLoading ? '🔄 Planning Routes...' : '🚀 Find Best Routes'}
              </button>
            </form>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Route Options</h2>
            
            {(!routes || routes.length === 0) && !isLoading && (
              <Card className="p-8 text-center bg-white shadow-lg border-2 border-slate-200">
                <p className="text-lg font-bold text-slate-700 mb-2">🗺️ No routes yet</p>
                <p className="text-sm text-slate-600 font-medium">Fill in the form and click "Find Best Routes" to see optimized route options</p>
              </Card>
            )}

            {isLoading && (
              <Card className="p-8 text-center bg-white shadow-lg border-2 border-blue-200">
                <div className="animate-pulse">
                  <p className="text-lg font-bold text-slate-800">🔄 Analyzing routes...</p>
                  <p className="text-sm text-slate-600 font-medium mt-2">Using AI to find optimal paths</p>
                </div>
              </Card>
            )}

            {routes && routes.length > 0 && (
              <Card className="p-4 bg-green-50 border-2 border-green-300 mb-4">
                <div className="text-center">
                  <p className="text-green-800 font-bold">✅ Routes planned successfully!</p>
                  <p className="text-green-700 text-sm">Redirecting to dashboard in 2 seconds...</p>
                </div>
              </Card>
            )}

            {routes && routes.map((route, index) => (
              <Card key={route.route_id} className="p-6 bg-white shadow-lg border-2 border-slate-200 hover:border-blue-300 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {index === 0 ? '🏆 ' : ''} Route Option {index + 1}
                    </h3>
                    <p className="text-sm text-slate-600 font-semibold">Cost Rank: #{route.cost_rank}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{route.cost_breakdown.total_estimated_cost.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600 font-semibold">
                      {route.estimated_time_hours.toFixed(1)}h • {route.total_distance_km.toFixed(0)}km
                    </p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-bold text-sm mb-2 text-slate-800">💰 Cost Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700 font-medium">Fuel:</span>
                      <span className="font-bold text-slate-900">₹{route.cost_breakdown.fuel_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700 font-medium">Tolls:</span>
                      <span className="font-bold text-slate-900">₹{route.cost_breakdown.toll_charges.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700 font-medium">Labor:</span>
                      <span className="font-bold text-slate-900">₹{route.cost_breakdown.driver_wages.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700 font-medium">Insurance:</span>
                      <span className="font-bold text-slate-900">₹{route.cost_breakdown.insurance_cost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                  <h4 className="font-bold text-sm mb-2 text-yellow-900">⚠️ Risk Level: {route.risk_assessment.risk_level}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-800 font-medium">Delay Risk:</span>
                      <span className="font-bold text-yellow-900">{(route.risk_assessment.delay_risk * 10).toFixed(1)}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-800 font-medium">Damage Risk:</span>
                      <span className="font-bold text-yellow-900">{(route.risk_assessment.damage_risk * 10).toFixed(1)}/10</span>
                    </div>
                  </div>
                </div>

                {/* Risk Mitigation */}
                {route.risk_assessment.mitigation_recommendations.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <h4 className="font-bold text-sm mb-2 text-green-900">🛡️ Risk Mitigation</h4>
                    <ul className="text-sm space-y-1">
                      {route.risk_assessment.mitigation_recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-green-800 font-medium">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


