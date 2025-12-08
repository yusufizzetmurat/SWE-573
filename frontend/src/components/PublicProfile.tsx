import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Award, MapPin, CalendarDays, Play, Image as ImageIcon, History, ExternalLink } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { userAPI, serviceAPI, User, Service, UserHistoryItem } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { formatTimebank } from '../lib/utils';
import { BADGE_CONFIG, getBadgeMeta } from '../lib/badges';

interface PublicProfileProps {
  onNavigate: (page: string, data?: unknown) => void;
  userId: string;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

// Helper to extract YouTube video ID
function getYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper to extract Vimeo video ID
function getVimeoVideoId(url: string): string | null {
  const regex = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export function PublicProfile({ 
  onNavigate, 
  userId,
  userBalance = 0,
  unreadNotifications = 0,
  onLogout
}: PublicProfileProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isOwnProfile = currentUser && currentUser.id === userId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user profile
        const user = await userAPI.getUser(userId);
        setProfileUser(user);

        // Fetch user's active services
        if (user.services) {
          setUserServices(user.services.filter(s => s.status === 'Active'));
        } else {
          const allServices = await serviceAPI.list();
          const filtered = allServices.filter(s => {
            const serviceUserId = typeof s.user === 'object' ? s.user?.id : s.user;
            return serviceUserId === userId && s.status === 'Active';
          });
          setUserServices(filtered);
        }

        // Fetch history only if visible (user enabled it or viewing own profile)
        const isOwn = currentUser && currentUser.id === userId;
        if (user.show_history || isOwn) {
          const historyData = await userAPI.getHistory(userId);
          setHistory(historyData);
        }

      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          activeLink="browse" 
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onNavigate={onNavigate}
          onLogout={onLogout}
          isAuthenticated={isAuthenticated}
        />
        <div className="max-w-[1440px] mx-auto px-8 py-8">
          <div className="text-center py-12 text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          activeLink="browse" 
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onNavigate={onNavigate}
          onLogout={onLogout}
          isAuthenticated={isAuthenticated}
        />
        <div className="max-w-[1440px] mx-auto px-8 py-8">
          <div className="text-center py-12 text-red-600">{error || 'Profile not found'}</div>
          <Button onClick={() => onNavigate('dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const userName = `${profileUser.first_name} ${profileUser.last_name}`.trim() || profileUser.email;
  const memberSince = profileUser.date_joined 
    ? new Date(profileUser.date_joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Unknown';

  // Get earned badges
  const userBadges = profileUser.badges || [];
  const earnedBadges = BADGE_CONFIG.filter(badge => userBadges.includes(badge.id));
  const featuredBadge = earnedBadges[0];

  // Video intro rendering
  const renderVideoIntro = () => {
    const videoUrl = profileUser.video_intro_url;
    const videoFileUrl = profileUser.video_intro_file_url;

    if (!videoUrl && !videoFileUrl) return null;

    // Check for YouTube
    if (videoUrl) {
      const youtubeId = getYouTubeVideoId(videoUrl);
      if (youtubeId) {
        return (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Video Introduction"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      // Check for Vimeo
      const vimeoId = getVimeoVideoId(videoUrl);
      if (vimeoId) {
        return (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              title="Video Introduction"
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      // External URL - show link
      return (
        <a 
          href={videoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Play className="w-5 h-5 text-amber-600" />
          <span className="text-gray-700">Watch Video Introduction</span>
          <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
        </a>
      );
    }

    // Uploaded file
    if (videoFileUrl) {
      return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <video
            src={videoFileUrl}
            controls
            className="w-full h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="browse" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
      />

      {/* Profile Banner */}
      <div className="relative w-full h-48 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600">
        {profileUser.banner_url ? (
          <img 
            src={profileUser.banner_url} 
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600" />
        )}
      </div>

      <div className="max-w-[1440px] mx-auto px-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => onNavigate('dashboard')}
          className="mt-4 mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              {profileUser.avatar_url && (
                <img 
                  src={profileUser.avatar_url} 
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-4xl">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Name and Info */}
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{userName}</h1>
              <div className="flex items-center gap-4 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Karma: {profileUser.karma_score}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>Member since {memberSince}</span>
                </div>
                {featuredBadge && (
                  <Badge className="bg-white/80 text-amber-600 flex items-center gap-1">
                    <featuredBadge.icon className="w-3 h-3" />
                    {featuredBadge.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 pb-12">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Bio Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed">
                {profileUser.bio || 'No bio available'}
              </p>
            </div>

            {/* Video Intro */}
            {(profileUser.video_intro_url || profileUser.video_intro_file_url) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Video Introduction
                </h3>
                {renderVideoIntro()}
              </div>
            )}

            {/* Portfolio Images */}
            {profileUser.portfolio_images && profileUser.portfolio_images.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {profileUser.portfolio_images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition-colors"
                    >
                      <img 
                        src={img} 
                        alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reps */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Reputation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-900 text-sm">Punctual</span>
                  </div>
                  <span className="font-medium text-gray-900">{profileUser.punctual_count || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Award className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-900 text-sm">Helpful</span>
                  </div>
                  <span className="font-medium text-gray-900">{profileUser.helpful_count || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                      <Award className="w-4 h-4 text-pink-600" />
                    </div>
                    <span className="text-gray-900 text-sm">Kind</span>
                  </div>
                  <span className="font-medium text-gray-900">{profileUser.kind_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            {earnedBadges.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Badges</h3>
                <div className="grid grid-cols-3 gap-3">
                  {earnedBadges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div 
                        key={badge.id}
                        className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-2 flex flex-col items-center justify-center border-2 border-amber-200"
                      >
                        <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center mb-1 ${badge.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-center text-gray-700 leading-tight">{badge.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Active Services */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Active Services</h3>
              {userServices.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No active services</p>
              ) : (
                <div className="space-y-4">
                  {userServices.map((service) => (
                    <div 
                      key={service.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-colors cursor-pointer"
                      onClick={() => onNavigate('service-detail', { id: service.id })}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{service.title}</h4>
                            <Badge className={
                              service.type === 'Offer' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }>
                              {service.type === 'Need' ? 'Want' : service.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimebank(service.duration)}h
                            </span>
                            <span>{service.location_type}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction History */}
            {(profileUser.show_history || isOwnProfile) && history.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Completed Exchanges
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 10).map((item) => (
                    <div 
                      key={`${item.partner_id}-${item.completed_date}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Avatar className="w-10 h-10">
                        {item.partner_avatar_url && (
                          <img src={item.partner_avatar_url} alt={item.partner_name} className="w-full h-full object-cover" />
                        )}
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                          {item.partner_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.service_title}</p>
                        <p className="text-xs text-gray-600">
                          {item.was_provider ? 'Provided to' : 'Received from'} {item.partner_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${item.was_provider ? 'text-green-600' : 'text-blue-600'}`}>
                          {item.was_provider ? '+' : ''}{item.duration}h
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.completed_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Portfolio" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
