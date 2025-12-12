import React, { useState } from 'react';
import { type RegisterFormData } from '../lib/types';
import { Hexagon, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './Toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

interface RegistrationPageProps {
  onNavigate: (page: string) => void;
  onRegister: (data: RegisterFormData) => void;
}

export function RegistrationPage({ onNavigate, onRegister }: RegistrationPageProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.first_name.trim()) {
      setError('First name is required');
      showToast('First name is required', 'warning');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      showToast('Last name is required', 'warning');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      showToast('Email is required', 'warning');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      showToast('Password is required', 'warning');
      return;
    }
    if (!formData.confirmPassword) {
      setError('Confirm password is required');
      showToast('Confirm password is required', 'warning');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      showToast('Passwords do not match!', 'error');
      return;
    }
    if (!formData.agreeToTerms) {
      setError('Please agree to the Community Guidelines & GDPR');
      showToast('Please agree to the Community Guidelines & GDPR', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onRegister({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
      });
    } catch (err) {
      // Extract error message from API response
      let errorMessage = 'Registration failed. Please check your information and try again.';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: { detail?: string; error?: string; message?: string; [key: string]: unknown } } };
        const data = apiError.response?.data;
        if (data) {
          // Check for top-level error fields first
          if (data.detail) {
            errorMessage = typeof data.detail === 'string' ? data.detail : String(data.detail);
          } else if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : String(data.error);
          } else if (data.message) {
            errorMessage = typeof data.message === 'string' ? data.message : String(data.message);
          } else {
            // Handle field-level errors (e.g., {"email": ["user with this email already exists."]})
            const fieldErrors: string[] = [];
            for (const key in data) {
              if (Array.isArray(data[key])) {
                const messages = (data[key] as string[]).map(msg => `${key}: ${msg}`);
                fieldErrors.push(...messages);
              } else if (typeof data[key] === 'string') {
                fieldErrors.push(`${key}: ${data[key]}`);
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join('. ');
            }
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
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

      {/* Registration Form */}
      <div className="max-w-[520px] mx-auto px-8 py-16">
        <div className="text-center mb-8">
          <h1 className="text-gray-900 mb-3">Join The Hive</h1>
          <p className="text-gray-600">
            Create your account and start sharing time with your community
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* First Name */}
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Enter your first name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="mt-2"
                autoComplete="given-name"
              />
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Enter your last name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="mt-2"
                autoComplete="family-name"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-2"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="mt-2"
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="mt-2"
                autoComplete="new-password"
              />
            </div>


            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, agreeToTerms: checked as boolean })
                }
              />
              <Label 
                htmlFor="terms" 
                className="text-sm text-gray-600 leading-relaxed cursor-pointer"
              >
                I agree to The Hive's Community Guidelines and understand how my data 
                will be processed according to GDPR regulations
              </Label>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button 
                onClick={() => onNavigate('login')}
                className="text-orange-600 hover:text-orange-700 hover:underline"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
