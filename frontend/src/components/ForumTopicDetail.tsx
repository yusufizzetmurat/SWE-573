import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, MessageSquare, Eye, Pin, Lock, Send, 
  Loader2, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { forumAPI } from '../lib/api';
import type { ForumTopic, ForumPost } from '../lib/types';
import { useToast } from './Toast';
import { useAuth } from '../lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface ForumTopicDetailProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  topicId: string;
  topicTitle?: string;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function ForumTopicDetail({ 
  onNavigate, 
  topicId,
  topicTitle = 'Topic',
  userBalance = 0, 
  unreadNotifications = 0, 
  onLogout = () => {}
}: ForumTopicDetailProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchTopic = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const topicData = await forumAPI.getTopic(topicId);
      setTopic(topicData);
      // Initial posts come from topic detail
      if (topicData.posts) {
        setPosts(topicData.posts);
      }
      // Calculate total pages from reply_count (20 posts per page)
      const calculatedPages = Math.ceil(topicData.reply_count / 20);
      setTotalPages(calculatedPages > 0 ? calculatedPages : 1);
    } catch (err) {
      console.error('Failed to fetch topic:', err);
      setError('Failed to load topic. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  const fetchPosts = useCallback(async (page: number = 1) => {
    try {
      const postsData = await forumAPI.getPosts(topicId, page);
      setPosts(postsData.results);
      setTotalPages(Math.ceil(postsData.count / 20));
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      showToast('Failed to load replies', 'error');
    }
  }, [topicId, showToast]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchPosts(newPage);
      window.scrollTo(0, 0);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !isAuthenticated) return;
    
    if (topic?.is_locked) {
      showToast('This topic is locked and cannot receive new replies', 'error');
      return;
    }

    setIsSending(true);
    try {
      const newPost = await forumAPI.createPost(topicId, { body: replyText.trim() });
      setPosts(prev => [...prev, newPost]);
      setReplyText('');
      showToast('Reply posted successfully!', 'success');
      
      // Update topic reply count locally
      if (topic) {
        setTopic({ ...topic, reply_count: topic.reply_count + 1 });
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
      showToast('Failed to post reply. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!editText.trim()) return;
    
    try {
      const updatedPost = await forumAPI.updatePost(postId, editText.trim());
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      setEditingPostId(null);
      setEditText('');
      showToast('Reply updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update post:', err);
      showToast('Failed to update reply. Please try again.', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    
    try {
      await forumAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Reply deleted successfully!', 'success');
      
      // Update topic reply count locally
      if (topic) {
        setTopic({ ...topic, reply_count: Math.max(0, topic.reply_count - 1) });
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast('Failed to delete reply. Please try again.', 'error');
    }
  };

  const canEditPost = (post: ForumPost) => {
    return user && (post.author_id === user.id || user.role === 'admin');
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

      <div className="max-w-[900px] mx-auto px-8 py-8">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => {
            if (topic?.category_slug) {
              onNavigate('forum-category', { 
                categorySlug: topic.category_slug, 
                categoryName: topic.category_name 
              });
            } else {
              onNavigate('forum');
            }
          }}
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {topic?.category_name || 'Forum'}
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="ml-3 text-gray-600">Loading topic...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTopic} variant="outline">
              Try Again
            </Button>
          </div>
        ) : topic ? (
          <>
            {/* Topic Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  {topic.author_avatar_url && (
                    <AvatarImage src={topic.author_avatar_url} alt={topic.author_name} />
                  )}
                  <AvatarFallback className="bg-amber-100 text-amber-700">
                    {topic.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {topic.is_pinned && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </span>
                    )}
                    {topic.is_locked && (
                      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {topic.title}
                  </h1>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>by <span className="font-medium text-gray-700">{topic.author_name}</span></span>
                    <span>{formatDateTime(topic.created_at)}</span>
                  </div>
                  
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{topic.body}</p>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {topic.reply_count} {topic.reply_count === 1 ? 'reply' : 'replies'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {topic.view_count} views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Replies ({topic.reply_count})
              </h2>
              
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No replies yet. Be the first to respond!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          {post.author_avatar_url && (
                            <AvatarImage src={post.author_avatar_url} alt={post.author_name} />
                          )}
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                            {post.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{post.author_name}</span>
                              <span className="text-sm text-gray-500">
                                {formatDateTime(post.created_at)}
                              </span>
                              {post.updated_at !== post.created_at && (
                                <span className="text-xs text-gray-400">(edited)</span>
                              )}
                            </div>
                            
                            {canEditPost(post) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-8 h-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setEditingPostId(post.id);
                                      setEditText(post.body);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          
                          {editingPostId === post.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                                rows={4}
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleEditPost(post.id)}
                                  className="bg-amber-500 hover:bg-amber-600"
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPostId(null);
                                    setEditText('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
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
            </div>

            {/* Reply Form */}
            {topic.is_locked ? (
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <Lock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">This topic is locked and cannot receive new replies.</p>
              </div>
            ) : isAuthenticated ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Post a Reply</h3>
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  rows={4}
                  disabled={isSending}
                />
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isSending}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-600 mb-4">Please log in to reply to this topic.</p>
                <Button 
                  onClick={() => onNavigate('login')}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Log In
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
