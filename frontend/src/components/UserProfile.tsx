import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, AlertTriangle, Calendar, CheckCircle, Heart, Sparkles, Award, Trophy, Star, Zap, Edit, MapPin, CalendarDays, RotateCcw, Play, Image as ImageIcon } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { useAuth } from '../lib/auth-context';
import { serviceAPI, handshakeAPI, userAPI, Service, Handshake, Comment } from '../lib/api';
import { ProfileEditModal } from './ProfileEditModal';
import { formatTimebank } from '../lib/utils';
import { useToast } from './Toast';
import { logger } from '../lib/logger';
import { ACHIEVEMENT_CONFIG, getAchievementMeta, NEWCOMER_TAG } from '../lib/achievements';

interface UserProfileProps {
  onNavigate: (page: string, data?: any) => void;
  userBalance?: number;
  karma?: number;
  positiveReps?: {
    punctual: number;
    helpful: number;
    kind: number;
  };
  achievements?: string[];
  badges?: string[];  // Deprecated: use achievements instead
  isOwnProfile?: boolean;
  userName?: string;
  userBio?: string;
  userLocation?: string;
  memberSince?: string;
  onLogout?: () => void;
}

const mockActiveOffers = [
  {
    id: 1,
    title: 'Guitar Lessons for Beginners',
    type: 'offer',
    duration: 1,
    participants: '1/3',
    nextSession: 'Saturday, Nov 2, 14:00',
    status: 'active',
  },
  {
    id: 2,
    title: 'Urban Gardening Workshop',
    type: 'offer',
    duration: 2,
    participants: '5/8',
    nextSession: 'Nov 15, 10:00',
    status: 'scheduled',
  },
];

const mockActiveNeeds = [
  {
    id: 3,
    title: 'German Language Practice',
    type: 'need',
    duration: 2,
    helpers: '0/1',
    deadline: 'Flexible',
    status: 'open',
  },
];

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

const mockCompletedHistory = [
  {
    id: 4,
    title: 'Manti Cooking Lesson',
    type: 'received',
    duration: 3,
    partner: 'Sarah Chen',
    completedDate: 'Oct 29, 2025',
  },
  {
    id: 5,
    title: 'Moving Help',
    type: 'provided',
    duration: 4,
    partner: 'Tom Miller',
    completedDate: 'Oct 25, 2025',
  },
  {
    id: 6,
    title: 'Web Design Consultation',
    type: 'provided',
    duration: 2,
    partner: 'Lisa Anderson',
    completedDate: 'Oct 20, 2025',
  },
];

