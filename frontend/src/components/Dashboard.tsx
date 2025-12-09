import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Clock, Users, Tag, Calendar, Monitor, Search, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { serviceAPI, Service } from '../lib/api';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage, type NavigateData, type ApiError } from '../lib/types';
import { getBadgeMeta } from '../lib/badges';
import { HomePageMap } from './HomePageMap';

interface DashboardProps {
  onNavigate: (page: string, data?: NavigateData) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

export function Dashboard({ onNavigate, userBalance = 1, unreadNotifications = 2, onLogout }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Location-based search state
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(10);
  const [debouncedDistanceKm, setDebouncedDistanceKm] = useState<number>(10);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  
  // Debounce timer ref for distance slider
  const distanceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to store requestLocation function to avoid stale closure
  const requestLocationRef = useRef<(() => void) | null>(null);
  
  // Check geolocation permission status on mount
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    let cleanup: (() => void) | null = null;

    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          permissionStatus = result;
          setPermissionState(result.state);
          
          // Listen for permission changes
          const handleChange = () => {
            if (!permissionStatus) return;
            setPermissionState(permissionStatus.state);
            // If permission was just granted, try to get location
            if (permissionStatus.state === 'granted') {
              // Use current state via functional update to avoid stale closure
              setUserLocation(current => {
                if (!current && requestLocationRef.current) {
                  requestLocationRef.current();
                }
                return current;
              });
            }
          };
          
          result.addEventListener('change', handleChange);
          
          // Return cleanup function
          cleanup = () => {
            if (permissionStatus) {
              permissionStatus.removeEventListener('change', handleChange);
            }
          };
        } catch {
          // Permission API not supported for geolocation
          setPermissionState(null);
        }
      }
    };
    
    checkPermission();
    
    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);
  
  // Debounce distanceKm changes to prevent excessive API calls while dragging slider
  useEffect(() => {
    // Clear any existing timeout
    if (distanceDebounceRef.current) {
      clearTimeout(distanceDebounceRef.current);
    }
    
    // Set new timeout to update debounced value after 300ms of no changes
    distanceDebounceRef.current = setTimeout(() => {
      setDebouncedDistanceKm(distanceKm);
    }, 300);
    
    // Cleanup timeout on unmount or when distanceKm changes
    return () => {
      if (distanceDebounceRef.current) {
        clearTimeout(distanceDebounceRef.current);
      }
    };
  }, [distanceKm]);

  // Function to request user location
  const requestLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationEnabled(true);
        setLocationLoading(false);
        setPermissionState('granted');
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        let helpText = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            helpText = ' — Please allow location access in your browser settings (click the lock icon in the address bar)';
            setPermissionState('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            helpText = ' — Please ensure location services are enabled on your device';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            helpText = ' — Please try again';
            break;
        }
        setLocationError(errorMessage + helpText);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  }, []);
  
  // Update ref whenever requestLocation changes
  useEffect(() => {
    requestLocationRef.current = requestLocation;
  }, [requestLocation]);
  
  // Toggle location-based search
  const toggleLocationSearch = useCallback(() => {
    if (locationEnabled) {
      setLocationEnabled(false);
    } else if (userLocation) {
      setLocationEnabled(true);
    } else {
      requestLocation();
    }
  }, [locationEnabled, userLocation, requestLocation]);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build API params including location if enabled
        const apiParams: Parameters<typeof serviceAPI.list>[0] = {};
        
        if (locationEnabled && userLocation) {
          apiParams.lat = userLocation.lat;
          apiParams.lng = userLocation.lng;
          apiParams.distance = debouncedDistanceKm;
        }
        
        const data = await serviceAPI.list(apiParams, abortController.signal);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        // Remove duplicates by service ID (fix for recurrent events showing multiple times)
        const uniqueServices = Array.from(
          new Map(data.map(service => [service.id, service])).values()
        );
        
        // Apply client-side filtering
        let filteredData = uniqueServices;
        
        if (activeFilter === 'online') {
          filteredData = filteredData.filter(service => service.location_type === 'Online');
        } else if (activeFilter === 'weekend') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysUntilSaturday = (6 - dayOfWeek) % 7 || 7;
          const saturday = new Date(now);
          saturday.setDate(now.getDate() + daysUntilSaturday);
          saturday.setHours(0, 0, 0, 0);
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          
          filteredData = filteredData.filter(service => {
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
          filteredData = filteredData.filter(service => service.schedule_type === 'Recurrent');
        } else if (activeFilter === 'newest') {
          filteredData = [...filteredData].sort((a, b) => {
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
        
        if (isMounted && !abortController.signal.aborted) {
          setServices(filteredData);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
        if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          setIsLoading(false);
          return;
        }
        
        console.error('Failed to fetch services:', err);
        const errorMessage = getErrorMessage(err, 'Failed to load services. Please try again.');
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchServices();

    // Auto-refresh services every 30 seconds to catch status changes
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchServices();
      }
    }, 30000);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        fetchServices();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh on window focus
    const handleFocus = () => {
      if (isMounted) {
        fetchServices();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeFilter, searchQuery, locationEnabled, userLocation, debouncedDistanceKm]);

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
              <h3 className="text-gray-900 font-semibold">Map View</h3>
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
            
            {/* Interactive Map */}
            <div className="w-full" style={{ minHeight: '400px' }}>
              <HomePageMap services={services.map(service => ({
                id: service.id,
                title: service.title,
                location_area: service.location_area,
                location_type: service.location_type,
                location_lat: service.location_lat,
                location_lng: service.location_lng,
                type: service.type,
                user: service.user,
              }))} />
            </div>
          </div>
        </div>

        {/* Services List Section - Below Map */}
        <div>
          {/* Search and Location Controls */}
          <div className="mb-6 space-y-4">
            {/* Text Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search services, skills, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Distance Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-gray-900">Search by Distance</span>
                </div>
                <Button
                  variant={locationEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleLocationSearch}
                  disabled={locationLoading || permissionState === 'denied'}
                  className={locationEnabled ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting location...
                    </>
                  ) : locationEnabled ? (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Enabled
                    </>
                  ) : permissionState === 'denied' ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Permission Denied
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Enable Location
                    </>
                  )}
                </Button>
              </div>
              
              {locationError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{locationError}</p>
                </div>
              )}
              
              {/* Always show the slider - disabled when location not enabled */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${locationEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                    Distance: {distanceKm} km
                  </span>
                  <span className="text-xs text-gray-400">
                    {distanceKm <= 5 ? 'Nearby' : distanceKm <= 15 ? 'Local Area' : distanceKm <= 30 ? 'Wider Area' : 'City-wide'}
                  </span>
                </div>
                <Slider
                  value={[distanceKm]}
                  onValueChange={([value]) => setDistanceKm(value)}
                  min={1}
                  max={50}
                  step={1}
                  className={`w-full ${!locationEnabled ? 'opacity-50' : ''}`}
                  disabled={!locationEnabled}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
              </div>
              
              {!locationEnabled && !locationLoading && !locationError && (
                <p className="text-sm text-gray-500 mt-3">
                  {permissionState === 'denied' 
                    ? 'Location access was denied. Please update your browser settings to enable distance-based search.'
                    : 'Enable location to find services near you, sorted by distance.'
                  }
                </p>
              )}
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
                  onClick={() => onNavigate('service-detail', { ...service, full: true })}
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
                            {service.type === 'Need' ? 'Want' : service.type}
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
