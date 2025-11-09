import React from 'react';
import { Bell, CheckCircle, AlertCircle, MessageSquare, Star } from 'lucide-react';
import { Notification } from '../lib/api';

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

/**
 * Memoized notification item component
 * Only re-renders when notification data changes
 */
export const NotificationItem = React.memo<NotificationItemProps>(
  ({ notification, onClick }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'handshake_request':
        case 'handshake_accepted':
        case 'handshake_denied':
          return <CheckCircle className="h-5 w-5 text-blue-500" />;
        case 'chat_message':
          return <MessageSquare className="h-5 w-5 text-green-500" />;
        case 'positive_rep':
          return <Star className="h-5 w-5 text-yellow-500" />;
        case 'admin_warning':
          return <AlertCircle className="h-5 w-5 text-red-500" />;
        default:
          return <Bell className="h-5 w-5 text-gray-500" />;
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
        className={`p-4 border-b cursor-pointer transition-colors ${
          notification.is_read ? 'bg-white' : 'bg-blue-50'
        } hover:bg-gray-50`}
        onClick={() => onClick?.(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">{getIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm">{notification.title}</p>
              <span className="text-xs text-gray-500 ml-2">
                {formatTime(notification.created_at)}
              </span>
            </div>

            <p className="text-sm text-gray-600">{notification.message}</p>

            {!notification.is_read && (
              <div className="mt-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return (
      prevProps.notification.id === nextProps.notification.id &&
      prevProps.notification.is_read === nextProps.notification.is_read
    );
  }
);

NotificationItem.displayName = 'NotificationItem';
