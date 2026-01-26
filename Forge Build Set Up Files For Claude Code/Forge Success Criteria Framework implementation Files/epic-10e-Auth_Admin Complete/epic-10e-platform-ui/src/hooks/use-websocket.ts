/**
 * FORGE Platform UI - useWebSocket Hook
 * @epic 10b - Execution Monitor
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient, type WSMessage, type WSEventHandler } from '@/lib/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  topics?: string[];
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, handler: WSEventHandler) => () => void;
  lastMessage: WSMessage | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, topics = [] } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  
  const clientRef = useRef(getWebSocketClient());
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await clientRef.current.connect();
      setIsConnected(true);
    } catch (e: any) {
      setError(e.message || 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((topic: string, handler: WSEventHandler) => {
    return clientRef.current.subscribe(topic, handler);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Handle connection state changes
    const checkConnection = setInterval(() => {
      setIsConnected(clientRef.current.isConnected);
    }, 1000);

    return () => {
      clearInterval(checkConnection);
    };
  }, [autoConnect, connect]);

  // Subscribe to topics
  useEffect(() => {
    if (!isConnected || topics.length === 0) return;

    // Clear previous subscriptions
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    // Subscribe to new topics
    topics.forEach((topic) => {
      const unsub = subscribe(topic, (message) => {
        setLastMessage(message);
      });
      unsubscribersRef.current.push(unsub);
    });

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [isConnected, topics, subscribe]);

  // Handle errors
  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe('error', (message) => {
      setError(message.payload?.message || 'Unknown error');
    });

    return unsub;
  }, [isConnected, subscribe]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    subscribe,
    lastMessage,
  };
}

export default useWebSocket;
