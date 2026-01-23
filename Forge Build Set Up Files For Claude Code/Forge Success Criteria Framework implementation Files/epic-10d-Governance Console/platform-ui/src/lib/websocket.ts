/**
 * FORGE Platform UI - WebSocket Client
 * @epic 10b - Execution Monitor
 */

export type WSMessageType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'run_event'
  | 'ping'
  | 'pong'
  | 'error'
  | 'reconnect';

export interface WSMessage {
  type: WSMessageType;
  topic?: string;
  payload?: any;
  timestamp?: string;
}

export type WSEventHandler = (event: WSMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<WSEventHandler>> = new Map();
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: WSMessage[] = [];
  private isConnecting = false;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3100/ws';
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();
          this.resubscribe();
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[WS] Parse error:', e);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WS] Disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPing();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  disconnect(): void {
    this.stopPing();
    this.subscriptions.clear();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  subscribe(topic: string, handler: WSEventHandler): () => void {
    // Add handler
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);

    // Send subscription if not already subscribed
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.add(topic);
      this.send({ type: 'subscribe', topic });
    }

    // Return unsubscribe function
    return () => {
      this.handlers.get(topic)?.delete(handler);
      if (this.handlers.get(topic)?.size === 0) {
        this.handlers.delete(topic);
        this.subscriptions.delete(topic);
        this.send({ type: 'unsubscribe', topic });
      }
    };
  }

  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    } else {
      this.messageQueue.push(message);
    }
  }

  private handleMessage(message: WSMessage): void {
    // Handle pong
    if (message.type === 'pong') {
      return;
    }

    // Handle errors
    if (message.type === 'error') {
      console.error('[WS] Server error:', message.payload);
      this.emit('error', message);
      return;
    }

    // Route to topic handlers
    if (message.topic) {
      const handlers = this.handlers.get(message.topic);
      handlers?.forEach((handler) => handler(message));
    }

    // Also emit to wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    wildcardHandlers?.forEach((handler) => handler(message));
  }

  private emit(topic: string, message: WSMessage): void {
    const handlers = this.handlers.get(topic);
    handlers?.forEach((handler) => handler(message));
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      this.emit('error', { type: 'error', payload: { message: 'Connection lost' } });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Will trigger another reconnect via onclose
      });
    }, delay);
  }

  private resubscribe(): void {
    this.subscriptions.forEach((topic) => {
      this.send({ type: 'subscribe', topic });
    });
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

export default WebSocketClient;
