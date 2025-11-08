import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Check, AlertCircle, MessageSquare, CheckCircle } from 'lucide-react';
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
import { useWebSocket } from '../lib/useWebSocket';

interface ChatPageProps {
  onNavigate: (page: string) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  onConfirmService?: (handshakeId: string) => void;
}

export function ChatPage({ onNavigate, userBalance = 1, unreadNotifications = 0, onLogout, onConfirmService }: ChatPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showHandshakeDetailsModal, setShowHandshakeDetailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChatRef = useRef<Conversation | null>(null);

  // Keep selectedChatRef in sync with selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Define fetchConversations function using useCallback for stability
  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatAPI.listConversations();
      setConversations(data);
      
      // Update selected chat if it still exists, preserving selection
      const currentSelected = selectedChatRef.current;
      const updatedChat = data.find(c => c.handshake_id === currentSelected?.handshake_id);
      if (updatedChat) {
        setSelectedChat(updatedChat);
      } else if (data.length > 0 && !currentSelected) {
        setSelectedChat(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      await fetchConversations();
      setIsLoading(false);
    };

    loadConversations();

    // Auto-refresh conversations every 5 seconds to catch handshake status changes
    const refreshInterval = setInterval(() => {
      fetchConversations();
    }, 5000);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConversations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh on window focus
    const handleFocus = () => {
      fetchConversations();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchConversations]);

  // WebSocket connection for real-time messages
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const wsBaseUrl = API_BASE_URL.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
  const token = localStorage.getItem('access_token');
  
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    url: selectedChat ? `${wsBaseUrl}/ws/chat/${selectedChat.handshake_id}/` : '',
    token,
    enabled: !!selectedChat && !!token,
    onMessage: (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
      // Refresh conversations to update last message and handshake status
      fetchConversations();
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Fetch initial messages when chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedChat) {
        try {
          const data = await chatAPI.getMessages(selectedChat.handshake_id);
          setMessages(data);
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      }
    };

    fetchMessages();
  }, [selectedChat?.handshake_id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInitiateHandshake = async (details: { exact_location: string; exact_duration: number; scheduled_time: string }) => {
    if (!selectedChat || selectedChat.status !== 'pending') {
      return;
    }
    
    try {
      await handshakeAPI.initiate(selectedChat.handshake_id, details);
      // Refresh conversations to get updated handshake status
      await fetchConversations();
      showToast('Service details provided! Waiting for requester approval.', 'success');
      setShowHandshakeDetailsModal(false);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const apiError = error as { response?: { data?: { conflict?: boolean; conflict_details?: any } } };
      if (apiError?.response?.data?.conflict) {
        setShowConflictModal(true);
      } else if (errorMessage.includes('not pending')) {
        // Refresh if status changed
        await fetchConversations();
      } else {
        showToast(errorMessage, 'error');
      }
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
      showToast('Handshake approved! The handshake is now accepted.', 'success');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim() && selectedChat && user) {
      const messageText = messageInput.trim();
      setMessageInput('');
      
      // Optimistic UI: Add message immediately
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
      
      // Try WebSocket first, fallback to REST API
      if (isConnected) {
        const sent = sendWebSocketMessage(messageText);
        if (!sent) {
          // WebSocket failed, use REST API
          sendViaRestAPI(messageText, tempMessage);
        }
      } else {
        // WebSocket not connected, use REST API
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
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedChat?.handshake_id === conversation.handshake_id ? 'bg-amber-50' : ''
                        }`}
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
                                onClick={() => setShowHandshakeDetailsModal(true)}
                                className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Initiate Handshake
                              </Button>
                            );
                          }
                          
                          // Requester flow: can approve after provider initiates
                          if (selectedChat.provider_initiated) {
                            return (
                              <Button 
                                onClick={handleApproveHandshake}
                                className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Handshake
                              </Button>
                            );
                          }
                          
                          return (
                            <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-sm font-medium whitespace-nowrap">
                              Waiting for {selectedChat.other_user.name} to provide service details
                            </div>
                          );
                        })()}
                        {selectedChat.status === 'accepted' && (
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                              Handshake Accepted
                            </div>
                            {/* Check if user needs to confirm completion */}
                            {(() => {
                              if (!user || !selectedChat) return null;
                              const isProvider = selectedChat.is_provider ?? false;
                              const userHasConfirmed = isProvider 
                                ? selectedChat.provider_confirmed_complete 
                                : selectedChat.receiver_confirmed_complete;
                              const bothConfirmed = selectedChat.provider_confirmed_complete && selectedChat.receiver_confirmed_complete;
                              
                              if (bothConfirmed) {
                                return (
                                  <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                    Service Completed
                                  </div>
                                );
                              }
                              
                              if (!userHasConfirmed && onConfirmService) {
                                return (
                                  <Button 
                                    onClick={() => onConfirmService(selectedChat.handshake_id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Confirm Service Completion
                                  </Button>
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
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-12">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                          </div>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          const isSent = message.sender_id === user?.id;
                          const isLast = index === messages.length - 1;
                          return (
                            <div
                              key={message.id}
                              ref={isLast ? messagesEndRef : null}
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
                    />
                    <Button 
                      onClick={handleSendMessage}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={!messageInput.trim()}
                    >
                      <Send className="w-4 h-4" />
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
            <DialogDescription className="pt-4">
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
            </DialogDescription>
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
