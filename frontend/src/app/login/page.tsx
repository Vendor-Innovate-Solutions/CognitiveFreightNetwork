'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔐 Login attempt started:', { email });

    try {
      await login(email, password);
      console.log('✅ Login successful');
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            🚚 Cognitive Freight Network
          </h1>
          <p className="text-blue-700">AI-Powered Logistics Planning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-blue-900 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
              placeholder="company@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-blue-900 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 placeholder-blue-400 bg-white"
              placeholder="••••••••"
            />
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
            {isLoading ? '🔄 Signing in...' : '🚀 Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-blue-800">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-800 font-bold underline">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-blue-200">
          <h3 className="text-sm font-bold text-blue-900 mb-3">✨ Features:</h3>
          <ul className="text-sm text-blue-800 space-y-2 font-medium">
            <li>🎯 AI-powered route optimization</li>
            <li>💰 Cost prediction & savings analysis</li>
            <li>🌤️ Weather-aware planning</li>
            <li>⚠️ Risk assessment & mitigation</li>
            <li>📊 Real-time analytics dashboard</li>
          </ul>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-medium mb-1">🔧 Debug Info:</p>
            <p>API: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
            <p>Test: test@company.com / test123</p>
          </div>
        )}
      </Card>
    </div>
  );
}
