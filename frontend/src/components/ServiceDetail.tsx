import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Calendar, Users, Monitor, Flag, Tag, MessageSquare, Play, Image as ImageIcon } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { serviceAPI, handshakeAPI, Service } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ServiceMap } from './ServiceMap';
import { useToast } from './Toast';
import { getBadgeMeta } from '../lib/badges';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage, type NavigateData } from '../lib/types';
import { PublicChat } from './PublicChat';
import { CommentSection } from './CommentSection';
import { logger } from '../lib/logger';

interface ServiceDetailProps {
  onNavigate: (page: string) => void;
  serviceData?: NavigateData & { id?: string; full?: boolean };
  userBalance?: number;
  unreadNotifications?: number;
}

export function ServiceDetail({ onNavigate, serviceData, userBalance = 1, unreadNotifications = 2 }: ServiceDetailProps) {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(serviceData || null);
  const [isLoading, setIsLoading] = useState(!serviceData || !serviceData.full);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInterest, setHasInterest] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      // Extract service ID from URL if not in serviceData
      let serviceId = serviceData?.id;
      
      if (!serviceId) {
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'service-detail' && pathParts[2]) {
          serviceId = pathParts[2];
        }
      }
      
      if (serviceId && (!serviceData || !serviceData.full)) {
        // Fetch full service details from API
        try {
          setIsLoading(true);
          setError(null);
          const fullService = await serviceAPI.get(serviceId);
          setService(fullService);
        } catch (err: unknown) {
          logger.error('Failed to fetch service', err instanceof Error ? err : new Error(String(err)), { serviceId });
          const errorMessage = getErrorMessage(err, 'Failed to load service details.');
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      } else if (!serviceId) {
        // No service ID available
        setError('Service not found');
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
        logger.error('Failed to check interest', err instanceof Error ? err : new Error(String(err)), { serviceId: service?.id });
        setHasInterest(false);
        setHandshakeStatus(null);
      }
    };

    checkInterest();

    // Auto-refresh handshake status every 3 seconds if service is loaded
    if (service?.id) {
      const refreshInterval = setInterval(() => {
        checkInterest();
      }, 3000);

      return () => clearInterval(refreshInterval);
    }
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
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="discussion" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Public Discussion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details">
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
                            {service.type === 'Need' ? 'Want' : service.type}
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

                  {/* Service Media */}
                  {service.media && service.media.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-gray-900 mb-3">Photos</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {service.media.map((mediaItem: any) => {
                          // Handle both file URLs and file objects
                          let imageUrl = '';
                          if (mediaItem.image) {
                            // If it's a file URL from backend (preferred)
                            imageUrl = mediaItem.image;
                          } else if (mediaItem.file_url) {
                            // If it's a data URL or external URL
                            imageUrl = mediaItem.file_url;
                          } else if (mediaItem.file) {
                            // Fallback to file field
                            imageUrl = mediaItem.file;
                          }
                          
                          if (!imageUrl) return null;
                          
                          return (
                            <div key={mediaItem.id} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={imageUrl} 
                                alt="Service photo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Hide broken images
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                {/* Comments Section */}
                <CommentSection serviceId={service.id} onNavigate={onNavigate} />
              </TabsContent>

              <TabsContent value="discussion">
                <PublicChat serviceId={service.id} onNavigate={onNavigate} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Card */}
            <div 
              className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
              onClick={() => {
                const providerId = typeof service.user === 'object' ? service.user?.id : service.user;
                if (providerId) {
                  onNavigate('public-profile', { userId: providerId });
                }
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">{service.type === 'Offer' ? 'Service Provider' : 'Service Receiver'}</h3>
                <span className="text-xs text-amber-600 font-medium">View Profile →</span>
              </div>
              
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
                    {service.type === 'Offer' ? 'Service Provider' : 'Service Receiver'}
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

            {/* Provider Media - 2x3 Grid (1 video, up to 5 photos) */}
            {(providerUser?.video_intro_url || providerUser?.video_intro_file_url || (providerUser?.portfolio_images && providerUser.portfolio_images.length > 0)) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Provider Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Video (first position) */}
                  {(providerUser.video_intro_url || providerUser.video_intro_file_url) && (() => {
                    const videoUrl = providerUser.video_intro_url;
                    const videoFileUrl = providerUser.video_intro_file_url;
                    let videoElement = null;
                    
                    if (videoUrl) {
                      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
                      if (youtubeMatch) {
                        videoElement = (
                          <div className="aspect-square rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                              title="Video Introduction"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        );
                      } else {
                        const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
                        if (vimeoMatch) {
                          videoElement = (
                            <div className="aspect-square rounded-lg overflow-hidden bg-black">
                              <iframe
                                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                                title="Video Introduction"
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                      }
                    } else if (videoFileUrl) {
                      videoElement = (
                        <div className="aspect-square rounded-lg overflow-hidden bg-black">
                          <video src={videoFileUrl} controls className="w-full h-full" />
                        </div>
                      );
                    }
                    
                    return videoElement ? (
                      <div className="relative">
                        {videoElement}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Video
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Portfolio Images (up to 5, fill remaining slots) */}
                  {providerUser.portfolio_images && providerUser.portfolio_images.slice(0, 5).map((img: string, idx: number) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img 
                        src={img} 
                        alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      const apiError = error as { 
                        response?: { 
                          status?: number; 
                          data?: { 
                            detail?: string;
                            error?: string;
                            code?: string;
                          }; 
                        }; 
                        message?: string;
                      };
                      
                      const errorDetail = apiError.response?.data?.detail || apiError.response?.data?.error || apiError.message;
                      const errorCode = apiError.response?.data?.code;
                      
                      if (apiError.response?.status === 401) {
                        showToast('Please log in to express interest', 'warning');
                        onNavigate('login');
                      } else if (apiError.response?.status === 403) {
                        showToast('Access denied. Please try logging in again.', 'error');
                        onNavigate('login');
                      } else if (apiError.response?.status === 400) {
                        // Handle specific 400 errors
                        if (errorCode === 'ALREADY_EXISTS' || (errorDetail && errorDetail.toLowerCase().includes('already expressed'))) {
                          setHasInterest(true);
                          setHandshakeStatus('pending');
                          showToast('You have already expressed interest', 'info');
                        } else if (errorCode === 'INVALID_STATE' && errorDetail && errorDetail.toLowerCase().includes('own service')) {
                          showToast('Cannot express interest in your own service', 'warning');
                        } else if (errorCode === 'INSUFFICIENT_BALANCE' || (errorDetail && errorDetail.toLowerCase().includes('insufficient'))) {
                          const errorMsg = getErrorMessage(error, 'Insufficient TimeBank balance');
                          showToast(errorMsg, 'error');
                        } else {
                          const errorMsg = getErrorMessage(error, 'Failed to express interest');
                          showToast(errorMsg, 'error');
                        }
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
