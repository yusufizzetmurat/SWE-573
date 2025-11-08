import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  message?: any;
  error?: string;
}

interface UseWebSocketOptions {
  url: string;
  token: string | null;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onError,
  onOpen,
  onClose,
  enabled = true,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onMessage, onError, onOpen, onClose]);

  const connect = useCallback(() => {
    if (!enabled || !token) {
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Build WebSocket URL with token
    const wsUrl = url.includes('?') 
      ? `${url}&token=${token}` 
      : `${url}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          if (data.type === 'chat_message' && data.message) {
            onMessageRef.current?.(data.message);
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data.error);
            onErrorRef.current?.(event);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onErrorRef.current?.(error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        onCloseRef.current?.();

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, token, enabled, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        body: message,
      }));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (enabled && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, token, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    connect,
  };
}

