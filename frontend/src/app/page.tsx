'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { company, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (company) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [company, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          🚚 Cognitive Freight Network
        </h1>
        <p className="text-slate-700 font-medium text-lg">🔄 Loading...</p>
      </div>
    </div>
  );
}
