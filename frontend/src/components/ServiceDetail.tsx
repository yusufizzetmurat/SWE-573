import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Calendar, Users, Monitor, Flag, Tag } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { serviceAPI, handshakeAPI, Service } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ServiceMap } from './ServiceMap';
import { useToast } from './Toast';
import { getBadgeMeta } from '../lib/badges';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage, type NavigateData, type ApiError } from '../lib/types';

interface ServiceDetailProps {
  onNavigate: (page: string) => void;
  serviceData?: NavigateData & { id?: string; full?: boolean };
  userBalance?: number;
  unreadNotifications?: number;
}

export function ServiceDetail({ onNavigate, serviceData, userBalance = 1, unreadNotifications = 2 }: ServiceDetailProps) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(serviceData || null);
  const [isLoading, setIsLoading] = useState(!serviceData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInterest, setHasInterest] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      if (serviceData?.id && !serviceData.full) {
        // If we only have basic service data, fetch full details
        try {
          setIsLoading(true);
          const fullService = await serviceAPI.get(serviceData.id);
          setService(fullService);
        } catch (err: unknown) {
          console.error('Failed to fetch service:', err);
          const errorMessage = getErrorMessage(err, 'Failed to load service details.');
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      } else if (serviceData && !serviceData.id) {
        // Invalid service data
        setError('Invalid service data.');
        setIsLoading(false);
      }
    };

    fetchService();
  }, [serviceData]);

  // Check if user has already expressed interest
  useEffect(() => {
    const checkInterest = async () => {
      if (!isAuthenticated || !user || !service?.id) {
        setHasInterest(false);
        setHandshakeStatus(null);
        return;
      }

      const providerId = typeof service.user === 'object' ? service.user?.id : service.user;
      if (providerId === user.id) {
        setHasInterest(false);
        setHandshakeStatus(null);
        return;
      }

      try {
        const handshakes = await handshakeAPI.list();
        const existingHandshake = handshakes.find(
          h => {
            let handshakeServiceId: string | null = null;
            if (typeof h.service === 'string') {
              handshakeServiceId = h.service;
            } else if (typeof h.service === 'object' && h.service !== null && 'id' in h.service) {
              handshakeServiceId = h.service.id;
            }
            return handshakeServiceId === service.id && (h.status === 'pending' || h.status === 'accepted');
          }
        );
        if (existingHandshake) {
          setHasInterest(true);
          setHandshakeStatus(existingHandshake.status);
        } else {
          setHasInterest(false);
          setHandshakeStatus(null);
        }
      } catch (err) {
        console.error('Failed to check interest:', err);
        setHasInterest(false);
        setHandshakeStatus(null);
      }
    };

    checkInterest();
  }, [isAuthenticated, user, service]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          activeLink="browse" 
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onNavigate={onNavigate}
          onLogout={() => {}}
          isAuthenticated={true}
        />
        <div className="max-w-[1440px] mx-auto px-8 py-8">
          <div className="text-center py-12 text-gray-600">Loading service details...</div>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          activeLink="browse" 
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onNavigate={onNavigate}
          onLogout={() => {}}
          isAuthenticated={true}
        />
        <div className="max-w-[1440px] mx-auto px-8 py-8">
          <div className="text-center py-12 text-red-600">{error || 'Service not found'}</div>
          <Button onClick={() => onNavigate('dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Get provider info (user field might be string or User object)
  const providerUser = typeof service.user === 'object' ? service.user : null;
  const providerName = providerUser 
    ? `${providerUser.first_name} ${providerUser.last_name}`.trim() || providerUser.email
    : (typeof service.user === 'string' ? service.user : 'Unknown');
  const providerBio = providerUser?.bio;
  const providerKarma = providerUser?.karma_score || 0;
  const providerDateJoined = providerUser?.date_joined;
  const providerBadges = Array.isArray(providerUser?.badges) ? providerUser.badges : [];
  const primaryProviderBadge = providerBadges.length ? getBadgeMeta(providerBadges[0]) : undefined;
  
  // Format date joined
  const formatDateJoined = (dateString?: string) => {
    if (!dateString) return 'Member';
    try {
      const date = new Date(dateString);
      return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Member';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="browse" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={() => {}}
        isAuthenticated={true}
      />

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => onNavigate('dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Browse
        </Button>

        <div className="grid grid-cols-[1fr_400px] gap-8">
          {/* Main Content */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-gray-900">{service.title}</h1>
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
                  </div>
                </div>

                {/* Key Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Duration</div>
                      <div className="text-gray-900">{formatTimebank(service.duration)} TimeBank {formatTimebank(service.duration) === '1' ? 'Hour' : 'Hours'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Schedule</div>
                      <div className="text-gray-900">
                        {service.schedule_type}: {service.schedule_details || 'TBD'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      {service.location_type === 'Online' ? (
                        <Monitor className="w-5 h-5 text-white" />
                      ) : (
                        <MapPin className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Location Type</div>
                      <div className="text-gray-900">{service.location_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Max Participants</div>
                      <div className="text-gray-900">{service.max_participants}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-gray-900 mb-3">Description</h3>
                <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {service.description}
                </div>
              </div>

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div>
                  <h3 className="text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span 
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm"
                      >
                        <Tag className="w-3 h-3" />
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Map/Image */}
        <div className="mt-6">
          <ServiceMap 
            locationType={service.location_type}
            locationArea={service.location_area}
            locationLat={service.location_lat}
            locationLng={service.location_lng}
            locationDetails={service.location_type === 'In-Person' ? 'Location will be shared after handshake' : undefined}
          />
        </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Service Provider</h3>
              
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  {serviceData && typeof serviceData.user === 'object' && serviceData.user !== null && 'avatar_url' in serviceData.user && serviceData.user.avatar_url && (
                    <AvatarImage 
                      src={serviceData.user.avatar_url} 
                      alt={providerName} 
                    />
                  )}
                  <AvatarFallback className="bg-amber-100 text-amber-700 text-lg">
                    {providerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1 font-medium">{providerName}</div>
                  <div className="text-sm text-gray-600">
                    Service Provider
                  </div>
                </div>
              </div>

              {primaryProviderBadge && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                    <primaryProviderBadge.icon className="w-3 h-3" />
                    {primaryProviderBadge.label}
                  </Badge>
                </div>
              )}

              {providerBio && (
                <p className="text-sm text-gray-700 mb-4">
                  {providerBio}
                </p>
              )}

              {providerBadges.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {providerBadges.slice(1, 4).map((badgeId) => {
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
              )}

              <div className="flex gap-2 text-sm">
                <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-gray-900 font-semibold">{providerKarma}</div>
                  <div className="text-xs text-gray-500">Karma</div>
                </div>
                <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-gray-900 text-xs font-medium">{formatDateJoined(providerDateJoined)}</div>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {hasInterest ? (
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white mb-3"
                    size="lg"
                    onClick={() => onNavigate('messages')}
                  >
                    {handshakeStatus === 'accepted' ? 'Open Chat' : 'Interest Pending - View Chat'}
                  </Button>
                  <p className="text-sm text-gray-600 text-center">
                    {handshakeStatus === 'accepted' 
                      ? 'Your interest has been accepted! You can now chat with the provider.'
                      : 'You have already expressed interest. Waiting for provider response.'}
                  </p>
                </div>
              ) : (
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white mb-3"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!isAuthenticated) {
                      showToast('Please log in to express interest', 'warning');
                      onNavigate('login');
                      return;
                    }
                    
                    if (isSubmitting) return;
                    
                    setIsSubmitting(true);
                    try {
                      const result = await handshakeAPI.expressInterest(service.id);
                      setHasInterest(true);
                      setHandshakeStatus('pending');
                      showToast('Interest expressed! Opening chat...', 'success');
                      setTimeout(() => {
                        onNavigate('messages');
                      }, 1000);
                    } catch (error: unknown) {
                      console.error('Express interest error:', error);
                      const apiError = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
                      if (apiError.response?.status === 401) {
                        showToast('Please log in to express interest', 'warning');
                        onNavigate('login');
                      } else if (apiError.response?.status === 403) {
                        showToast('Access denied. Please try logging in again.', 'error');
                        onNavigate('login');
                      } else if (apiError.response?.status === 400 && apiError.response?.data?.error?.includes('already expressed')) {
                        setHasInterest(true);
                        setHandshakeStatus('pending');
                        showToast('You have already expressed interest', 'info');
                      } else {
                        const errorMsg = getErrorMessage(error, 'Failed to express interest');
                        showToast(errorMsg, 'error');
                      }
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Processing...
                    </span>
                  ) : (
                    'Express Interest'
                  )}
                </Button>
              )}
              
              <button 
                className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-2 mx-auto"
              >
                <Flag className="w-4 h-4" />
                Report this listing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
