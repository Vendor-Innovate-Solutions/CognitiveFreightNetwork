'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Company {
  id: number;
  name: string;
  email: string;
  company_type: string;
  phone?: string;
  gstin?: string;
}

interface AuthContextType {
  company: Company | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  company_type: string;
  phone?: string;
  gstin?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedCompany = localStorage.getItem('company');
    
    if (storedToken && storedCompany) {
      setToken(storedToken);
      setCompany(JSON.parse(storedCompany));
      
      // Verify token is still valid by fetching profile
      fetchProfile(storedToken).catch(() => {
        // Token invalid, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('company');
        setToken(null);
        setCompany(null);
      });
    }
    setIsLoading(false);
  }, []);

  const fetchProfile = async (authToken: string) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const data = await response.json();
    setCompany(data);
    localStorage.setItem('company', JSON.stringify(data));
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    console.log('🔐 AuthContext: Starting login request to', `${API_URL}/auth/login`);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      console.log('📤 Sending login request with form data');

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      console.log('📡 Login API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
        console.error('❌ Login failed:', errorData);
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ Login response received:', { hasToken: !!data.access_token });
      
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);

      // Fetch company profile
      console.log('📥 Fetching company profile...');
      await fetchProfile(data.access_token);

      console.log('🚀 Redirecting to dashboard');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('❌ AuthContext login error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const responseData = await response.json();
      setToken(responseData.access_token);
      setCompany(responseData.company);
      
      localStorage.setItem('token', responseData.access_token);
      localStorage.setItem('company', JSON.stringify(responseData.company));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setCompany(null);
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ company, token, login, register, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
