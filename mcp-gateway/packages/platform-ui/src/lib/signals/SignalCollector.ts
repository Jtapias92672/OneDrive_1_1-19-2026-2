import { BehaviorSignal, SignalBatch, SignalType } from './types';
import { SignalBatcher } from './SignalBatcher';
import { SignalThrottler } from './SignalThrottler';

const SIGNAL_API_ENDPOINT = '/api/signals/batch';
const CLIENT_VERSION = '1.0.0';

interface SignalContext {
  [key: string]: unknown;
}

interface CollectorConfig {
  userId?: string;
  sessionId?: string;
  platform?: string;
  endpoint?: string;
  disabled?: boolean;
}

/**
 * Main signal collection class.
 * Provides a simple API to track behavioral signals throughout the app.
 */
export class SignalCollector {
  private batcher: SignalBatcher;
  private throttler: SignalThrottler;
  private config: Required<Omit<CollectorConfig, 'userId' | 'sessionId'>> & {
    userId?: string;
    sessionId?: string;
  };
  private initialized = false;

  constructor(config: CollectorConfig = {}) {
    this.config = {
      platform: this.detectPlatform(),
      endpoint: SIGNAL_API_ENDPOINT,
      disabled: false,
      ...config,
    };

    this.throttler = new SignalThrottler();
    this.batcher = new SignalBatcher(this.sendBatch.bind(this));

    // Setup page unload handler
    if (typeof window !== 'undefined') {
      this.setupUnloadHandler();
    }

    this.initialized = true;
  }

  /**
   * Track a behavioral signal.
   */
  track(signalType: SignalType, context?: SignalContext): void {
    if (this.config.disabled) {
      return;
    }

    // Check throttle
    if (!this.throttler.shouldAllow(signalType)) {
      console.debug(`[SignalCollector] Signal throttled: ${signalType}`);
      return;
    }

    const signal: BehaviorSignal = {
      id: this.generateId(),
      userId: this.config.userId || 'anonymous',
      sessionId: this.config.sessionId || this.getOrCreateSessionId(),
      signalType,
      context: this.sanitizeContext(context),
      clientVersion: CLIENT_VERSION,
      platform: this.config.platform,
      createdAt: new Date(),
    };

    this.batcher.add(signal);
    this.throttler.recordSignal(signalType);
  }

  /**
   * Set user ID (e.g., after login).
   */
  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  /**
   * Set session ID.
   */
  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
  }

  /**
   * Flush all pending signals immediately.
   */
  async flush(): Promise<void> {
    await this.batcher.flush();
  }

  /**
   * Enable or disable signal collection.
   */
  setEnabled(enabled: boolean): void {
    this.config.disabled = !enabled;
  }

  /**
   * Check if collector is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current throttle state.
   */
  getThrottleState(): { count: number; remaining: number; resetsIn: number } {
    return this.throttler.getState();
  }

  /**
   * Get pending signal count.
   */
  getPendingCount(): number {
    return this.batcher.queueSize;
  }

  /**
   * Reset collector state (for testing).
   */
  reset(): void {
    this.batcher.clear();
    this.throttler.reset();
  }

  private async sendBatch(batch: SignalBatch): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch }),
    });

    if (!response.ok) {
      throw new Error(`Signal batch failed: ${response.status}`);
    }
  }

  private setupUnloadHandler(): void {
    const handleUnload = () => {
      this.batcher.flushBeacon(this.config.endpoint);
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.batcher.flushBeacon(this.config.endpoint);
      }
    });
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getOrCreateSessionId(): string {
    if (typeof sessionStorage !== 'undefined') {
      let sessionId = sessionStorage.getItem('forge_session_id');
      if (!sessionId) {
        sessionId = this.generateId();
        sessionStorage.setItem('forge_session_id', sessionId);
      }
      return sessionId;
    }
    return this.generateId();
  }

  private detectPlatform(): string {
    if (typeof window === 'undefined') {
      return 'server';
    }
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'mobile';
    if (ua.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  private sanitizeContext(context?: SignalContext): Record<string, unknown> | undefined {
    if (!context) return undefined;

    // Remove any potential PII fields
    const sanitized: Record<string, unknown> = {};
    const piiFields = ['email', 'name', 'phone', 'address', 'ssn', 'password', 'token', 'secret'];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (!piiFields.some((pii) => lowerKey.includes(pii))) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Singleton instance for app-wide usage
let instance: SignalCollector | null = null;

export function getSignalCollector(): SignalCollector {
  if (!instance) {
    instance = new SignalCollector();
  }
  return instance;
}

export function initSignalCollector(config: CollectorConfig): SignalCollector {
  instance = new SignalCollector(config);
  return instance;
}