export function UserProfile({ 
  onNavigate, 
  userBalance = 11,
  karma = 142,
  positiveReps = { punctual: 14, helpful: 11, kind: 19 },
  achievements = ['first-service', '10-offers', 'kindness-hero'],
  isOwnProfile = true,
  userName = 'Elif',
  userBio = 'Freelance designer, manti expert, and 3D printing novice. I love teaching creative skills and learning new things from my amazing neighbors!',
  userLocation,
  memberSince = 'Oct 2024',
  onLogout
}: UserProfileProps) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('offers');
  const [activeOffers, setActiveOffers] = useState<Service[]>([]);
  const [activeNeeds, setActiveNeeds] = useState<Service[]>([]);
  const [completedHandshakes, setCompletedHandshakes] = useState<Handshake[]>([]);
  const [verifiedReviews, setVerifiedReviews] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOwnProfile || !user) {
      setIsLoading(false);
      return;
    }
    
    let isMounted = true;
    let abortController = new AbortController();
    
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Use services from user object if available (from cached profile)
        if (user.services && Array.isArray(user.services) && user.services.length > 0) {
          const userServices = user.services;
          const offers = userServices.filter((s: Service) => s.type === 'Offer' && s.status === 'Active');
          const needs = userServices.filter((s: Service) => s.type === 'Need' && s.status === 'Active');
          
          if (isMounted && !abortController.signal.aborted) {
            setActiveOffers(offers);
            setActiveNeeds(needs);
          }
        } else {
          // Fallback: Fetch all services and filter (slower)
          const allServices = await serviceAPI.list({}, abortController.signal);
          if (!isMounted || abortController.signal.aborted) {
            setIsLoading(false);
            return;
          }
          
          const userServices = allServices.filter(s => 
            typeof s.user === 'object' ? s.user?.id === user.id : s.user === user.id
          );
          
          const offers = userServices.filter(s => s.type === 'Offer' && s.status === 'Active');
          const needs = userServices.filter(s => s.type === 'Need' && s.status === 'Active');
          
          if (isMounted && !abortController.signal.aborted) {
            setActiveOffers(offers);
            setActiveNeeds(needs);
          }
        }
        
        // Fetch completed handshakes
        if (!isMounted || abortController.signal.aborted) {
          setIsLoading(false);
          return;
        }
        
        const handshakes = await handshakeAPI.list(abortController.signal);
        if (!isMounted || abortController.signal.aborted) {
          setIsLoading(false);
          return;
        }
        
        const completed = handshakes.filter(h => h.status === 'completed');
        if (isMounted && !abortController.signal.aborted) {
          setCompletedHandshakes(completed);
        }
        
        // Fetch verified reviews
        if (user && isMounted && !abortController.signal.aborted) {
          try {
            const reviews = await userAPI.getVerifiedReviews(user.id, abortController.signal);
            if (isMounted && !abortController.signal.aborted) {
              setVerifiedReviews(reviews);
            }
          } catch (error) {
            logger.error('Failed to fetch verified reviews', error instanceof Error ? error : new Error(String(error)));
          }
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
        if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          setIsLoading(false);
          return;
        }
        
        logger.error('Failed to fetch user data', error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user, isOwnProfile]);

  // Show balance warning if over 10 hours
  const actualBalance = user?.timebank_balance || userBalance;
  const showBalanceWarning = actualBalance > 10;

  // Get earned achievements - use user achievements if available
  // Newcomer is a special tag, not an achievement
  const userAchievements = user?.achievements || user?.badges || achievements;
  const isNewcomer = user?.date_joined ? 
    (new Date().getTime() - new Date(user.date_joined).getTime()) < (30 * 24 * 60 * 60 * 1000) : false;
  const achievementById = new Map(ACHIEVEMENT_CONFIG.map((a) => [a.id, a]));
  const earnedAchievements = (Array.isArray(userAchievements) ? userAchievements : [])
    .map((id) => achievementById.get(id))
    .filter(Boolean);

  const latestAchievement = earnedAchievements[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="profile" 
        userBalance={actualBalance}
        unreadNotifications={0}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={true}
      />

      {/* Profile Banner */}
      <div className="relative w-full h-64 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600">
        {user?.banner_url ? (
          <img 
            src={user.banner_url} 
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            src="https://images.unsplash.com/photo-1689786430584-24025fa23b5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHdhcm0lMjBvcmFuZ2UlMjBncmFkaWVudHxlbnwxfHx8fDE3NjIxOTkzMDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
            alt="Profile banner"
            className="w-full h-full object-cover opacity-60"
          />
        )}
        
        {/* Edit Banner Button (only for own profile) */}
        {isOwnProfile && (
          <Button 
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 bg-white/90 hover:bg-white z-10"
            onClick={() => setShowEditModal(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Banner
          </Button>
        )}
      </div>

      {/* Profile Header (overlapping banner) */}
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="relative -mt-20 mb-8">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-6">
              {/* Large Avatar */}
              <div className="relative">
                <Avatar className="w-40 h-40 border-4 border-white shadow-xl">
                  <AvatarImage src={user?.avatar_url || undefined} alt={userName} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-5xl">
                    {userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Button 
                    size="sm" 
                    className="absolute bottom-2 right-2 w-8 h-8 p-0 rounded-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 z-10"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Name and Karma */}
              <div className="pb-4">
                <h1 className="text-gray-900 mb-2">
                  {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : userName}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Karma: {user ? user.karma_score : karma}</span>
                  </div>
                  {userLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{userLocation}</span>
                    </div>
                  )}
                  {memberSince && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>Member since {memberSince}</span>
                    </div>
                  )}
                  {latestAchievement && (
                    <Badge className="bg-white/80 text-amber-600 flex items-center gap-1">
                      {(() => {
                        const Icon = latestAchievement.icon;
                        return <Icon className="w-3 h-3" />;
                      })()}
                      {latestAchievement.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile Button and Achievements Link (only for own profile) */}
            {isOwnProfile && (
              <div className="pb-4 flex gap-3">
                <Button 
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setShowEditModal(true)}
                  data-testid="profile-edit-open"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => onNavigate('achievements')}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  View Achievements
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Balance Warning Banner - Full Width */}
        {showBalanceWarning && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-900">TimeBank Balance Exceeded!</AlertTitle>
            <AlertDescription className="text-red-800">
              Your balance is {formatTimebank(actualBalance)} hours. Please take a service to continue offering 
              (maximum balance allowed: 10 hours).
            </AlertDescription>
          </Alert>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-[400px_1fr] gap-8 pb-12">
          {/* LEFT COLUMN - Bio & Reputation */}
          <div className="space-y-6">
            {/* Bio Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-3">Bio</h3>
              <p className="text-gray-700 leading-relaxed">{user?.bio || userBio || 'No bio available'}</p>
            </div>

            {/* Video Intro */}
            {(user?.video_intro_url || user?.video_intro_file_url) && (() => {
              const videoUrl = user.video_intro_url;
              const videoFileUrl = user.video_intro_file_url;
              
              let videoElement = null;
              if (videoUrl) {
                const youtubeId = getYouTubeVideoId(videoUrl);
                if (youtubeId) {
                  videoElement = (
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
                } else {
                  const vimeoId = getVimeoVideoId(videoUrl);
                  if (vimeoId) {
                    videoElement = (
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
                }
              } else if (videoFileUrl) {
                videoElement = (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <video src={videoFileUrl} controls className="w-full h-full" />
                  </div>
                );
              }
              
              return videoElement ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Video Introduction
                  </h3>
                  {videoElement}
                </div>
              ) : null;
            })()}

            {/* Portfolio Images */}
            {user?.portfolio_images && user.portfolio_images.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {user.portfolio_images.map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200"
                    >
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

            {/* Positive Reps */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Reps</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-gray-900">Punctual</span>
                  </div>
                  <span className="text-gray-900">{user?.punctual_count ?? positiveReps.punctual}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-gray-900">Helpful</span>
                  </div>
                  <span className="text-gray-900">{user?.helpful_count ?? positiveReps.helpful}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="text-gray-900">Kind</span>
                  </div>
                  <span className="text-gray-900">{user?.kind_count ?? positiveReps.kind}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Achievements</h3>
              <div className="grid grid-cols-3 gap-3">
                {earnedAchievements.slice(0, 3).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div 
                      key={achievement.id}
                      className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 flex flex-col items-center justify-center border-2 border-amber-200"
                    >
                      <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 ${achievement.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-xs text-center text-gray-700 leading-tight">{achievement.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verified Reviews */}
            {verifiedReviews.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Verified Reviews
                </h3>
                <div className="space-y-4">
                  {verifiedReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-gray-900">{review.service_title}</span>
                            <span className="text-gray-400">-</span>
                            <button
                              onClick={() => onNavigate('public-profile', { userId: review.user_id })}
                              className="font-medium text-gray-900 hover:text-amber-600 transition-colors"
                            >
                              {review.user_name}
                            </button>
                            {review.user_karma_score !== undefined && review.user_karma_score > 0 && (
                              <span className="text-xs text-amber-600 font-medium">
                                {review.user_karma_score} karma
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{review.body}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1 ml-2 shrink-0">
                          <CheckCircle className="w-3 h-3" />
                          Verified · {formatTimebank(review.handshake_hours || 0)}hr
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                  {verifiedReviews.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{verifiedReviews.length - 5} more verified reviews
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Activity & Balance */}
          <div className="space-y-6">
            {/* TimeBank Balance Card */}
            <div className={`relative rounded-xl border p-8 ${ 
              showBalanceWarning 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600'
            }`}>
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  className={`absolute top-4 right-4 ${showBalanceWarning ? 'text-red-800 hover:bg-red-100' : 'text-white hover:bg-white/20'}`}
                  onClick={() => onNavigate('transaction-history')}
                >
                  View History
                </Button>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${ 
                    showBalanceWarning ? 'bg-red-200' : 'bg-white/20'
                  }`}>
                    <Clock className={`w-8 h-8 ${showBalanceWarning ? 'text-red-600' : 'text-white'}`} />
                  </div>
                  <div>
                    <p className={`text-sm ${showBalanceWarning ? 'text-red-700' : 'text-amber-100'}`}>
                      TimeBank Balance
                    </p>
                    <p className={`text-5xl ${showBalanceWarning ? 'text-red-900' : 'text-white'}`}>
                      {actualBalance}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${showBalanceWarning ? 'text-red-800' : 'text-white/90'}`}>
                  <p className="text-sm">
                    {showBalanceWarning 
                      ? 'Balance exceeded' 
                      : 'Hours available to spend'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Tabbed Interface - Active Offers, Wants, History */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="offers">Active Offers</TabsTrigger>
                  <TabsTrigger value="needs">Active Wants</TabsTrigger>
                  <TabsTrigger value="history">Completed History</TabsTrigger>
                </TabsList>

                {/* Active Offers */}
                <TabsContent value="offers" className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-600">Loading...</div>
                  ) : activeOffers.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No active offers</div>
                  ) : (
                    activeOffers.map((service) => (
                      <div 
                        key={service.id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-gray-900">{service.title}</h3>
                              <Badge className="bg-green-100 text-green-700">
                                {service.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTimebank(service.duration)}h
                              </span>
                              <span>Max {service.max_participants} participants</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onNavigate('service-detail', service)}
                          >
                            View
                          </Button>
                        </div>
                        {service.schedule_details && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                            <Calendar className="w-4 h-4" />
                            <span>{service.schedule_details}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Active Wants */}
                <TabsContent value="needs" className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-600">Loading...</div>
                  ) : activeNeeds.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No active wants</div>
                  ) : (
                    activeNeeds.map((service) => (
                      <div 
                        key={service.id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-gray-900">{service.title}</h3>
                              <Badge className="bg-blue-100 text-blue-700">
                                {service.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTimebank(service.duration)}h
                              </span>
                              <span>Max {service.max_participants} helpers</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onNavigate('service-detail', service)}
                          >
                            View
                          </Button>
                        </div>
                        {service.schedule_details && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                            <Calendar className="w-4 h-4" />
                            <span>{service.schedule_details}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Completed History */}
                <TabsContent value="history" className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-600">Loading...</div>
                  ) : completedHandshakes.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No completed services yet</div>
                  ) : (
                    completedHandshakes.map((handshake) => {
                      const isProvider = user && activeOffers.some(s => s.id === handshake.service);
                      const partnerName = isProvider ? handshake.requester_name : handshake.provider_name;
                      
                      const handleRepost = async () => {
                        try {
                          const serviceId = typeof handshake.service === 'string' ? handshake.service : (handshake.service as any)?.id;
                          if (!serviceId) {
                            showToast('Unable to repost: service information not available', 'error');
                            return;
                          }
                          
                          const service = await serviceAPI.get(serviceId);
                          const serviceData = {
                            id: service.id,
                            title: service.title,
                            description: service.description,
                            type: service.type,
                            duration: service.duration,
                            location_type: service.location_type,
                            location_area: service.location_area,
                            max_participants: service.max_participants,
                            schedule_type: service.schedule_type,
                            schedule_details: service.schedule_details,
                            tags: service.tags || [],
                          };
                          
                          if (service.type === 'Offer') {
                            onNavigate('post-offer', serviceData);
                          } else {
                            onNavigate('post-need', serviceData);
                          }
                        } catch (error) {
                          logger.error('Failed to repost service', error instanceof Error ? error : new Error(String(error)), { serviceId: service.id });
                          showToast('Failed to repost service. Please try again.', 'error');
                        }
                      };
                      
                      return (
                        <div 
                          key={handshake.id}
                          className="border border-gray-200 rounded-lg p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-gray-900">{handshake.service_title}</h3>
                                <Badge className={
                                  isProvider 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }>
                                  {isProvider ? 'Provided' : 'Received'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {handshake.provisioned_hours}h
                                </span>
                                <span>with {partnerName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">Completed</span>
                              </div>
                              {isProvider && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleRepost}
                                  className="flex items-center gap-1"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Repost
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(handshake.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onUpdate={() => {
          refreshUser();
          setShowEditModal(false);
        }}
      />
    </div>
  );
}
