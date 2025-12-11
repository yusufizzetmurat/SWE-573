import React, { useState, useEffect } from 'react';
import { Hexagon, Clock, Users, Heart, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { HomePageMap } from './HomePageMap';
import { serviceAPI, Service } from '../lib/api';
import { logger } from '../lib/logger';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await serviceAPI.list();
        setServices(data.slice(0, 10)); // Get first 10 for map display
      } catch (error) {
        logger.error('Failed to fetch services for map', error instanceof Error ? error : new Error(String(error)));
      }
    };
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="border-b border-amber-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="w-8 h-8 fill-amber-500 text-amber-600" />
            <span className="tracking-tight text-gray-900">The Hive</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('login')}
              className="text-gray-700 hover:text-gray-900"
            >
              Log In
            </Button>
            <Button 
              onClick={() => onNavigate('register')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-[1440px] mx-auto px-8 py-20">
        <div className="grid grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-900 mb-6">
              <Hexagon className="w-4 h-4 fill-amber-500" />
              <span className="text-sm">Community Time-Bank Platform</span>
            </div>
            <h1 className="text-gray-900 mb-6">
              Connecting Communities,<br />Sharing Time
            </h1>
            <p className="text-gray-600 mb-8 max-w-lg">
              Join a vibrant community where time is the currency. Share your skills, 
              learn from others, and build meaningful connections through mutual support 
              and collaboration.
            </p>
            <div className="flex items-center gap-4">
              <Button 
                size="lg"
                onClick={() => onNavigate('register')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate('login')}
              >
                Log In
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551847677-dc82d764e1eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBzaGFyaW5nJTIwaGFuZHN8ZW58MXx8fHwxNzYyMTE4NzY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Community sharing"
                className="w-full h-[500px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-6 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-gray-900">1,247 Hours</div>
                  <div className="text-sm text-gray-500">Shared This Month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-20 border-y border-gray-100">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The Hive uses a time-based economy where everyone's time is valued equally. 
              No money changes hands—just skills, knowledge, and community spirit.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Join the Community</h3>
              <p className="text-gray-600">
                Sign up and receive your first TimeBank hour. Browse services or post 
                what you can offer to the community.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Share Your Time</h3>
              <p className="text-gray-600">
                Connect with others, negotiate schedules, and exchange services. 
                Every hour you give earns you an hour to receive.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-gray-900 mb-3">Build Connections</h3>
              <p className="text-gray-600">
                Grow your network, learn new skills, and contribute to a thriving 
                community built on mutual support and trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-[1440px] mx-auto px-8 py-20">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-16 text-center text-white">
          <h2 className="text-white mb-4">Ready to Join The Hive?</h2>
          <p className="text-amber-50 mb-8 max-w-2xl mx-auto text-lg">
            Start sharing your time and skills with a community that values what you have to offer.
          </p>
          <Button 
            size="lg"
            onClick={() => onNavigate('register')}
            className="bg-white text-orange-600 hover:bg-amber-50"
          >
            Create Your Account
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Services Map Section */}
      <section className="bg-white py-20 border-y border-gray-100">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Explore Services Across Istanbul</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover in-person services available in different districts. Each location shows approximate areas to protect privacy.
            </p>
          </div>
          <HomePageMap services={services} onNavigate={onNavigate} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-[1440px] mx-auto px-8 text-center text-gray-500 text-sm">
          © 2025 The Hive. Building communities through shared time.
        </div>
      </footer>
    </div>
  );
}
