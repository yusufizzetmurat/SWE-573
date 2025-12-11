import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { ArrowLeft, Send, Check, AlertCircle, MessageSquare, CheckCircle, Star } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { chatAPI, Conversation, ChatMessage, handshakeAPI } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from './Toast';
import { getErrorMessage, type ApiError } from '../lib/types';
import { HandshakeDetailsModal } from './HandshakeDetailsModal';
import { ProviderDetailsModal } from './ProviderDetailsModal';
import { useWebSocket } from '../lib/useWebSocket';
import { logger } from '../lib/logger';
import { POLLING_INTERVALS } from '../lib/constants';

interface ChatPageProps {
  onNavigate: (page: string) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  onConfirmService?: (handshakeId: string) => void;
  onOpenReputationModal?: (handshakeId: string, partnerName: string) => void;
}

export function ChatPage({ onNavigate, userBalance = 1, unreadNotifications = 0, onLogout, onConfirmService, onOpenReputationModal }: ChatPageProps) {
  const { user, refreshUser, updateUserOptimistically } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showHandshakeDetailsModal, setShowHandshakeDetailsModal] = useState(false);
  const [showProviderDetailsModal, setShowProviderDetailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingHandshake, setIsInitiatingHandshake] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);

  const selectedChatRef = useRef<Conversation | null>(null);

  // Keep selectedChatRef in sync with selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Define fetchConversations function using useCallback for stability
  // Note: selectedChatRef is used to avoid stale closure issues
  const fetchConversations = useCallback(async (setLoading: boolean = false, abortSignal?: AbortSignal) => {
    try {
      if (setLoading) {
        setIsLoading(true);
      }
      // Force fresh fetch by adding cache-busting timestamp to query params
      // This ensures we get the latest conversations even if backend cache is stale
      // Force refresh to bypass any client-side caching
      const data = await chatAPI.listConversations(abortSignal, true);
      
      if (abortSignal?.aborted) return;
      
      setConversations(data);
      
      // Update selected chat if it still exists, preserving selection
      const currentSelected = selectedChatRef.current;
      const updatedChat = data.find(c => c.handshake_id === currentSelected?.handshake_id);
      if (updatedChat) {
        setSelectedChat(updatedChat);
      } else if (data.length > 0 && !currentSelected) {
        // If no chat was selected, select the first one (newest conversation)
        setSelectedChat(data[0]);
      }
    } catch (error: any) {
      // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
      if (abortSignal?.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        if (setLoading) {
          setIsLoading(false);
        }
        return;
      }
      
      logger.error('Failed to fetch conversations', error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (setLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const loadConversations = async () => {
      if (isMounted) {
        await fetchConversations(true, abortController.signal);
      }
    };

    loadConversations();

    // Auto-refresh conversations to catch handshake status changes
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchConversations(false, abortController.signal);
      }
    }, POLLING_INTERVALS.CONVERSATIONS);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        fetchConversations(false, abortController.signal);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh on window focus
    const handleFocus = () => {
      if (isMounted) {
        fetchConversations(false, abortController.signal);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchConversations]);

  // WebSocket connection for real-time messages
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
  const wsBaseUrl = API_BASE_URL.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
  const token = localStorage.getItem('access_token');
  
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    url: selectedChat ? `${wsBaseUrl}/ws/chat/${selectedChat.handshake_id}/` : '',
    token,
    enabled: !!selectedChat && !!token,
    onMessage: (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists (by ID) - this is the primary duplicate check
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          // Message already exists, don't add it again
          return prev;
        }
        
        // If we have a temp message with the same content and sender, replace it
        // This handles the case where we sent via REST API but also received via WebSocket
        const tempMessageIndex = prev.findIndex(m => 
          m.id.startsWith('temp-') && 
          m.body === message.body && 
          m.sender_id === message.sender_id &&
          Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 10000 // Within 10 seconds
        );
        
        if (tempMessageIndex !== -1) {
          // Replace temp message with real one
          const newMessages = [...prev];
          newMessages[tempMessageIndex] = message;
          return newMessages;
        }
        
        // Also check for duplicate by content + sender + time to prevent WebSocket duplicates
        // This handles cases where the same message might be received multiple times via WebSocket
        const duplicateByContent = prev.some(m => 
          m.id !== message.id && // Different ID (not the same message)
          m.body === message.body && 
          m.sender_id === message.sender_id &&
          Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 2000 // Within 2 seconds
        );
        
        if (duplicateByContent) {
          // This appears to be a duplicate, don't add it
          logger.warn('Duplicate message detected and ignored', undefined, { messageId: message.id });
          return prev;
        }
        
        // New messages are appended at the end (they're the newest)
        return [...prev, message];
      });
      // Refresh conversations to update last message and handshake status (debounced would be better, but this works)
      fetchConversations(false);
    },
    onError: (error) => {
      logger.error('WebSocket error', error instanceof Error ? error : new Error(String(error)));
    },
  });

  // Fetch initial messages when chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    
    let abortController = new AbortController();
    
    const fetchMessages = async () => {
      try {
        const data = await chatAPI.getMessages(selectedChat.handshake_id, 1, abortController.signal);
        
        if (abortController.signal.aborted) return;
        
        // Messages come in descending order (newest first), reverse for display
        setMessages(data.results.reverse());
        setHasMoreMessages(!!data.next);
        setCurrentPage(1);
      } catch (error: any) {
        // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
        if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }
        logger.error('Failed to fetch messages', error instanceof Error ? error : new Error(String(error)), { handshakeId: selectedChat?.handshake_id });
      }
    };

    fetchMessages();
    
    return () => {
      abortController.abort();
    };
  }, [selectedChat?.handshake_id]);

  // Load more messages (older messages)
  const loadMoreMessages = async () => {
    if (!selectedChat || isLoadingMore || !hasMoreMessages) return;
    
    let abortController = new AbortController();
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const data = await chatAPI.getMessages(selectedChat.handshake_id, nextPage, abortController.signal);
      
      if (abortController.signal.aborted) return;
      
      // Prepend older messages (they come in descending order, so reverse them)
      setMessages(prev => [...data.results.reverse(), ...prev]);
      setHasMoreMessages(!!data.next);
      setCurrentPage(nextPage);
      
      // Scroll to maintain position (to the top ref)
      if (messagesTopRef.current) {
        messagesTopRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } catch (error: any) {
      // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
      if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        setIsLoadingMore(false);
        return;
      }
      logger.error('Failed to load more messages', error instanceof Error ? error : new Error(String(error)), { handshakeId: selectedChat?.handshake_id });
      showToast('Failed to load more messages', 'error');
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInitiateHandshake = async (details: { exact_location: string; exact_duration: number; scheduled_time: string }) => {
    if (!selectedChat || selectedChat.status !== 'pending' || isInitiatingHandshake) {
      return;
    }
    
    // Prevent duplicate submissions
    if (selectedChat.provider_initiated) {
      showToast('You have already initiated this handshake.', 'info');
      // Refresh to get latest state
      await fetchConversations();
      return;
    }
    
    setIsInitiatingHandshake(true);
    // Store original balance for rollback
    const originalBalance = user?.timebank_balance ?? 0;
    const currentHandshakeId = selectedChat.handshake_id;
    
    try {
      // Optimistically update balance (provider provisions hours)
      if (user && selectedChat.is_provider) {
        const provisionedHours = details.exact_duration;
        updateUserOptimistically({ 
          timebank_balance: originalBalance - provisionedHours 
        });
      }
      
      // Call API and get the updated handshake data
      const updatedHandshake = await handshakeAPI.initiate(selectedChat.handshake_id, details);
      
      // Immediately update selectedChat state optimistically to prevent duplicate clicks
      setSelectedChat(prev => {
        if (!prev || prev.handshake_id !== currentHandshakeId) {
          return prev;
        }
        return {
          ...prev,
          provider_initiated: true,
          exact_location: updatedHandshake.exact_location,
          exact_duration: updatedHandshake.exact_duration,
          scheduled_time: updatedHandshake.scheduled_time,
        };
      });
      
      // Also update in conversations list
      setConversations(prev => prev.map(conv => 
        conv.handshake_id === currentHandshakeId 
          ? {
              ...conv,
              provider_initiated: true,
              exact_location: updatedHandshake.exact_location,
              exact_duration: updatedHandshake.exact_duration,
              scheduled_time: updatedHandshake.scheduled_time,
            }
          : conv
      ));
      
      // Close modal immediately
      setShowHandshakeDetailsModal(false);
      showToast('Service details provided! Waiting for requester approval.', 'success');
      
      // Refresh conversations in background to ensure consistency
      fetchConversations(false).catch(err => {
        logger.error('Failed to refresh conversations', err instanceof Error ? err : new Error(String(err)));
      });
      
      // Sync with server to get actual balance
      refreshUser().catch(err => {
        logger.error('Failed to refresh user', err instanceof Error ? err : new Error(String(err)));
      });
    } catch (error: unknown) {
      // Rollback optimistic update on error
      if (user) {
        updateUserOptimistically({ timebank_balance: originalBalance });
      }
      
      // Log the full error for debugging
      logger.error('Failed to initiate handshake', error instanceof Error ? error : new Error(String(error)));
      
      const apiError = error as { response?: { data?: { conflict?: boolean; conflict_details?: any; detail?: string; code?: string } } };
      const errorData = apiError?.response?.data;
      
      // Log the error data for debugging
      logger.debug('Error data', undefined, { errorData });
      
      // Check for schedule conflict
      if (errorData?.conflict) {
        setShowConflictModal(true);
        setIsInitiatingHandshake(false);
        return;
      }
      
      // Get error message
      const errorMessage = getErrorMessage(error);
      
      // Handle specific error cases
      if (errorMessage.includes('not pending') || errorData?.code === 'INVALID_STATE') {
        // Refresh if status changed
        await fetchConversations();
        showToast('Handshake status has changed. Please refresh the page.', 'warning');
      } else if (errorData?.code === 'ALREADY_EXISTS') {
        // Already initiated - update UI immediately
        setShowHandshakeDetailsModal(false);
        showToast('You have already initiated this handshake.', 'info');
        
        // Force immediate UI update
        setSelectedChat(prev => {
          if (!prev || prev.handshake_id !== currentHandshakeId) {
            return prev;
          }
          return { ...prev, provider_initiated: true };
        });
        
        setConversations(prev => prev.map(conv => 
          conv.handshake_id === currentHandshakeId 
            ? { ...conv, provider_initiated: true }
            : conv
        ));
        
        // Refresh in background to sync with server
        fetchConversations(false).catch(err => {
          logger.error('Failed to refresh conversations', err instanceof Error ? err : new Error(String(err)));
        });
      } else if (errorData?.code === 'PERMISSION_DENIED') {
        showToast('You do not have permission to initiate this handshake.', 'error');
      } else if (errorData?.code === 'VALIDATION_ERROR' && errorData?.detail) {
        // Show specific validation error
        showToast(errorData.detail, 'error');
      } else {
        // Show the error message
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsInitiatingHandshake(false);
    }
  };

  const handleApproveHandshake = async () => {
    if (!selectedChat || selectedChat.status !== 'pending') {
      return;
    }
    
    try {
      await handshakeAPI.approve(selectedChat.handshake_id);
      // Refresh conversations to get updated handshake status
      await fetchConversations();
      // Refresh user data to get updated balance
      await refreshUser();
      showToast('Handshake approved! The handshake is now accepted.', 'success');
      // Close the modal after success
      setShowProviderDetailsModal(false);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };
  
  const handleRequestChanges = async () => {
    if (!selectedChat?.handshake_id) {
      return;
    }

    try {
      await handshakeAPI.requestChanges(selectedChat.handshake_id);
      
      // Update UI immediately
      setSelectedChat(prev => {
        if (!prev) return null;
        return { ...prev, provider_initiated: false };
      });
      
      setConversations(prev => prev.map(conv => 
        conv.handshake_id === selectedChat.handshake_id 
          ? { ...conv, provider_initiated: false }
          : conv
      ));
      
      showToast('Changes requested. The provider will be notified.', 'info');
      setShowProviderDetailsModal(false);
      
      // Refresh in background
      fetchConversations(false).catch(err => {
        logger.error('Failed to refresh conversations', err instanceof Error ? err : new Error(String(err)));
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };
  
  const handleDeclineHandshake = async () => {
    if (!selectedChat?.handshake_id) {
      return;
    }

    try {
      await handshakeAPI.decline(selectedChat.handshake_id);
      
      // Update UI immediately
      setSelectedChat(prev => {
        if (!prev) return null;
        return { ...prev, status: 'denied' };
      });
      
      setConversations(prev => prev.map(conv => 
        conv.handshake_id === selectedChat.handshake_id 
          ? { ...conv, status: 'denied' }
          : conv
      ));
      
      showToast('Handshake declined.', 'info');
      setShowProviderDetailsModal(false);
      
      // Refresh in background
      fetchConversations(false).catch(err => {
        logger.error('Failed to refresh conversations', err instanceof Error ? err : new Error(String(err)));
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim() && selectedChat && user) {
      const messageText = messageInput.trim();
      setMessageInput('');
      
      // Try WebSocket first, fallback to REST API
      if (isConnected) {
        const sent = sendWebSocketMessage(messageText);
        if (!sent) {
          // WebSocket failed, use REST API with optimistic UI
          const tempMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            handshake: selectedChat.handshake_id,
            sender: user.id,
            sender_id: user.id,
            sender_name: `${user.first_name} ${user.last_name}`.trim() || user.email,
            body: messageText,
            created_at: new Date().toISOString(),
          };
          setMessages([...messages, tempMessage]);
          sendViaRestAPI(messageText, tempMessage);
        }
        // When WebSocket is connected, don't add optimistic message
        // The server will broadcast it back immediately via WebSocket
      } else {
        // WebSocket not connected, use REST API with optimistic UI
        const tempMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          handshake: selectedChat.handshake_id,
          sender: user.id,
          sender_id: user.id,
          sender_name: `${user.first_name} ${user.last_name}`.trim() || user.email,
          body: messageText,
          created_at: new Date().toISOString(),
        };
        setMessages([...messages, tempMessage]);
        sendViaRestAPI(messageText, tempMessage);
      }
    }
  };

  const sendViaRestAPI = async (messageText: string, tempMessage: ChatMessage) => {
    try {
      const newMessage = await chatAPI.sendMessage(selectedChat!.handshake_id, messageText);
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? newMessage : m));
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error: unknown) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setMessageInput(messageText); // Restore message text
      const errorMessage = getErrorMessage(error, 'Failed to send message');
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="messages" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout || (() => {})}
        isAuthenticated={true}
      />

      <div className="max-w-[1440px] mx-auto px-8 py-8 relative" style={{ zIndex: 1 }}>
        {/* Back Button - Ensure it's always accessible */}
        <Button 
          variant="ghost" 
          onClick={() => onNavigate('dashboard')}
          className="mb-6 relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 240px)', maxHeight: 'calc(100vh - 240px)' }}>
          <div className="grid grid-cols-[380px_1fr] h-full overflow-hidden relative">
            {/* Left Panel - Conversations List */}
            <div className="border-r border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-gray-900">Messages</h2>
              </div>
              
              <ScrollArea className="h-[calc(100%-88px)]">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-600">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No conversations yet</p>
                    <p className="text-sm text-gray-500">Express interest in a service to start chatting!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.handshake_id}
                        onClick={() => setSelectedChat(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                          selectedChat?.handshake_id === conversation.handshake_id ? 'bg-amber-50' : ''
                        }`}
                        aria-label={`Open conversation with ${conversation.other_user.name} about ${conversation.service_title}`}
                        aria-pressed={selectedChat?.handshake_id === conversation.handshake_id}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 flex-shrink-0">
                            {conversation.other_user.avatar_url && (
                              <AvatarImage 
                                src={conversation.other_user.avatar_url} 
                                alt={conversation.other_user.name} 
                              />
                            )}
                            <AvatarFallback className="bg-amber-100 text-amber-700">
                              {conversation.other_user.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-900 truncate">{conversation.other_user.name}</span>
                              {conversation.last_message && (
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {new Date(conversation.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-1 truncate">
                              {conversation.service_title}
                            </p>
                            {conversation.last_message && (
                              <p className="text-sm truncate text-gray-600">
                                {conversation.last_message.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right Panel - Active Chat */}
            <div className="flex flex-col h-full overflow-hidden">
              {/* Chat Header - Fixed position to always be accessible */}
              {selectedChat && (
                <>
                  <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white relative" style={{ zIndex: 30, pointerEvents: 'auto' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 mb-1 truncate">{selectedChat.other_user.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{selectedChat.service_title}</p>
                      </div>
                      <div className="flex-shrink-0" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 31 }}>
                        {selectedChat.status === 'pending' && user && (() => {
                          const isProvider = selectedChat.is_provider ?? false;
                          
                          // Provider flow: can initiate with details
                          if (isProvider) {
                            if (selectedChat.provider_initiated) {
                              return (
                                <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-sm font-medium whitespace-nowrap">
                                  Waiting for {selectedChat.other_user.name} to approve
                                </div>
                              );
                            }
                            
                            return (
                              <Button 
                                onClick={() => {
                                  // Double-check state before opening modal
                                  if (!selectedChat.provider_initiated && !isInitiatingHandshake) {
                                    setShowHandshakeDetailsModal(true);
                                  } else if (selectedChat.provider_initiated) {
                                    showToast('You have already initiated this handshake.', 'info');
                                    fetchConversations(false).catch(err => logger.error('Failed to refresh', err instanceof Error ? err : new Error(String(err))));
                                  }
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap"
                                style={{ pointerEvents: 'auto' }}
                                disabled={isInitiatingHandshake || selectedChat.provider_initiated}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                {isInitiatingHandshake ? 'Initiating...' : selectedChat.provider_initiated ? 'Already Initiated' : 'Initiate Handshake'}
                              </Button>
                            );
                          }
                          
                          // Requester flow: can approve after provider initiates
                          if (selectedChat.provider_initiated) {
                            return (
                              <Button 
                                onClick={() => setShowProviderDetailsModal(true)}
                                className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Review & Approve
                              </Button>
                            );
                          }
                          
                          return (
                            <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-sm font-medium whitespace-nowrap">
                              Waiting for {selectedChat.other_user.name} to provide service details
                            </div>
                          );
                        })()}
                        {(selectedChat.status === 'accepted' || selectedChat.status === 'completed') && (
                          <div className="flex items-center gap-3">
                            {selectedChat.status === 'accepted' && (
                              <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                                Handshake Accepted
                              </div>
                            )}
                            {/* Check if user needs to confirm completion */}
                            {(() => {
                              if (!user || !selectedChat) return null;
                              const isProvider = selectedChat.is_provider ?? false;
                              const userHasConfirmed = isProvider 
                                ? selectedChat.provider_confirmed_complete 
                                : selectedChat.receiver_confirmed_complete;
                              const bothConfirmed = selectedChat.provider_confirmed_complete && selectedChat.receiver_confirmed_complete;
                              
                              if (bothConfirmed) {
                                // Only SERVICE RECEIVER can leave reputation for SERVICE PROVIDER
                                if (!isProvider) {
                                  // User is the receiver, they can leave reputation
                                  if (!selectedChat.user_has_reviewed) {
                                    return (
                                      <div className="flex flex-col gap-2">
                                        <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium text-center">
                                          Service Completed
                                        </div>
                                        <Button 
                                          onClick={() => {
                                            if (onOpenReputationModal) {
                                              onOpenReputationModal(
                                                selectedChat.handshake_id, 
                                                selectedChat.other_user.name
                                              );
                                            }
                                          }}
                                          className="bg-amber-500 hover:bg-amber-600 text-white text-sm py-2"
                                        >
                                          <Star className="w-4 h-4 mr-2" />
                                          Leave Reputation
                                        </Button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm font-medium text-center">
                                      ✓ Service Completed & Reviewed
                                    </div>
                                  );
                                } else {
                                  // User is the provider, they cannot leave reputation (receiver-only feature)
                                  return (
                                    <div className="flex flex-col gap-2">
                                      <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium text-center">
                                        Service Completed
                                      </div>
                                      <div className="text-xs text-gray-600 text-center px-2">
                                        The service receiver will leave reputation for you
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              if (!userHasConfirmed && onConfirmService) {
                                return (
                                  <div className="flex flex-col gap-2">
                                    {selectedChat.provisioned_hours && (
                                      <div className="text-xs text-gray-600 px-2">
                                        Hours: {selectedChat.provisioned_hours} {selectedChat.provisioned_hours === 1 ? 'hour' : 'hours'}
                                      </div>
                                    )}
                                    <Button 
                                      onClick={() => onConfirmService(selectedChat.handshake_id)}
                                      className="bg-amber-500 hover:bg-amber-600 text-white"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Confirm Service Completion
                                    </Button>
                                  </div>
                                );
                              }
                              
                              if (userHasConfirmed) {
                                return (
                                  <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                                    Waiting for partner confirmation
                                  </div>
                                );
                              }
                              
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages - Scrollable area that doesn't overlap header */}
                  <div className="flex-1 min-h-0 overflow-hidden relative" style={{ zIndex: 1 }}>
                    <ScrollArea className="h-full p-6 bg-gradient-to-b from-gray-50 to-white">
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
                        <div className="flex items-center justify-center h-full py-12">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                          </div>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          // Add ref to first message for scroll positioning when loading more
                          const isFirst = index === 0;
                          const isSent = message.sender_id === user?.id;
                          const isLast = index === messages.length - 1;
                          return (
                            <div
                              key={message.id}
                              ref={isLast ? messagesEndRef : (isFirst ? messagesTopRef : null)}
                              className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isSent && (
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  {message.sender_avatar_url && (
                                    <AvatarImage 
                                      src={message.sender_avatar_url} 
                                      alt={message.sender_name} 
                                    />
                                  )}
                                  <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                    {message.sender_name.split(' ').map((n: string) => n[0]).join('')}
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
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-white border border-gray-200 text-gray-900'
                                  }`}
                                  style={isSent ? { background: 'linear-gradient(to bottom right, #f97316, #ea580c)' } : {}}
                                >
                                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                    isSent ? 'text-white' : 'text-gray-900'
                                  }`}>{message.body}</p>
                                </div>
                                <div className={`text-xs text-gray-400 mt-1 ${
                                  isSent ? 'text-right mr-1' : 'ml-1'
                                }`}>
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {isSent && (
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  {user?.avatar_url && (
                                    <AvatarImage 
                                      src={user.avatar_url} 
                                      alt={user.first_name || user.email || 'You'} 
                                    />
                                  )}
                                  <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Empty State */}
              {!selectedChat && (
                <div className="flex-1 flex items-center justify-center p-12">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-gray-900 font-semibold mb-2">Select a conversation</h3>
                    <p className="text-gray-600 text-sm">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}

              {/* Message Input - Fixed at bottom, always accessible */}
              {selectedChat && (
                <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gradient-to-r from-white to-gray-50 z-10 relative">
                  <p className="text-xs text-gray-500 mb-2">
                    💬 You can share the exact address here after handshake confirmation
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type your message... (e.g., exact address, meeting point)"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                      aria-label="Message input"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={!messageInput.trim()}
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Handshake Details Modal - Rendered outside header to prevent z-index issues */}
      {showHandshakeDetailsModal && selectedChat && (
        <HandshakeDetailsModal
          open={showHandshakeDetailsModal}
          onClose={() => setShowHandshakeDetailsModal(false)}
          onSubmit={(details) => handleInitiateHandshake(details)}
          serviceTitle={selectedChat.service_title}
        />
      )}

      {/* Provider Details Modal - For requester to review before approval */}
      {showProviderDetailsModal && selectedChat && (
        <ProviderDetailsModal
          open={showProviderDetailsModal}
          onClose={() => setShowProviderDetailsModal(false)}
          onApprove={handleApproveHandshake}
          onRequestChanges={handleRequestChanges}
          onDecline={handleDeclineHandshake}
          exactLocation={selectedChat.exact_location}
          exactDuration={selectedChat.exact_duration}
          scheduledTime={selectedChat.scheduled_time}
          serviceTitle={selectedChat.service_title}
          providerName={selectedChat.other_user.name}
        />
      )}

      {/* Conflict Modal */}
      <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle>Schedule Conflict Detected</DialogTitle>
            </div>
            <div className="pt-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Cannot confirm: This time conflicts with your existing schedule.
                  You have "Guitar Lessons" scheduled on Tuesday at 7:00 PM.
                </AlertDescription>
              </Alert>
              <p className="text-gray-600 mt-4">
                Please coordinate with {selectedChat?.other_user.name} to find an alternative time 
                that works for both of you.
              </p>
            </div>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline"
              onClick={() => setShowConflictModal(false)}
              className="flex-1"
            >
              Continue Chatting
            </Button>
            <Button 
              onClick={() => {
                setShowConflictModal(false);
                onNavigate('profile');
              }}
              className="flex-1"
            >
              View My Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
