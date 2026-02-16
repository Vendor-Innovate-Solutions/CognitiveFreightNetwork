'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { apiClient, type HistoricalShipment } from '@/lib/cfn-api';

export default function HistoricalDataPage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<HistoricalShipment>({
    origin_city: '',
    origin_state: '',
    destination_city: '',
    destination_state: '',
    distance_km: 0,
    cargo_weight_tons: 10,
    cargo_value: 500000,
    cargo_type: 'General',
    is_fragile: false,
    is_hazardous: false,
    pickup_datetime: '',
    delivery_datetime: '',
    transport_mode: 'Road',
    total_cost: 0,
    fuel_cost: 0,
    toll_charges: 0,
    labor_cost: 0,
    maintenance_cost: 0,
    weather_conditions: '',
    delays_hours: 0,
    incidents: '',
    driver_rating: 5,
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await apiClient.submitHistoricalShipment(formData, token || undefined);
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setFormData({
          origin_city: '',
          origin_state: '',
          destination_city: '',
          destination_state: '',
          distance_km: 0,
          cargo_weight_tons: 10,
          cargo_value: 500000,
          cargo_type: 'General',
          is_fragile: false,
          is_hazardous: false,
          pickup_datetime: '',
          delivery_datetime: '',
          transport_mode: 'Road',
          total_cost: 0,
          fuel_cost: 0,
          toll_charges: 0,
          labor_cost: 0,
          maintenance_cost: 0,
          weather_conditions: '',
          delays_hours: 0,
          incidents: '',
          driver_rating: 5,
          notes: '',
        });
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit historical data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">📊 Add Historical Shipment Data</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-bold underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 mb-6 bg-blue-50 border-2 border-blue-300 shadow-lg">
          <h3 className="font-bold text-blue-900 mb-2 text-lg">🎯 Why Add Historical Data?</h3>
          <ul className="text-sm text-blue-900 space-y-1 font-medium">
            <li>• Train AI models to predict costs and delays accurately</li>
            <li>• Get personalized route recommendations based on your history</li>
            <li>• Identify patterns and optimize your logistics operations</li>
            <li>• Need 50+ shipments for best ML model performance</li>
          </ul>
        </Card>

        <Card className="p-6 bg-white shadow-lg border-2 border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Route Information */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Route Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin City *
                  </label>
                  <input
                    type="text"
                    name="origin_city"
                    required
                    value={formData.origin_city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin State *
                  </label>
                  <input
                    type="text"
                    name="origin_state"
                    required
                    value={formData.origin_state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    name="destination_city"
                    required
                    value={formData.destination_city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination State *
                  </label>
                  <input
                    type="text"
                    name="destination_state"
                    required
                    value={formData.destination_state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance (km) *
                  </label>
                  <input
                    type="number"
                    name="distance_km"
                    required
                    min="0"
                    value={formData.distance_km}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Mode *
                  </label>
                  <select
                    name="transport_mode"
                    value={formData.transport_mode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Road">Road</option>
                    <option value="Rail">Rail</option>
                    <option value="Air">Air</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cargo Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Cargo Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (Tons) *
                  </label>
                  <input
                    type="number"
                    name="cargo_weight_tons"
                    required
                    min="0"
                    step="0.1"
                    value={formData.cargo_weight_tons}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value (₹) *
                  </label>
                  <input
                    type="number"
                    name="cargo_value"
                    required
                    min="0"
                    value={formData.cargo_value}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo Type *
                  </label>
                  <select
                    name="cargo_type"
                    value={formData.cargo_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Food">Food</option>
                    <option value="Chemicals">Chemicals</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Textiles">Textiles</option>
                  </select>
                </div>
                <div className="flex gap-4 items-center pt-8">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_fragile"
                      checked={formData.is_fragile}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">Fragile</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_hazardous"
                      checked={formData.is_hazardous}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">Hazardous</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="pickup_datetime"
                    required
                    value={formData.pickup_datetime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="delivery_datetime"
                    required
                    value={formData.delivery_datetime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delays (Hours)
                  </label>
                  <input
                    type="number"
                    name="delays_hours"
                    min="0"
                    step="0.5"
                    value={formData.delays_hours}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cost Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Cost Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Cost (₹) *
                  </label>
                  <input
                    type="number"
                    name="total_cost"
                    required
                    min="0"
                    value={formData.total_cost}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Cost (₹)
                  </label>
                  <input
                    type="number"
                    name="fuel_cost"
                    min="0"
                    value={formData.fuel_cost}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Toll Charges (₹)
                  </label>
                  <input
                    type="number"
                    name="toll_charges"
                    min="0"
                    value={formData.toll_charges}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Cost (₹)
                  </label>
                  <input
                    type="number"
                    name="labor_cost"
                    min="0"
                    value={formData.labor_cost}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Cost (₹)
                  </label>
                  <input
                    type="number"
                    name="maintenance_cost"
                    min="0"
                    value={formData.maintenance_cost}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weather Conditions
                  </label>
                  <input
                    type="text"
                    name="weather_conditions"
                    value={formData.weather_conditions}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Clear, Rainy, Foggy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incidents
                  </label>
                  <textarea
                    name="incidents"
                    value={formData.incidents}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any incidents, delays, or issues during transit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Rating (1-5)
                  </label>
                  <input
                    type="number"
                    name="driver_rating"
                    min="1"
                    max="5"
                    value={formData.driver_rating}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes or observations"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg font-medium">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-2 border-green-300 text-green-800 px-4 py-3 rounded-lg font-semibold">
                ✅ Historical data submitted successfully! Keep adding more to improve ML predictions.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              {isLoading ? '⏳ Submitting...' : '✅ Submit Historical Data'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

