import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Users, BookOpen, Lightbulb, Plus, ArrowRight, 
  Calendar, MessageCircle, Loader2 
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { forumAPI } from '../lib/api';
import type { ForumCategory, ForumCategoryColor } from '../lib/types';
import { useToast } from './Toast';
import { GuidelinesModal } from './GuidelinesModal';

interface ForumCategoriesProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'message-square': MessageSquare,
  'users': Users,
  'book-open': BookOpen,
  'lightbulb': Lightbulb,
  'calendar': Calendar,
  'message-circle': MessageCircle,
};

const colorClasses: Record<ForumCategoryColor, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
  red: 'bg-red-100 text-red-600',
  teal: 'bg-teal-100 text-teal-600',
};

function formatLastActivity(timestamp: string | null): string {
  if (!timestamp) return 'No activity yet';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Active just now';
  if (diffMins < 60) return `Active ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `Active ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `Active ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return `Active on ${date.toLocaleDateString()}`;
}

export function ForumCategories({ 
  onNavigate, 
  userBalance = 0, 
  unreadNotifications = 0, 
  onLogout = () => {}, 
  isAuthenticated = false 
}: ForumCategoriesProps) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await forumAPI.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch forum categories:', err);
      setError('Failed to load forum categories. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Calculate totals from categories
  const totalTopics = categories.reduce((sum, cat) => sum + cat.topic_count, 0);
  const totalPosts = categories.reduce((sum, cat) => sum + cat.post_count, 0);

  const handleCategoryClick = (category: ForumCategory) => {
    onNavigate('forum-category', { categorySlug: category.slug, categoryName: category.name });
  };

  const handleCreateTopic = () => {
    if (!isAuthenticated) {
      showToast('Please log in to create a topic', 'info');
      onNavigate('login');
      return;
    }
    onNavigate('forum-create-topic');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="forum" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 border-b border-orange-600">
        <div className="max-w-[1440px] mx-auto px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-white mb-4">Community Forums</h1>
              <p className="text-amber-50 text-lg mb-6">
                Connect with community members, share ideas, collaborate on projects, 
                and build lasting relationships beyond service exchanges.
              </p>
              <Button 
                size="lg"
                className="bg-white text-orange-600 hover:bg-amber-50"
                onClick={handleCreateTopic}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Topic
              </Button>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl hidden lg:block">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758873268631-fa944fc5cad2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwdGVhbSUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzYyMDUyMDkxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Community collaboration"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-12">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">{totalTopics.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Topics</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">{totalPosts.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">{categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">
              {categories.filter(c => c.last_activity && 
                new Date(c.last_activity).getTime() > Date.now() - 24 * 60 * 60 * 1000
              ).length}
            </div>
            <div className="text-sm text-gray-600">Active Today</div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">Forum Categories</h2>
          <p className="text-gray-600 mb-8">
            Choose a category to browse discussions or start a new conversation
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="ml-3 text-gray-600">Loading categories...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchCategories} variant="outline">
              Try Again
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No forum categories available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || MessageSquare;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="bg-white rounded-xl border border-gray-200 p-8 hover:border-amber-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-6">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      colorClasses[category.color] || colorClasses.blue
                    }`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-900 group-hover:text-orange-600 transition-colors font-semibold">
                          {category.name}
                        </h3>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed line-clamp-2">
                        {category.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>{category.topic_count} topic{category.topic_count !== 1 ? 's' : ''}</span>
                          <span>{category.post_count} post{category.post_count !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatLastActivity(category.last_activity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Community Guidelines CTA */}
        <div className="mt-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                New to the forums?
              </h3>
              <p className="text-amber-100">
                Please read our community guidelines before posting to ensure a 
                respectful and welcoming environment for everyone.
              </p>
            </div>
            <Button 
              className="bg-white text-amber-600 hover:bg-amber-50 flex-shrink-0 shadow-lg"
              onClick={() => setShowGuidelines(true)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read Guidelines
            </Button>
          </div>
        </div>

        {/* Guidelines Modal */}
        <GuidelinesModal
          open={showGuidelines}
          onClose={() => setShowGuidelines(false)}
        />
      </div>
    </div>
  );
}
