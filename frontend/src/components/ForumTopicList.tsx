import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Plus, MessageSquare, Eye, Pin, Lock, 
  Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { forumAPI } from '../lib/api';
import type { ForumTopic, ForumCategory } from '../lib/types';
import { useToast } from './Toast';
import { logger } from '../lib/logger';
import { useAuth } from '../lib/auth-context';

interface ForumTopicListProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  categorySlug: string;
  categoryName?: string;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
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

export function ForumTopicList({ 
  onNavigate, 
  categorySlug,
  categoryName = 'Forum',
  userBalance = 0, 
  unreadNotifications = 0, 
  onLogout = () => {}
}: ForumTopicListProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch category info and topics in parallel
      const [categoryData, topicsData] = await Promise.all([
        forumAPI.getCategory(categorySlug),
        forumAPI.getTopics(categorySlug, page)
      ]);
      
      setCategory(categoryData);
      setTopics(topicsData.results);
      setTotalCount(topicsData.count);
      setTotalPages(Math.ceil(topicsData.count / 20)); // Assuming 20 per page
      setCurrentPage(page);
    } catch (err) {
      logger.error('Failed to fetch forum topics', err instanceof Error ? err : new Error(String(err)), { categorySlug });
      setError('Failed to load topics. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleTopicClick = (topic: ForumTopic) => {
    onNavigate('forum-topic', { topicId: topic.id, topicTitle: topic.title });
  };

  const handleCreateTopic = () => {
    if (!isAuthenticated) {
      showToast('Please log in to create a topic', 'info');
      onNavigate('login');
      return;
    }
    onNavigate('forum-create-topic', { categorySlug, categoryName: category?.name });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchData(newPage);
      window.scrollTo(0, 0);
    }
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

      <div className="max-w-[1200px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onNavigate('forum')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {category?.name || categoryName}
              </h1>
              {category?.description && (
                <p className="text-gray-600 mt-1">{category.description}</p>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleCreateTopic}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Topic
          </Button>
        </div>

        {/* Topics List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="ml-3 text-gray-600">Loading topics...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchData(currentPage)} variant="outline">
              Try Again
            </Button>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No topics yet</h3>
            <p className="text-gray-600 mb-6">Be the first to start a discussion in this category!</p>
            <Button onClick={handleCreateTopic} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Topic
            </Button>
          </div>
        ) : (
          <>
            {/* Topic count */}
            <div className="mb-4 text-sm text-gray-600">
              {totalCount} topic{totalCount !== 1 ? 's' : ''} in this category
            </div>

            {/* Topics */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {topic.author_avatar_url && (
                        <AvatarImage src={topic.author_avatar_url} alt={topic.author_name} />
                      )}
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                        {topic.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {topic.is_pinned && (
                          <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        {topic.is_locked && (
                          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-gray-900 truncate">
                          {topic.title}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {topic.body}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>by {topic.author_name}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {topic.reply_count} {topic.reply_count === 1 ? 'reply' : 'replies'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {topic.view_count} views
                        </span>
                        <span>Last activity {formatTimeAgo(topic.last_activity)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={currentPage === pageNum ? "bg-amber-500 hover:bg-amber-600" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
