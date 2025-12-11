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
    if (!enabled || !token || !url) {
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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
            logger.error('WebSocket error message', undefined, { error: data.error, url });
            onErrorRef.current?.(event);
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error instanceof Error ? error : new Error(String(error)), { url });
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket connection error', error instanceof Error ? error : new Error(String(error)), { url });
        onErrorRef.current?.(error);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        onCloseRef.current?.();

        // Only attempt to reconnect if it wasn't a manual close (code 1000)
        // and if we haven't exceeded max attempts
        if (event.code !== 1000 && enabled) {
          setReconnectAttempts((prev) => {
            if (prev < 5) {
              const delay = Math.min(1000 * Math.pow(2, prev), 30000);
              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
              return prev + 1;
            }
            return prev;
          });
        }
      };
    } catch (error) {
      logger.error('Failed to create WebSocket', error instanceof Error ? error : new Error(String(error)), { url });
      onErrorRef.current?.(error as Event);
    }
  }, [url, token, enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      // Close with code 1000 (normal closure) to prevent reconnection
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempts(0);
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
    if (enabled && token && url) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // connect and disconnect are stable callbacks, no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token, url]); // url changes trigger reconnect

  return {
    isConnected,
    sendMessage,
    disconnect,
    connect,
  };
}

