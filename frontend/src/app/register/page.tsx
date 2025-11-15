'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company_type: 'Shipper',
    phone: '',
    gstin: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password.length > 50) {
      setError('Password must be at most 50 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await register({
        ...registerData,
        phone: registerData.phone || undefined,
        gstin: registerData.gstin || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 p-4">
      <Card className="w-full max-w-2xl p-8 shadow-2xl bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            🚚 Create Your Account
          </h1>
          <p className="text-blue-700 font-medium">Join Cognitive Freight Network today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-blue-900 mb-2">
                Company Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="ABC Logistics Pvt Ltd"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-blue-900 mb-2">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-blue-900 mb-2">
                Password * (6-50 characters)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                maxLength={50}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="6-50 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-blue-900 mb-2">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="Re-enter password"
              />
            </div>

            <div>
              <label htmlFor="company_type" className="block text-sm font-semibold text-blue-900 mb-2">
                Company Type *
              </label>
              <select
                id="company_type"
                name="company_type"
                required
                value={formData.company_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 bg-white font-medium"
              >
                <option value="Shipper">Shipper</option>
                <option value="Transporter">Transporter</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-blue-900 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="gstin" className="block text-sm font-semibold text-blue-900 mb-2">
                GSTIN (15 digits)
              </label>
              <input
                id="gstin"
                name="gstin"
                type="text"
                value={formData.gstin}
                onChange={handleChange}
                maxLength={15}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
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
            {isLoading ? '🔄 Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-blue-800">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-bold underline">
              Sign in here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
