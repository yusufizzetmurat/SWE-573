import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Calendar, Users, Monitor, Flag, Tag, MessageSquare, Play, Image as ImageIcon } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Send } from 'lucide-react';
import { serviceAPI, handshakeAPI, Service } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ServiceMap } from './ServiceMap';
import { useToast } from './Toast';
import { getAchievementMeta } from '../lib/achievements';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage, type NavigateData } from '../lib/types';
import { PublicChat } from './PublicChat';
import { CommentSection } from './CommentSection';
import { logger } from '../lib/logger';
import { getVideoEmbedInfo } from '../lib/videoEmbed';

interface ServiceDetailProps {
  onNavigate: (page: string, data?: NavigateData) => void;
  serviceData?: NavigateData & { id?: string; full?: boolean };
  userBalance?: number;
  unreadNotifications?: number;
}

export function ServiceDetail({ onNavigate, serviceData, userBalance = 1, unreadNotifications = 2 }: ServiceDetailProps) {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(() => {
    if (serviceData?.full) {
      return serviceData as unknown as Service;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!serviceData || !serviceData.full);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInterest, setHasInterest] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'inappropriate_content' | 'spam' | 'service_issue' | 'scam' | 'harassment' | 'other'>('inappropriate_content');
  const [hasReportedService, setHasReportedService] = useState(false);

  const getReportedServiceStorageKey = (currentUserId: string, serviceId: string) =>
    `reportedService:${currentUserId}:${serviceId}`;

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

  // Persisted "already reported" state (prevents re-report after refresh)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !service?.id) {
      setHasReportedService(false);
      return;
    }
    try {
      const key = getReportedServiceStorageKey(user.id, service.id);
      setHasReportedService(window.localStorage.getItem(key) === '1');
    } catch {
      // Ignore storage errors (private mode, etc.)
      setHasReportedService(false);
    }
  }, [isAuthenticated, user?.id, service?.id]);

  const handleSubmitReport = async () => {
    if (!service?.id) return;

    if (hasReportedService) {
      showToast('You have already reported this listing. Moderators are reviewing your report.', 'info');
      setShowReportModal(false);
      return;
    }

    setIsReporting(true);
    try {
      await serviceAPI.report(service.id, reportType, '');
      showToast('Report submitted. Thanks for helping keep the community safe.', 'success');
      setHasReportedService(true);
      try {
        if (user?.id) {
          window.localStorage.setItem(getReportedServiceStorageKey(user.id, service.id), '1');
        }
      } catch {
        // Ignore storage errors
      }
      setShowReportModal(false);
      setReportType('inappropriate_content');
    } catch (err: unknown) {
      logger.error('Failed to report service', err instanceof Error ? err : new Error(String(err)), { serviceId: service?.id });

      // If backend says it's already reported, lock UI and show a friendly toast
      const maybeResponse = (err as { response?: { status?: number; data?: { detail?: unknown } } }).response;
      const statusCode = maybeResponse?.status;
      const detail = typeof maybeResponse?.data?.detail === 'string' ? maybeResponse.data.detail : undefined;

      if (statusCode === 400 && detail?.toLowerCase().includes('already reported')) {
        showToast('You have already reported this listing. Moderators are reviewing your report.', 'warning');
        setHasReportedService(true);
        try {
          if (user?.id && service?.id) {
            window.localStorage.setItem(getReportedServiceStorageKey(user.id, service.id), '1');
          }
        } catch {
          // Ignore storage errors
        }
        setShowReportModal(false);
        return;
      }

      const errorMessage = getErrorMessage(err, 'Failed to submit report');
      showToast(errorMessage, 'error');
    } finally {
      setIsReporting(false);
    }
  };

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
  const providerAchievements = Array.isArray(providerUser?.achievements) ? providerUser.achievements : (Array.isArray(providerUser?.badges) ? providerUser.badges : []);
  const primaryProviderAchievement = providerAchievements.length ? getAchievementMeta(providerAchievements[0]) : undefined;
  
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
    <>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
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
                      {service.media.some((m: any) => (m.media_type || 'image') === 'image') && (
                        <>
                          <h3 className="text-gray-900 mb-3">Photos</h3>
                          <div className="grid grid-cols-3 gap-3">
                            {service.media
                              .filter((m: any) => (m.media_type || 'image') === 'image')
                              .map((mediaItem: any) => {
                                let imageUrl = '';
                                if (mediaItem.image) {
                                  imageUrl = mediaItem.image;
                                } else if (mediaItem.file_url) {
                                  imageUrl = mediaItem.file_url;
                                } else if (mediaItem.file) {
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
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}

                      {service.media.some((m: any) => m.media_type === 'video') && (
                        <div className={service.media.some((m: any) => (m.media_type || 'image') === 'image') ? 'mt-6' : ''}>
                          <h3 className="text-gray-900 mb-3">Videos</h3>
                          <div className="space-y-4">
                            {service.media
                              .filter((m: any) => m.media_type === 'video')
                              .map((mediaItem: any) => {
                                const videoUrl = (mediaItem.file_url || mediaItem.file || '').toString();
                                if (!videoUrl) return null;
                                const looksDirect = /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);
                                const embedInfo = getVideoEmbedInfo(videoUrl);
                                return (
                                  <div key={mediaItem.id} className="rounded-lg overflow-hidden border border-gray-200 bg-black/90">
                                    {embedInfo ? (
                                      <div
                                        className="bg-black"
                                        style={{ height: 560, maxHeight: '70vh', minHeight: 360 }}
                                      >
                                        <iframe
                                          src={embedInfo.embedUrl}
                                          title="Service video"
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                    ) : looksDirect ? (
                                      <video
                                        controls
                                        src={videoUrl}
                                        className="w-full"
                                        style={{ height: 560, maxHeight: '70vh', minHeight: 360 }}
                                      />
                                    ) : (
                                      <div className="p-4 bg-white">
                                        <div className="text-sm text-gray-700 mb-2">Video link:</div>
                                        <a
                                          href={videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-amber-700 hover:underline break-all"
                                        >
                                          {videoUrl}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
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
          <div className="space-y-6 lg:col-span-1">
            {/* Provider Card */}
            <div 
              className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
              data-testid="provider-card"
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
                  {typeof service.user === 'object' && service.user !== null && service.user.avatar_url && (
                    <AvatarImage 
                      src={service.user.avatar_url} 
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

              {primaryProviderAchievement && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                    <primaryProviderAchievement.icon className="w-3 h-3" />
                    {primaryProviderAchievement.label}
                  </Badge>
                </div>
              )}

              {providerBio && (
                <p className="text-sm text-gray-700 mb-4">
                  {providerBio}
                </p>
              )}

              {providerAchievements.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {providerAchievements.slice(1, 4).map((achievementId) => {
                    const achievementMeta = getAchievementMeta(achievementId);
                    if (!achievementMeta) return null;
                    const Icon = achievementMeta.icon;
                    return (
                      <span key={achievementId} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">
                        <Icon className="w-3 h-3" />
                        {achievementMeta.label}
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
                      const embedInfo = getVideoEmbedInfo(videoUrl);
                      if (embedInfo) {
                        videoElement = (
                          <div className="aspect-square rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={embedInfo.embedUrl}
                              title="Video Introduction"
                              className="w-full h-full"
                              allow={
                                embedInfo.provider === 'youtube'
                                  ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                                  : 'autoplay; fullscreen; picture-in-picture'
                              }
                              allowFullScreen
                            />
                          </div>
                        );
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
                    data-testid="open-chat"
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
                  data-testid="express-interest"
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
                          // Ensure user can continue to chat even if interest already exists.
                          setTimeout(() => {
                            onNavigate('messages');
                          }, 300);
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
                className={`text-sm flex items-center gap-2 mx-auto transition-colors ${
                  hasReportedService
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:text-red-600'
                }`}
                type="button"
                disabled={hasReportedService}
                onClick={() => {
                  if (!isAuthenticated) {
                    showToast('Please log in to report a listing', 'warning');
                    onNavigate('login');
                    return;
                  }
                  if (hasReportedService) {
                    showToast('You have already reported this listing. Moderators are reviewing your report.', 'info');
                    return;
                  }
                  setShowReportModal(true);
                }}
              >
                <Flag className="w-4 h-4" />
                {hasReportedService ? 'Already Reported' : 'Report this listing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>


    {/* Report Listing Modal */}
    <Dialog
      open={showReportModal}
      onOpenChange={(open) => {
        if (!open) {
          setShowReportModal(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>
              Select a reason. Moderators will review your report.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="inappropriate_content"
                checked={reportType === 'inappropriate_content'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Inappropriate content</p>
                <p className="text-sm text-gray-500">Offensive, harmful, or violates guidelines</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="spam"
                checked={reportType === 'spam'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Spam</p>
                <p className="text-sm text-gray-500">Misleading, fake, or promotional content</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="scam"
                checked={reportType === 'scam'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Scam or fraud</p>
                <p className="text-sm text-gray-500">Attempting to deceive or defraud users</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="harassment"
                checked={reportType === 'harassment'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Harassment</p>
                <p className="text-sm text-gray-500">Abusive, threatening, or bullying behavior</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="service_issue"
                checked={reportType === 'service_issue'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Service issue</p>
                <p className="text-sm text-gray-500">Problem with service quality or description</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="other"
                checked={reportType === 'other'}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <div>
                <p className="font-medium text-gray-900">Other</p>
                <p className="text-sm text-gray-500">Something else not listed above</p>
              </div>
            </label>
          </div>
        </div>

        <div className="shrink-0 p-6 pt-4 border-t bg-white mt-auto">
          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-11"
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={isReporting || hasReportedService}
            >
              {isReporting ? 'Sending…' : (
                <span className="inline-flex items-center gap-2">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit Report
                </span>
              )}
            </Button>
            <Button
              className="w-full h-11"
              variant="outline"
              onClick={() => setShowReportModal(false)}
              disabled={isReporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
