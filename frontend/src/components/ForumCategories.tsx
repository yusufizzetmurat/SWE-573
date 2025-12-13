import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Users, BookOpen, Lightbulb, Plus, ArrowRight, 
  Calendar, MessageCircle, Loader2, X 
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { forumAPI } from '../lib/api';
import type { ForumCategory, ForumCategoryColor, ForumRecentPost } from '../lib/types';
import { useToast } from './Toast';
import { logger } from '../lib/logger';

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

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);

  const [recentPosts, setRecentPosts] = useState<ForumRecentPost[]>([]);
  const [isLoadingRecentPosts, setIsLoadingRecentPosts] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await forumAPI.getCategories();
      setCategories(data);
    } catch (err) {
      logger.error('Failed to fetch forum categories', err instanceof Error ? err : new Error(String(err)));
      setError('Failed to load forum categories. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchRecentPosts = useCallback(async () => {
    try {
      setIsLoadingRecentPosts(true);
      const data = await forumAPI.getRecentPosts(8);
      setRecentPosts(data.results || []);
    } catch (err) {
      logger.error('Failed to fetch recent forum posts', err instanceof Error ? err : new Error(String(err)));
      // Non-blocking: forum categories page should still work without this.
      setRecentPosts([]);
    } finally {
      setIsLoadingRecentPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentPosts();
  }, [fetchRecentPosts]);

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
        {/* Recent Posts */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900">Recent Posts</h2>
              <p className="text-gray-600">Quick look at the latest activity across the forum</p>
            </div>
            <Button variant="outline" onClick={fetchRecentPosts} disabled={isLoadingRecentPosts}>
              {isLoadingRecentPosts ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>

          {isLoadingRecentPosts ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center text-gray-600">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading recent posts...
              </div>
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
              No recent posts yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {recentPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => onNavigate('forum-topic', { topicId: post.topic, topicTitle: post.topic_title })}
                  className="w-full text-left px-6 py-5 hover:bg-amber-50/50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.author_avatar_url || undefined} />
                      <AvatarFallback>
                        {(post.author_name || 'U')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-gray-900 font-medium truncate">{post.topic_title}</div>
                          <div className="text-sm text-gray-600 truncate">
                            {post.author_name} · {post.category_name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0">{formatTimeAgo(post.created_at)}</div>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 line-clamp-2">{post.body}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
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
        <div className="mt-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white text-xl font-semibold mb-2">New to the forums?</h3>
              <p className="text-amber-50 text-base">
                Please read our community guidelines before posting to ensure a 
                respectful and welcoming environment for everyone.
              </p>
            </div>
            <Button 
              className="bg-white text-amber-600 hover:bg-amber-50 border-2 border-white font-semibold flex-shrink-0 shadow-md hover:shadow-lg transition-all"
              onClick={() => setShowGuidelinesModal(true)}
            >
              Read Guidelines
            </Button>
          </div>
        </div>

        {/* Guidelines Modal */}
        <Dialog open={showGuidelinesModal} onOpenChange={setShowGuidelinesModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-500" />
                Community Guidelines
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Please review these guidelines to help maintain a positive and respectful community environment.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">1. Be Respectful</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Treat all members with kindness and respect</li>
                  <li>No harassment, discrimination, or hate speech</li>
                  <li>Disagree constructively and professionally</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">2. Stay On Topic</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Keep discussions relevant to the forum category</li>
                  <li>Use appropriate categories for your posts</li>
                  <li>Avoid spamming or off-topic content</li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">3. Share Knowledge</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Help others by sharing your expertise</li>
                  <li>Ask questions when you need help</li>
                  <li>Provide constructive feedback</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">4. Follow TimeBank Principles</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Honor your commitments</li>
                  <li>Communicate clearly about schedules</li>
                  <li>Report issues through proper channels</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">5. Privacy & Safety</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Don't share personal information publicly</li>
                  <li>Report suspicious behavior</li>
                  <li>Respect others' privacy</li>
                </ul>
              </div>

              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                <h3 className="font-semibold text-gray-900 mb-2">6. Moderation</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>Admins may remove inappropriate content</li>
                  <li>Repeated violations may result in warnings or bans</li>
                  <li>Appeals can be made through support channels</li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mt-6">
                <p className="text-gray-800 font-medium text-center">
                  Thank you for helping maintain a positive community! 🙏
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <Button 
                onClick={() => setShowGuidelinesModal(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
