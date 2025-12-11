import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Conversation } from '../lib/api';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onClick?: (conversation: Conversation) => void;
}

/**
 * Memoized conversation list item component
 * Only re-renders when conversation data or selection state changes
 */
export const ConversationItem = React.memo<ConversationItemProps>(
  ({ conversation, isSelected, onClick }) => {
    const getStatusBadge = () => {
      switch (conversation.status) {
        case 'pending':
          return <Badge variant="secondary">Pending</Badge>;
        case 'accepted':
          return <Badge variant="default">Active</Badge>;
        case 'completed':
          return <Badge variant="outline">Completed</Badge>;
        case 'cancelled':
          return <Badge variant="destructive">Cancelled</Badge>;
        default:
          return null;
      }
    };

    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    return (
      <div
        className={`p-4 border-b cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
          isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-gray-50'
        }`}
        onClick={() => onClick?.(conversation)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(conversation);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Conversation with ${conversation.other_user.name} about ${conversation.service_title}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={conversation.other_user.avatar_url}
              alt={conversation.other_user.name}
            />
            <AvatarFallback>
              {conversation.other_user.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm truncate">
                {conversation.other_user.name}
              </p>
              {conversation.last_message && (
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(conversation.last_message.created_at)}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mb-2 truncate">
              {conversation.service_title}
            </p>

            {conversation.last_message ? (
              <p className="text-sm text-gray-600 truncate">
                {conversation.last_message.body}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                No messages yet
              </p>
            )}

            <div className="mt-2">{getStatusBadge()}</div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return (
      prevProps.conversation.handshake_id === nextProps.conversation.handshake_id &&
      prevProps.conversation.status === nextProps.conversation.status &&
      prevProps.conversation.last_message?.id === nextProps.conversation.last_message?.id &&
      prevProps.conversation.last_message?.body === nextProps.conversation.last_message?.body &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

ConversationItem.displayName = 'ConversationItem';
