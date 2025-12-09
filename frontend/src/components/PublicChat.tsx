import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { publicChatAPI, PublicChatMessage, ChatRoom } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from './Toast';
import { useWebSocket } from '../lib/useWebSocket';
import { getErrorMessage } from '../lib/types';

interface PublicChatProps {
  serviceId: string;
  onNavigate?: (page: string) => void;
}

export function PublicChat({ serviceId, onNavigate }: PublicChatProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Fetch initial room and messages
  const fetchRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await publicChatAPI.getRoom(serviceId);
      setRoom(data.room);
      // Messages come in descending order (newest first), reverse for display
      setMessages(data.messages.results.reverse());
      setHasMoreMessages(!!data.messages.next);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch public chat:', error);
      showToast('Failed to load discussion', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, showToast]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // WebSocket connection for real-time messages
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
  const wsBaseUrl = API_BASE_URL.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
  const token = localStorage.getItem('access_token');

  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    url: room ? `${wsBaseUrl}/ws/public-chat/${room.id}/` : '',
    token,
    enabled: !!room && !!token && isAuthenticated,
    onMessage: (message: PublicChatMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          return prev;
        }

        // Check for temp message to replace
        const tempMessageIndex = prev.findIndex(m =>
          m.id.startsWith('temp-') &&
          m.body === message.body &&
          m.sender_id === message.sender_id &&
          Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 10000
        );

        if (tempMessageIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempMessageIndex] = message;
          return newMessages;
        }

        return [...prev, message];
      });
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Load more messages
  const loadMoreMessages = async () => {
    if (!room || isLoadingMore || !hasMoreMessages) return;

    shouldScrollRef.current = false; // Don't scroll when loading older messages
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await publicChatAPI.getRoom(serviceId, nextPage);
      // Prepend older messages
      setMessages(prev => [...data.messages.results.reverse(), ...prev]);
      setHasMoreMessages(!!data.messages.next);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Failed to load more messages:', error);
      showToast('Failed to load more messages', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll to bottom only for new messages (not when loading older)
  useEffect(() => {
    if (messagesEndRef.current && shouldScrollRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Reset scroll flag for next update
    shouldScrollRef.current = true;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !room || !user) return;

    const messageText = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    // Try WebSocket first
    if (isConnected) {
      const sent = sendWebSocketMessage(messageText);
      if (sent) {
        setIsSending(false);
        return;
      }
    }

    // Fallback to REST API with optimistic UI
    const tempMessage: PublicChatMessage = {
      id: `temp-${Date.now()}`,
      room: room.id,
      sender_id: user.id,
      sender_name: `${user.first_name} ${user.last_name}`.trim() || user.email,
      sender_avatar_url: user.avatar_url,
      body: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const newMessage = await publicChatAPI.sendMessage(serviceId, messageText);
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? newMessage : m));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setMessageInput(messageText);
      const errorMessage = getErrorMessage(error, 'Failed to send message');
      showToast(errorMessage, 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <MessageSquare className="w-8 h-8 mr-2" />
        <span>Unable to load discussion</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Public Discussion</h3>
          <span className="text-xs text-gray-500">({messages.length} messages)</span>
          {isConnected && (
            <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Load More Button */}
          {hasMoreMessages && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? 'Loading...' : 'Load older messages'}
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm">No messages yet. Start the discussion!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSent = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  {!isSent && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {message.sender_avatar_url && (
                        <AvatarImage src={message.sender_avatar_url} alt={message.sender_name} />
                      )}
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {message.sender_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${isSent ? 'order-2' : 'order-1'}`}>
                    {!isSent && (
                      <div className="text-xs text-gray-500 mb-1 ml-1">
                        {message.sender_name}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isSent
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.body}
                      </p>
                    </div>
                    <div className={`text-xs text-gray-400 mt-1 ${isSent ? 'text-right mr-1' : 'ml-1'}`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {isSent && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {user?.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={user.first_name || user.email || 'You'} />
                      )}
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      {isAuthenticated ? (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <Input
              placeholder="Join the discussion..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!messageInput.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            <button
              onClick={() => onNavigate?.('login')}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Log in
            </button>
            {' '}to join the discussion
          </p>
        </div>
      )}
    </div>
  );
}


