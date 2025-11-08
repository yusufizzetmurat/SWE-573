import React, { useEffect, useState } from 'react';
import { MessageSquare, Calendar, Shield, Heart, Clock, AlertTriangle, CheckCircle, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { notificationAPI, Notification as APINotification } from '../lib/api';

interface Notification {
  id: string;
  type: 'message' | 'reminder' | 'interest' | 'admin' | 'rep' | 'service-confirmed';
  title: string;
  description: string;
  timestamp: string;
  isUnread: boolean;
  link?: string;
}

interface NotificationDropdownProps {
  notifications?: Notification[];
  unreadCount?: number;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  children: React.ReactNode;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New Message',
    description: 'Cem sent you a message',
    timestamp: '5m ago',
    isUnread: true,
    link: 'messages',
  },
  {
    id: '2',
    type: 'reminder',
    title: 'Service Reminder',
    description: "Reminder: 'Manti Cooking Lesson' is tomorrow at 18:00",
    timestamp: '2h ago',
    isUnread: true,
    link: 'profile',
  },
  {
    id: '3',
    type: 'interest',
    title: 'New Interest',
    description: "Elif is interested in your offer 'Genealogy Research'",
    timestamp: '3h ago',
    isUnread: false,
    link: 'messages',
  },
  {
    id: '4',
    type: 'rep',
    title: 'Positive Feedback',
    description: 'Sarah Chen gave you +Punctual and +Kind reps!',
    timestamp: '5h ago',
    isUnread: false,
    link: 'profile',
  },
  {
    id: '5',
    type: 'service-confirmed',
    title: 'Service Confirmed',
    description: 'Your cooking lesson with Sarah has been confirmed',
    timestamp: '1d ago',
    isUnread: false,
    link: 'profile',
  },
  {
    id: '6',
    type: 'admin',
    title: 'Community Update',
    description: 'New community guidelines have been published',
    timestamp: '2d ago',
    isUnread: false,
    link: 'forum',
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  const iconClass = 'w-5 h-5';
  
  switch (type) {
    case 'message':
      return <MessageSquare className={`${iconClass} text-blue-600`} />;
    case 'reminder':
      return <Calendar className={`${iconClass} text-orange-600`} />;
    case 'interest':
      return <Heart className={`${iconClass} text-pink-600`} />;
    case 'admin':
      return <Shield className={`${iconClass} text-purple-600`} />;
    case 'rep':
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case 'service-confirmed':
      return <Clock className={`${iconClass} text-amber-600`} />;
    default:
      return <AlertTriangle className={`${iconClass} text-gray-600`} />;
  }
};

export function NotificationDropdown({
  notifications: propNotifications,
  unreadCount: propUnreadCount,
  onNotificationClick,
  onMarkAllRead,
  children,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchNotifications = async () => {
      if (!isMounted) return;
      
      try {
        const data = await notificationAPI.list();
        if (isMounted) {
          setNotifications(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch notifications:', error);
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();
    // Refresh every 60 seconds (less frequent to reduce load)
    const interval = setInterval(fetchNotifications, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const calculatedUnreadCount = propUnreadCount ?? notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notification: APINotification) => {
    // Mark as read (would need API endpoint for individual mark as read)
    // For now, just navigate
    if (onNotificationClick) {
      // Convert to old format for compatibility
      onNotificationClick({
        id: notification.id,
        type: notification.type as any,
        title: notification.title,
        description: notification.message,
        timestamp: new Date(notification.created_at).toLocaleString(),
        isUnread: !notification.is_read,
        link: notification.related_handshake ? 'messages' : notification.related_service ? 'service-detail' : undefined
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onMarkAllRead) {
        onMarkAllRead();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-gray-900">Notifications</h3>
          {calculatedUnreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-gray-600 text-center">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-center">No notifications yet</p>
              <p className="text-sm text-gray-500 text-center mt-1">
                We'll notify you when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const notificationType = notification.type.includes('message') ? 'message' :
                  notification.type.includes('reminder') ? 'reminder' :
                  notification.type.includes('interest') ? 'interest' :
                  notification.type.includes('admin') ? 'admin' :
                  notification.type.includes('rep') ? 'rep' :
                  notification.type.includes('confirmation') ? 'service-confirmed' : 'message';
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notificationType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        {!notification.is_read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <button className="text-sm text-amber-600 hover:text-amber-700 w-full text-center">
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
