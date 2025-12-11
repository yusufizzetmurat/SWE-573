import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Award, Star, Zap, Heart, Clock, Users, Target, CheckCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { userAPI, User, AchievementProgress } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ACHIEVEMENT_CONFIG, getAchievementMeta, NEWCOMER_TAG } from '../lib/achievements';
import { useToast } from './Toast';
import { logger } from '../lib/logger';

interface AchievementViewProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

export function AchievementView({ 
  onNavigate, 
  userBalance = 0, 
  unreadNotifications = 0, 
  onLogout = () => {} 
}: AchievementViewProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [achievements, setAchievements] = useState<Record<string, AchievementProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setIsLoading(true);
        const data = await userAPI.getAchievementProgress(user.id);
        setAchievements(data);
      } catch (error) {
        logger.error('Failed to fetch achievements', error instanceof Error ? error : new Error(String(error)), { userId: user.id });
        showToast('Failed to load achievements. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, [isAuthenticated, user]);

  const handleSelectFeatured = async (achievementId: string) => {
    if (!user) return;
    
    try {
      await userAPI.updateMe({ featured_achievement_id: achievementId });
      setSelectedAchievement(achievementId);
      showToast('Featured achievement updated!', 'success');
    } catch (error) {
      showToast('Failed to update featured achievement', 'error');
    }
  };

  const earnedAchievements = Object.entries(achievements).filter(([_, progress]) => progress.earned);
  const unearnedAchievements = Object.entries(achievements).filter(([_, progress]) => !progress.earned);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="profile" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
      />

      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-gray-600">
            Track your progress and unlock achievements as you engage with the community
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading achievements...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Earned Achievements */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Earned Achievements ({earnedAchievements.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {earnedAchievements.map(([id, progress]) => {
                  if (!progress.achievement) {
                    return null; // Skip if achievement data is missing
                  }
                  const achievementMeta = getAchievementMeta(id);
                  const Icon = achievementMeta?.icon || Trophy;
                  const isFeatured = user?.featured_achievement_id === id;
                  
                  return (
                    <div
                      key={id}
                      className={`bg-white rounded-xl border-2 p-6 ${
                        isFeatured ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{progress.achievement.name}</h3>
                            <p className="text-xs text-amber-600 font-medium">
                              +{progress.achievement.karma_points} karma
                            </p>
                          </div>
                        </div>
                        {isFeatured && (
                          <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{progress.achievement.description}</p>
                      {!isFeatured && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectFeatured(id)}
                          className="w-full"
                        >
                          Set as Featured
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unearned Achievements */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-400" />
                Available Achievements ({unearnedAchievements.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unearnedAchievements.map(([id, progress]) => {
                  if (!progress.achievement) {
                    return null; // Skip if achievement data is missing
                  }
                  const achievementMeta = getAchievementMeta(id);
                  const Icon = achievementMeta?.icon || Trophy;
                  const isHidden = progress.achievement.is_hidden && !progress.earned;
                  
                  return (
                    <div
                      key={id}
                      className="bg-white rounded-xl border border-gray-200 p-6 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            {isHidden ? (
                              <Lock className="w-6 h-6 text-gray-400" />
                            ) : (
                              <Icon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {isHidden ? '???' : progress.achievement.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {isHidden ? 'Hidden Achievement' : `+${progress.achievement.karma_points} karma`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        {isHidden ? 'Complete this achievement to reveal its details' : progress.achievement.description}
                      </p>
                      {!isHidden && progress.current !== null && progress.threshold !== null && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Progress</span>
                            <span>{progress.current} / {progress.threshold}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all"
                              style={{ width: `${progress.progress_percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 text-center">
                            {progress.progress_percent}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

