import React, { useState, useEffect } from 'react';
import { Hexagon, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../lib/auth-context';
import { getErrorMessage } from '../lib/types';
import { logger } from '../lib/logger';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check for session expired error from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam === 'session_expired') {
      setError('Your session has expired. Please log in again.');
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }
      if (!formData.password.trim()) {
        setError('Password is required');
        return;
      }

      await login(formData.email, formData.password);
      onNavigate('dashboard');
    } catch (error: unknown) {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)));
      const errorMessage = getErrorMessage(error, 'Login failed. Please check your credentials.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="border-b border-amber-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="w-8 h-8 fill-amber-500 text-amber-600" />
            <span className="tracking-tight text-gray-900">The Hive</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('home')}
            className="text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Log in to your Hive account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  className="mt-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="mt-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => onNavigate('register')}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

