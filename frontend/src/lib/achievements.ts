import { Sparkles, Star, Trophy, Heart, Clock, Zap } from 'lucide-react';

export interface AchievementMeta {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  description?: string;
}

export const ACHIEVEMENT_CONFIG: AchievementMeta[] = [
  {
    id: 'first-service',
    label: 'First Service',
    icon: Star,
    color: 'text-amber-500',
    description: 'Completed your first service on the platform.'
  },
  {
    id: '10-offers',
    label: '10+ Offers',
    icon: Trophy,
    color: 'text-green-500',
    description: 'Shared more than 10 offers with the community.'
  },
  {
    id: 'kindness-hero',
    label: 'Kindness Hero',
    icon: Heart,
    color: 'text-pink-500',
    description: 'Received consistent kindness feedback from neighbors.'
  },
  {
    id: 'punctual-pro',
    label: 'Punctual Pro',
    icon: Clock,
    color: 'text-blue-500',
    description: 'Always on time—earning punctual reputation achievements.'
  },
  {
    id: 'super-helper',
    label: 'Super Helper',
    icon: Zap,
    color: 'text-purple-500',
    description: 'Known for going above and beyond when helping others.'
  },
  {
    id: 'seniority',
    label: 'Seniority',
    icon: Trophy,
    color: 'text-indigo-500',
    description: 'Completed 5+ services as consumer or provider.'
  },
  {
    id: 'registered-3-months',
    label: 'Registered for 3 Months',
    icon: Star,
    color: 'text-blue-400',
    description: 'Active member for 3 months.'
  },
  {
    id: 'registered-6-months',
    label: 'Registered for 6 Months',
    icon: Star,
    color: 'text-blue-500',
    description: 'Active member for 6 months.'
  },
  {
    id: 'registered-9-months',
    label: 'Registered for 9 Months',
    icon: Star,
    color: 'text-blue-600',
    description: 'Active member for 9 months.'
  },
  {
    id: 'registered-1-year',
    label: 'Registered for 1 Year',
    icon: Trophy,
    color: 'text-amber-500',
    description: 'Active member for 1 year.'
  },
  {
    id: 'registered-2-years',
    label: 'Registered for 2 Years',
    icon: Trophy,
    color: 'text-amber-600',
    description: 'Active member for 2 years.'
  },
  {
    id: 'registered-3-years',
    label: 'Registered for 3+ Years',
    icon: Trophy,
    color: 'text-amber-700',
    description: 'Active member for 3+ years.'
  },
];

export const getAchievementMeta = (id: string | undefined) =>
  ACHIEVEMENT_CONFIG.find((achievement) => achievement.id === id);

// Newcomer is a special tag, not an achievement
export const NEWCOMER_TAG = {
  id: 'newcomer',
  label: 'Newcomer',
  icon: Sparkles,
  color: 'bg-purple-100',
  description: 'Welcome to The Hive!'
};

// Deprecated: use achievements.ts instead
export { ACHIEVEMENT_CONFIG as BADGE_CONFIG, getAchievementMeta as getBadgeMeta };
export type { AchievementMeta as BadgeMeta };
