import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users, Tag, Calendar, Monitor, Search } from 'lucide-react';
import { Navbar } from './Navbar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { serviceAPI, Service } from '../lib/api';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage, type NavigateData, type ApiError } from '../lib/types';
import { getBadgeMeta } from '../lib/badges';

interface DashboardProps {
  onNavigate: (page: string, data?: NavigateData) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

const mockServices = [
  {
    id: 1,
    type: 'offer',
    title: 'Manti Cooking Lesson',
    duration: 3,
    provider: 'Sarah Chen',
    location: 'North London',
    locationType: 'In-Person',
    schedule: 'Every Tuesday at 19:00',
    tags: ['cooking', 'turkish-cuisine', 'cultural'],
    participants: '2/4',
    description: 'Learn to make traditional Turkish manti from scratch',
    lat: 51.5574,
    lng: -0.1278,
  },
  {
    id: 2,
    type: 'need',
    title: 'German Language Practice',
    duration: 2,
    provider: 'Marcus Weber',
    location: 'East Berlin',
    locationType: 'Online',
    schedule: 'Weekends, flexible',
    tags: ['language', 'education', 'conversation'],
    participants: '1/1',
    description: 'Looking for native German speakers for conversation practice',
    lat: 52.5200,
    lng: 13.4050,
  },
  {
    id: 3,
    type: 'offer',
    title: 'Guitar Lessons for Beginners',
    duration: 1,
    provider: 'Alex Johnson',
    location: 'Downtown Manchester',
    locationType: 'In-Person',
    schedule: 'Saturdays at 14:00',
    tags: ['music', 'teaching', 'beginner-friendly'],
    participants: '1/3',
    description: 'Basic guitar fundamentals and your first songs',
    lat: 53.4808,
    lng: -2.2426,
  },
  {
    id: 4,
    type: 'offer',
    title: 'Urban Gardening Workshop',
    duration: 2,
    provider: 'Emma Green',
    location: 'South London',
    locationType: 'In-Person',
    schedule: 'One-time: Nov 15, 10:00',
    tags: ['gardening', 'sustainability', 'workshop'],
    participants: '5/8',
    description: 'Learn to grow vegetables in small urban spaces',
    lat: 51.4545,
    lng: -0.1084,
  },
  {
    id: 5,
    type: 'need',
    title: 'Moving Help Wanted',
    duration: 4,
    provider: 'Tom Miller',
    location: 'West London',
    locationType: 'In-Person',
    schedule: 'Nov 8, 9:00 AM',
    tags: ['physical-help', 'moving', 'one-time'],
    participants: '0/2',
    description: 'Want help moving furniture to new apartment',
    lat: 51.5074,
    lng: -0.2278,
  },
];

export function Dashboard({ onNavigate, userBalance = 1, unreadNotifications = 2, onLogout }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params: { location_type?: string } = {};
        
        if (activeFilter === 'online') {
          params.location_type = 'Online';
        }
        
        const data = await serviceAPI.list(params);
        
        // Remove duplicates by service ID (fix for recurrent events showing multiple times)
        const uniqueServices = Array.from(
          new Map(data.map(service => [service.id, service])).values()
        );
        
        // Apply client-side filtering
        let filteredData = uniqueServices;
        
        if (activeFilter === 'weekend') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysUntilSaturday = (6 - dayOfWeek) % 7 || 7;
          const saturday = new Date(now);
          saturday.setDate(now.getDate() + daysUntilSaturday);
          saturday.setHours(0, 0, 0, 0);
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          
          filteredData = data.filter(service => {
            if (!service.schedule_details) return false;
            const scheduleLower = service.schedule_details.toLowerCase();
            if (scheduleLower.includes('saturday') || scheduleLower.includes('sunday') || scheduleLower.includes('weekend')) {
              return true;
            }
            // Check if it's a one-time event this weekend
            if (service.schedule_type === 'One-Time' && service.schedule_details) {
              try {
                const scheduleDate = new Date(service.schedule_details);
                return scheduleDate >= saturday && scheduleDate <= sunday;
              } catch {
                return false;
              }
            }
            return false;
          });
        } else if (activeFilter === 'recurrent') {
          filteredData = data.filter(service => service.schedule_type === 'Recurrent');
        } else if (activeFilter === 'newest') {
          filteredData = [...data].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });
        }
        
        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          filteredData = filteredData.filter(service => {
            const titleMatch = service.title.toLowerCase().includes(query);
            const descMatch = service.description.toLowerCase().includes(query);
            const tagMatch = service.tags?.some(tag => tag.name.toLowerCase().includes(query));
            return titleMatch || descMatch || tagMatch;
          });
        }
        
        setServices(filteredData);
      } catch (err: unknown) {
        console.error('Failed to fetch services:', err);
        const errorMessage = getErrorMessage(err, 'Failed to load services. Please try again.');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [activeFilter, searchQuery]);

  const filters = [
    { id: 'all', label: 'All Services' },
    { id: 'weekend', label: 'This Weekend' },
    { id: 'online', label: 'Online Only' },
    { id: 'recurrent', label: 'Recurrent' },
    { id: 'newest', label: 'Newest' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="browse" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={true}
      />

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-gray-900 mb-2">Browse Services</h1>
          <p className="text-gray-600">
            Discover what your community has to offer and share
          </p>
        </div>

        {/* Map Section - Above Services */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Map View</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Offers</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Wants</span>
                </div>
              </div>
            </div>
            
            {/* Map Placeholder */}
            <div className="h-[400px] rounded-lg bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Interactive Map View</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Services pinned by general location
                  </p>
                </div>
              </div>
              
              {/* Mock Map Pins */}
              {mockServices.map((service, index) => (
                <div
                  key={service.id}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform ${
                    service.type === 'offer' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    top: `${20 + index * 15}%`,
                    left: `${15 + index * 18}%`,
                  }}
                >
                  <MapPin className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services List Section - Below Map */}
        <div>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search services, skills, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 pb-6 border-b border-gray-200">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Service Cards */}
          {isLoading ? (
            <div className="text-center py-12 text-gray-600">Loading services...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-gray-600">No services found. Be the first to post one!</div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {services.map((service) => {
                const serviceUser = typeof service.user === 'object' ? service.user : null;
                const userName = serviceUser 
                  ? `${serviceUser.first_name || ''} ${serviceUser.last_name || ''}`.trim() || serviceUser.email
                  : 'User';
                const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                const avatarUrl = serviceUser?.avatar_url;
                const providerBadges = Array.isArray(serviceUser?.badges) ? serviceUser?.badges ?? [] : [];
                const featuredBadge = providerBadges.length ? getBadgeMeta(providerBadges[0]) : undefined;
                
                return (
                <button
                  key={service.id}
                  onClick={() => onNavigate('service-detail', service)}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-md transition-all text-left"
                >
                  <div className="mb-3">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-gray-900 truncate">{service.title}</h3>
                          <Badge 
                            variant={service.type === 'Offer' ? 'default' : 'secondary'}
                            className={service.type === 'Offer' 
                              ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            }
                          >
                            {service.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{userName}</p>
                        {featuredBadge && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                            <featuredBadge.icon className="w-3 h-3" />
                            {featuredBadge.label}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{service.description}</p>
                  </div>

                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimebank(service.duration)}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {service.location_type === 'Online' ? (
                        <Monitor className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                      <span>{service.location_type}</span>
                    </div>
                  </div>

                  {service.schedule_details && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>{service.schedule_details}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service.tags && service.tags.slice(0, 2).map((tag) => (
                        <span 
                          key={tag.id}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
                        >
                          #{tag.name}
                        </span>
                      ))}
                      {providerBadges.slice(1, 3).map((badgeId) => {
                        const badgeMeta = getBadgeMeta(badgeId);
                        if (!badgeMeta) return null;
                        const Icon = badgeMeta.icon;
                        return (
                          <span key={badgeId} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">
                            <Icon className="w-3 h-3" />
                            {badgeMeta.label}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" />
                      <span>Max {service.max_participants}</span>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
