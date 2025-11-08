import { Sparkles, Star, Trophy, Heart, Clock, Zap } from 'lucide-react';

export interface BadgeMeta {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  description?: string;
}

export const BADGE_CONFIG: BadgeMeta[] = [
  {
    id: 'newcomer',
    label: 'Newcomer',
    icon: Sparkles,
    color: 'bg-purple-100',
    description: 'Welcome to The Hive!'
  },
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
    description: 'Always on time—earning punctual reputation badges.'
  },
  {
    id: 'super-helper',
    label: 'Super Helper',
    icon: Zap,
    color: 'text-purple-500',
    description: 'Known for going above and beyond when helping others.'
  },
];

export const getBadgeMeta = (id: string | undefined) =>
  BADGE_CONFIG.find((badge) => badge.id === id);
