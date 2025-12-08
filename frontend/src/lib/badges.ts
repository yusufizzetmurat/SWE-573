import { 
  Sparkles, Star, Trophy, Heart, Clock, Zap, MessageSquare, 
  MessageCircle, Gift, Medal, Award, Shield, ThumbsUp 
} from 'lucide-react';

export interface BadgeMeta {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  description?: string;
  threshold?: number;
}

export const BADGE_CONFIG: BadgeMeta[] = [
  // Special/welcome badge
  {
    id: 'newcomer',
    label: 'Newcomer',
    icon: Sparkles,
    color: 'text-purple-500',
    description: 'Welcome to The Hive!'
  },
  
  // === Original Badges ===
  {
    id: 'first-service',
    label: 'First Service',
    icon: Star,
    color: 'text-amber-500',
    description: 'Completed the first timebank exchange.',
    threshold: 1
  },
  {
    id: '10-offers',
    label: '10+ Offers',
    icon: Trophy,
    color: 'text-green-500',
    description: 'Shared at least ten offers with the community.',
    threshold: 10
  },
  {
    id: 'kindness-hero',
    label: 'Kindness Hero',
    icon: Heart,
    color: 'text-pink-500',
    description: 'Received consistent kindness feedback from neighbors.',
    threshold: 20
  },
  {
    id: 'super-helper',
    label: 'Super Helper',
    icon: Zap,
    color: 'text-purple-500',
    description: 'Recognized for above-and-beyond support.',
    threshold: 15
  },
  {
    id: 'punctual-pro',
    label: 'Punctual Pro',
    icon: Clock,
    color: 'text-blue-500',
    description: 'Always on time for confirmed handshakes.',
    threshold: 15
  },
  
  // === Community Engagement Badges ===
  {
    id: 'community-voice',
    label: 'Community Voice',
    icon: MessageSquare,
    color: 'text-teal-500',
    description: 'Active contributor with 10+ comments in the community.',
    threshold: 10
  },
  {
    id: 'conversation-starter',
    label: 'Conversation Starter',
    icon: MessageCircle,
    color: 'text-cyan-500',
    description: 'Your services spark discussion with 5+ comments received.',
    threshold: 5
  },
  
  // === Time Giving Milestones ===
  {
    id: 'time-giver-bronze',
    label: 'Time Giver (Bronze)',
    icon: Gift,
    color: 'text-orange-500',
    description: 'Generously shared 10+ hours with the community.',
    threshold: 10
  },
  {
    id: 'time-giver-silver',
    label: 'Time Giver (Silver)',
    icon: Gift,
    color: 'text-gray-400',
    description: 'Generously shared 50+ hours with the community.',
    threshold: 50
  },
  {
    id: 'time-giver-gold',
    label: 'Time Giver (Gold)',
    icon: Gift,
    color: 'text-yellow-500',
    description: 'Generously shared 100+ hours with the community.',
    threshold: 100
  },
  
  // === Trust and Reputation Badges ===
  {
    id: 'trusted-member',
    label: 'Trusted Member',
    icon: Shield,
    color: 'text-emerald-500',
    description: 'Reliable community member with 25+ completed exchanges.',
    threshold: 25
  },
  {
    id: 'perfect-record',
    label: 'Perfect Record',
    icon: Medal,
    color: 'text-indigo-500',
    description: 'Maintained excellence with 10+ completed handshakes and zero negative feedback.',
    threshold: 10
  },
  {
    id: 'top-rated',
    label: 'Top Rated',
    icon: ThumbsUp,
    color: 'text-rose-500',
    description: 'Exceptional reputation with 50+ positive feedback points.',
    threshold: 50
  },
];

export const getBadgeMeta = (id: string | undefined) =>
  BADGE_CONFIG.find((badge) => badge.id === id);

// Get all badges a user has earned
export const getEarnedBadges = (badgeIds: string[]): BadgeMeta[] => 
  BADGE_CONFIG.filter(badge => badgeIds.includes(badge.id));

// Get badges sorted by rarity (higher threshold = rarer)
export const getBadgesByRarity = (): BadgeMeta[] => 
  [...BADGE_CONFIG].sort((a, b) => (b.threshold || 0) - (a.threshold || 0));
