import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, CheckCircle, Send, ChevronDown, ChevronUp, CornerDownRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { commentAPI, Comment, CommentReply, ReviewableHandshake } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from './Toast';
import { getErrorMessage } from '../lib/types';
import { formatTimebank } from '../lib/utils';
import { getBadgeMeta } from '../lib/badges';

interface CommentSectionProps {
  serviceId: string;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentItem({ 
  comment, 
  serviceId,
  onReplyAdded,
  onNavigate,
  isReply = false
}: { 
  comment: Comment | CommentReply; 
  serviceId: string;
  onReplyAdded: () => void;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  isReply?: boolean;
}) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const fullComment = comment as Comment;
  const replies = fullComment.replies || [];
  const replyCount = fullComment.reply_count || 0;

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await commentAPI.create(serviceId, replyText.trim(), comment.id);
      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
      onReplyAdded();
      showToast('Reply posted!', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to post reply'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = comment.user_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${isReply ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''}`}>
      <div className="flex gap-3">
        <Avatar 
          className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all"
          onClick={() => onNavigate('public-profile', { userId: comment.user_id })}
        >
          {comment.user_avatar_url && (
            <AvatarImage src={comment.user_avatar_url} alt={comment.user_name} />
          )}
          <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {comment.service_title && (
              <>
                <span className="font-semibold text-gray-900">{comment.service_title}</span>
                <span className="text-gray-400">-</span>
              </>
            )}
            <button
              onClick={() => onNavigate('public-profile', { userId: comment.user_id })}
              className="font-medium text-gray-900 hover:text-amber-600 transition-colors"
            >
              {comment.user_name}
            </button>
            
            {comment.user_karma_score !== undefined && comment.user_karma_score > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                {comment.user_karma_score} karma
              </span>
            )}
            
            {comment.user_featured_achievement_id && (() => {
              const badgeMeta = getBadgeMeta(comment.user_featured_achievement_id);
              if (!badgeMeta) return null;
              const Icon = badgeMeta.icon;
              return (
                <Badge className="bg-amber-50 text-amber-700 text-xs flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {badgeMeta.label}
                </Badge>
              );
            })()}
            
            {comment.is_verified_review && (
              <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified · {formatTimebank(comment.handshake_hours || 0)}hr
              </Badge>
            )}
            
            <span className="text-xs text-gray-400">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          <p className="text-gray-700 mt-1 text-sm whitespace-pre-wrap">
            {comment.is_deleted ? (
              <span className="italic text-gray-400">[Comment deleted]</span>
            ) : (
              comment.body
            )}
          </p>

          {!isReply && !comment.is_deleted && (
            <div className="flex items-center gap-4 mt-2">
              {isAuthenticated && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs text-gray-500 hover:text-amber-600 flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3" />
                  Reply
                </button>
              )}
              
              {replyCount > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-xs text-gray-500 hover:text-amber-600 flex items-center gap-1"
                >
                  {showReplies ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Hide {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
                maxLength={2000}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyText.trim() || isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reply'
                  )}
                </Button>
              </div>
            </form>
          )}

          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply as Comment}
                  serviceId={serviceId}
                  onReplyAdded={onReplyAdded}
                  onNavigate={onNavigate}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ serviceId, onNavigate }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [reviewableHandshakes, setReviewableHandshakes] = useState<ReviewableHandshake[]>([]);
  const [selectedHandshake, setSelectedHandshake] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchComments = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await commentAPI.list(serviceId, pageNum);
      
      // Filter to show only verified reviews
      const verifiedReviews = response.results.filter(c => c.is_verified_review && !c.is_deleted);
      
      if (append) {
        setComments(prev => [...prev, ...verifiedReviews]);
      } else {
        setComments(verifiedReviews);
      }
      
      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [serviceId]);

  const fetchReviewableHandshakes = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const handshakes = await commentAPI.getReviewableHandshakes(serviceId);
      setReviewableHandshakes(handshakes);
    } catch (error) {
      console.error('Failed to fetch reviewable handshakes:', error);
    }
  }, [serviceId, isAuthenticated]);

  useEffect(() => {
    fetchComments();
    fetchReviewableHandshakes();
  }, [fetchComments, fetchReviewableHandshakes]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await commentAPI.create(serviceId, commentText.trim());
      setCommentText('');
      fetchComments();
      showToast('Comment posted!', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to post comment'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim() || !selectedHandshake || isSubmittingReview) return;

    setIsSubmittingReview(true);
    try {
      await commentAPI.create(serviceId, reviewText.trim(), undefined, selectedHandshake);
      setReviewText('');
      setSelectedHandshake(null);
      setShowReviewForm(false);
      fetchComments();
      fetchReviewableHandshakes();
      showToast('Review posted!', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to post review'), 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchComments(page + 1, true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-500" />
          Comments & Reviews
        </h3>
        
        {reviewableHandshakes.length > 0 && !showReviewForm && (
          <Button
            onClick={() => {
              setShowReviewForm(true);
              if (reviewableHandshakes.length === 1) {
                setSelectedHandshake(reviewableHandshakes[0].id);
              }
            }}
            className="bg-green-500 hover:bg-green-600 text-white"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Write a Verified Review
          </Button>
        )}
      </div>

      {/* Verified Review Form */}
      {showReviewForm && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Write a Verified Review
          </h4>
          
          {reviewableHandshakes.length > 1 && (
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Select transaction:</label>
              <select
                value={selectedHandshake || ''}
                onChange={(e) => setSelectedHandshake(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select a transaction...</option>
                {reviewableHandshakes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {formatTimebank(h.provisioned_hours)} hours - {new Date(h.completed_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <form onSubmit={handleSubmitReview}>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this service..."
              className="min-h-[80px] resize-none mb-3"
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReviewForm(false);
                  setReviewText('');
                  setSelectedHandshake(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!reviewText.trim() || !selectedHandshake || isSubmittingReview}
                className="bg-green-500 hover:bg-green-600"
              >
                {isSubmittingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Post Verified Review
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Regular Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              {user?.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
              )}
              <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ask a question or share your thoughts..."
                className="min-h-[60px] resize-none"
                maxLength={2000}
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  disabled={!commentText.trim() || isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600"
                  size="sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 text-sm">
            <button 
              onClick={() => onNavigate('login')}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Sign in
            </button>
            {' '}to leave a comment or review.
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
          <p className="text-sm text-gray-500 mt-2">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No verified reviews yet. Reviews will appear here after service completion.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              serviceId={serviceId}
              onReplyAdded={() => fetchComments()}
              onNavigate={onNavigate}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More Comments'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
