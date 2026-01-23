# Epic 14.1 Phase 3: Production Optimization Tasks

> **Status:** NOT STARTED  
> **Depends On:** Phase 2 (Pipeline Integration)  
> **Duration:** 5 days  
> **Token Budget:** 20K

---

## Overview

Phase 3 hardens the computational validator for production deployment with distributed caching, circuit breakers, cost alerting, and batch processing capabilities.

---

## Task 3.1: Redis Distributed Caching

**Time:** 6 hours | **Tokens:** ~5K

### Purpose
Replace in-memory caching with Redis for multi-instance deployments, ensuring cache consistency across horizontally scaled FORGE instances.

### Files to Create/Modify

```
validators/computational/
├── cache/
│   ├── index.ts               # NEW - Cache interface
│   ├── memory-cache.ts        # NEW - In-memory implementation
│   └── redis-cache.ts         # NEW - Redis implementation
├── computational-validator.ts # MODIFY - Use cache abstraction
└── wolfram-client.ts          # MODIFY - Use cache abstraction
```

### Implementation

```typescript
// validators/computational/cache/index.ts

/**
 * Cache abstraction for computational validation results
 * Supports both in-memory (dev) and Redis (production)
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  avgLatencyMs: number;
}

export interface IValidationCache {
  /** Get a cached validation result */
  get<T>(key: string): Promise<T | null>;
  
  /** Store a validation result */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  
  /** Delete a cached entry */
  delete(key: string): Promise<boolean>;
  
  /** Check if key exists */
  has(key: string): Promise<boolean>;
  
  /** Clear all entries */
  clear(): Promise<void>;
  
  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
  
  /** Health check */
  isHealthy(): Promise<boolean>;
}

export type CacheType = 'memory' | 'redis';

// validators/computational/cache/memory-cache.ts

import { IValidationCache, CacheEntry, CacheStats } from './index';

/**
 * In-memory LRU cache for development and single-instance deployments
 */
export class MemoryCache implements IValidationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
    avgLatencyMs: 0
  };
  private maxSize: number;
  private defaultTtlMs: number;
  private latencies: number[] = [];
  
  constructor(options?: { maxSize?: number; defaultTtlMs?: number }) {
    this.maxSize = options?.maxSize ?? 1000;
    this.defaultTtlMs = options?.defaultTtlMs ?? 3600000; // 1 hour
  }
  
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.recordLatency(Date.now() - start);
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      this.recordLatency(Date.now() - start);
      return null;
    }
    
    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    this.recordLatency(Date.now() - start);
    return entry.value as T;
  }
  
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const start = Date.now();
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
    
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      hits: 0
    };
    
    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    this.recordLatency(Date.now() - start);
  }
  
  async delete(key: string): Promise<boolean> {
    const existed = this.cache.delete(key);
    if (existed) this.stats.size--;
    return existed;
  }
  
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
  }
  
  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }
  
  async isHealthy(): Promise<boolean> {
    return true;
  }
  
  private recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 100) this.latencies.shift();
    this.stats.avgLatencyMs = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }
}

// validators/computational/cache/redis-cache.ts

import { createClient, RedisClientType } from 'redis';
import { IValidationCache, CacheStats } from './index';

/**
 * Redis-backed cache for production multi-instance deployments
 */
export class RedisCache implements IValidationCache {
  private client: RedisClientType;
  private prefix: string;
  private defaultTtlMs: number;
  private connected: boolean = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
    avgLatencyMs: 0
  };
  private latencies: number[] = [];
  
  constructor(options?: {
    url?: string;
    prefix?: string;
    defaultTtlMs?: number;
  }) {
    this.prefix = options?.prefix ?? 'forge:cv:';
    this.defaultTtlMs = options?.defaultTtlMs ?? 3600000;
    
    this.client = createClient({
      url: options?.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => {
      console.error('[RedisCache] Error:', err);
      this.connected = false;
    });
    
    this.client.on('connect', () => {
      console.log('[RedisCache] Connected');
      this.connected = true;
    });
  }
  
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }
  
  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    
    try {
      await this.connect();
      const data = await this.client.get(this.fullKey(key));
      
      if (!data) {
        this.stats.misses++;
        this.recordLatency(Date.now() - start);
        return null;
      }
      
      this.stats.hits++;
      this.recordLatency(Date.now() - start);
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[RedisCache] Get error:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const start = Date.now();
    
    try {
      await this.connect();
      const ttlSeconds = Math.ceil((ttlMs ?? this.defaultTtlMs) / 1000);
      
      await this.client.setEx(
        this.fullKey(key),
        ttlSeconds,
        JSON.stringify(value)
      );
      
      this.recordLatency(Date.now() - start);
    } catch (error) {
      console.error('[RedisCache] Set error:', error);
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.del(this.fullKey(key));
      return result > 0;
    } catch (error) {
      console.error('[RedisCache] Delete error:', error);
      return false;
    }
  }
  
  async has(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(this.fullKey(key));
      return result > 0;
    } catch (error) {
      return false;
    }
  }
  
  async clear(): Promise<void> {
    try {
      await this.connect();
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      this.stats.size = 0;
    } catch (error) {
      console.error('[RedisCache] Clear error:', error);
    }
  }
  
  async getStats(): Promise<CacheStats> {
    try {
      await this.connect();
      const keys = await this.client.keys(`${this.prefix}*`);
      this.stats.size = keys.length;
    } catch (error) {
      // Ignore
    }
    return { ...this.stats };
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      await this.connect();
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
  
  private recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 100) this.latencies.shift();
    this.stats.avgLatencyMs = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }
}

// Factory function
export function createCache(type: 'memory' | 'redis', options?: any): IValidationCache {
  if (type === 'redis') {
    return new RedisCache(options);
  }
  return new MemoryCache(options);
}
```

### Environment Configuration

```bash
# .env additions
FORGE_CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
FORGE_CACHE_PREFIX=forge:cv:
FORGE_CACHE_TTL_MS=3600000
```

### Verification

```bash
# Test in-memory cache
pnpm test -- --grep "MemoryCache"

# Test Redis cache (requires Redis running)
docker run -d -p 6379:6379 redis:alpine
pnpm test -- --grep "RedisCache"

# Integration test
pnpm test:integration -- --grep "cache-distributed"
```

### Done When
- [ ] Memory cache passes all tests
- [ ] Redis cache passes all tests
- [ ] Cache interface abstraction works
- [ ] Existing validators use new cache
- [ ] Cache stats exposed in metrics
- [ ] Health check endpoint includes cache

---

## Task 3.2: Circuit Breaker Pattern

**Time:** 4 hours | **Tokens:** ~4K

### Purpose
Implement circuit breaker pattern for Wolfram API to handle failures gracefully and prevent cascading failures.

### Files to Create/Modify

```
validators/computational/
├── resilience/
│   ├── circuit-breaker.ts     # NEW - Circuit breaker implementation
│   └── retry-policy.ts        # NEW - Retry with backoff
└── wolfram-client.ts          # MODIFY - Add circuit breaker
```

### Implementation

```typescript
// validators/computational/resilience/circuit-breaker.ts

/**
 * Circuit Breaker implementation for external API calls
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Failures before opening circuit */
  failureThreshold: number;
  /** Success count to close from half-open */
  successThreshold: number;
  /** Time to wait before testing (ms) */
  resetTimeout: number;
  /** Optional: time window for counting failures (ms) */
  failureWindow?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private lastStateChange: Date = new Date();
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private failureTimestamps: number[] = [];
  
  private config: CircuitBreakerConfig;
  private listeners: Map<string, ((state: CircuitState) => void)[]> = new Map();
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      resetTimeout: config?.resetTimeout ?? 30000, // 30 seconds
      failureWindow: config?.failureWindow ?? 60000, // 1 minute
    };
  }
  
  /**
   * Check if call is allowed
   */
  canExecute(): boolean {
    this.cleanOldFailures();
    
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      const timeSinceLastFailure = this.lastFailure 
        ? Date.now() - this.lastFailure.getTime() 
        : Infinity;
      
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        this.transitionTo('HALF_OPEN');
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - allow limited calls
    return true;
  }
  
  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.totalCalls++;
    this.totalSuccesses++;
    this.lastSuccess = new Date();
    this.successes++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
    
    if (this.state === 'CLOSED') {
      this.failures = 0;
      this.failureTimestamps = [];
    }
  }
  
  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.totalCalls++;
    this.totalFailures++;
    this.lastFailure = new Date();
    this.failures++;
    this.failureTimestamps.push(Date.now());
    this.successes = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
      return;
    }
    
    if (this.state === 'CLOSED') {
      this.cleanOldFailures();
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN. Reset in ${this.getTimeUntilReset()}ms`
      );
    }
    
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get detailed stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }
  
  /**
   * Get time until circuit might close (ms)
   */
  getTimeUntilReset(): number {
    if (this.state !== 'OPEN' || !this.lastFailure) {
      return 0;
    }
    const elapsed = Date.now() - this.lastFailure.getTime();
    return Math.max(0, this.config.resetTimeout - elapsed);
  }
  
  /**
   * Manual reset (for admin/testing)
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.transitionTo('CLOSED');
  }
  
  /**
   * Add state change listener
   */
  onStateChange(listener: (state: CircuitState) => void): () => void {
    const key = Math.random().toString(36);
    this.listeners.set(key, [...(this.listeners.get(key) ?? []), listener]);
    return () => this.listeners.delete(key);
  }
  
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();
    
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.failureTimestamps = [];
    }
    
    console.log(`[CircuitBreaker] ${oldState} → ${newState}`);
    
    // Notify listeners
    this.listeners.forEach(listeners => {
      listeners.forEach(listener => listener(newState));
    });
  }
  
  private cleanOldFailures(): void {
    if (!this.config.failureWindow) return;
    
    const cutoff = Date.now() - this.config.failureWindow;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);
    this.failures = this.failureTimestamps.length;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// validators/computational/resilience/retry-policy.ts

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Exponential backoff retry with jitter
 */
export class RetryPolicy {
  private config: RetryConfig;
  
  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      retryableErrors: config?.retryableErrors ?? [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'RATE_LIMIT',
        'SERVICE_UNAVAILABLE'
      ]
    };
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(lastError) || attempt === this.config.maxRetries) {
          throw lastError;
        }
        
        const delay = this.calculateDelay(attempt);
        console.log(`[RetryPolicy] Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  private isRetryable(error: Error): boolean {
    const errorCode = (error as any).code || error.message;
    return this.config.retryableErrors!.some(
      code => errorCode.includes(code)
    );
  }
  
  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelayMs * 
      Math.pow(this.config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Verification

```bash
# Test circuit breaker
pnpm test -- --grep "CircuitBreaker"

# Test retry policy
pnpm test -- --grep "RetryPolicy"

# Integration test with mocked failures
pnpm test:integration -- --grep "resilience"
```

### Done When
- [ ] Circuit breaker states transition correctly
- [ ] Retry policy with exponential backoff works
- [ ] Wolfram client uses circuit breaker
- [ ] Stats exposed in metrics
- [ ] Manual reset endpoint works

---

## Task 3.3: Cost Alerting System

**Time:** 4 hours | **Tokens:** ~4K

### Purpose
Implement proactive alerting when Wolfram API usage approaches thresholds, with Slack and email notifications.

### Files to Create/Modify

```
validators/computational/
├── alerts/
│   ├── alert-manager.ts       # NEW - Alert orchestration
│   ├── slack-notifier.ts      # NEW - Slack integration
│   └── email-notifier.ts      # NEW - Email integration
└── metrics.ts                 # MODIFY - Integrate alerts
```

### Implementation

```typescript
// validators/computational/alerts/alert-manager.ts

/**
 * Alert manager for computational validation cost and health monitoring
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'console';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldownMs: number;
  messageTemplate: (metrics: any) => string;
}

export interface Notifier {
  send(alert: Alert): Promise<void>;
  isHealthy(): Promise<boolean>;
}

class AlertManager {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private notifiers: Map<AlertChannel, Notifier> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  /**
   * Register a notifier for a channel
   */
  registerNotifier(channel: AlertChannel, notifier: Notifier): void {
    this.notifiers.set(channel, notifier);
  }
  
  /**
   * Add a custom alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Evaluate all rules against current metrics
   */
  async evaluate(metrics: any): Promise<void> {
    for (const rule of this.rules) {
      try {
        if (rule.condition(metrics)) {
          await this.fireAlert(rule, metrics);
        }
      } catch (error) {
        console.error(`[AlertManager] Error evaluating rule ${rule.id}:`, error);
      }
    }
  }
  
  /**
   * Fire an alert
   */
  private async fireAlert(rule: AlertRule, metrics: any): Promise<void> {
    // Check cooldown
    const lastTime = this.lastAlertTime.get(rule.id) ?? 0;
    if (Date.now() - lastTime < rule.cooldownMs) {
      return;
    }
    
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      severity: rule.severity,
      type: rule.id,
      title: rule.name,
      message: rule.messageTemplate(metrics),
      timestamp: new Date(),
      metadata: { metrics },
      acknowledged: false
    };
    
    this.alerts.push(alert);
    this.lastAlertTime.set(rule.id, Date.now());
    
    // Send to channels
    for (const channel of rule.channels) {
      const notifier = this.notifiers.get(channel);
      if (notifier) {
        try {
          await notifier.send(alert);
        } catch (error) {
          console.error(`[AlertManager] Failed to send to ${channel}:`, error);
        }
      }
    }
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }
  
  /**
   * Get active (unacknowledged) alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }
  
  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }
  
  /**
   * Initialize default FORGE alert rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // Daily budget warning (80%)
      {
        id: 'daily-budget-warning',
        name: 'Daily Budget Warning',
        condition: (m) => m.budget?.dailyRemaining <= m.budget?.dailyLimit * 0.2,
        severity: 'warning',
        channels: ['slack', 'console'],
        cooldownMs: 3600000, // 1 hour
        messageTemplate: (m) => 
          `⚠️ Daily Wolfram budget at ${Math.round((1 - m.budget.dailyRemaining / m.budget.dailyLimit) * 100)}%. ` +
          `${m.budget.dailyRemaining} queries remaining today.`
      },
      
      // Daily budget critical (95%)
      {
        id: 'daily-budget-critical',
        name: 'Daily Budget Critical',
        condition: (m) => m.budget?.dailyRemaining <= m.budget?.dailyLimit * 0.05,
        severity: 'critical',
        channels: ['slack', 'email', 'console'],
        cooldownMs: 1800000, // 30 minutes
        messageTemplate: (m) => 
          `🚨 CRITICAL: Daily Wolfram budget nearly exhausted! ` +
          `Only ${m.budget.dailyRemaining} queries remaining. ` +
          `Validation will degrade to L1-only mode.`
      },
      
      // Monthly budget warning (70%)
      {
        id: 'monthly-budget-warning',
        name: 'Monthly Budget Warning',
        condition: (m) => m.budget?.monthlyRemaining <= m.budget?.monthlyLimit * 0.3,
        severity: 'warning',
        channels: ['slack'],
        cooldownMs: 86400000, // 24 hours
        messageTemplate: (m) => 
          `⚠️ Monthly Wolfram budget at ${Math.round((1 - m.budget.monthlyRemaining / m.budget.monthlyLimit) * 100)}%. ` +
          `${m.budget.monthlyRemaining} queries remaining this month.`
      },
      
      // High error rate
      {
        id: 'high-error-rate',
        name: 'High Validation Error Rate',
        condition: (m) => {
          const total = m.counters?.claimsValidated ?? 0;
          const invalid = m.counters?.claimsInvalid ?? 0;
          return total > 10 && (invalid / total) > 0.3;
        },
        severity: 'warning',
        channels: ['slack', 'console'],
        cooldownMs: 3600000,
        messageTemplate: (m) => {
          const rate = Math.round((m.counters.claimsInvalid / m.counters.claimsValidated) * 100);
          return `⚠️ High validation error rate: ${rate}% of claims invalid. ` +
            `Review recent agent outputs for systematic errors.`;
        }
      },
      
      // Wolfram API failures
      {
        id: 'wolfram-failures',
        name: 'Wolfram API Failures',
        condition: (m) => (m.counters?.wolframFailures ?? 0) > 5,
        severity: 'critical',
        channels: ['slack', 'email', 'console'],
        cooldownMs: 1800000,
        messageTemplate: (m) => 
          `🚨 Wolfram API experiencing failures (${m.counters.wolframFailures} in current period). ` +
          `Circuit breaker may activate. Check API status.`
      },
      
      // Cache degradation
      {
        id: 'cache-degradation',
        name: 'Cache Hit Rate Low',
        condition: (m) => {
          const hits = m.counters?.cacheHits ?? 0;
          const misses = m.counters?.cacheMisses ?? 0;
          const total = hits + misses;
          return total > 20 && (hits / total) < 0.5;
        },
        severity: 'info',
        channels: ['console'],
        cooldownMs: 7200000, // 2 hours
        messageTemplate: (m) => {
          const hits = m.counters.cacheHits;
          const misses = m.counters.cacheMisses;
          const rate = Math.round((hits / (hits + misses)) * 100);
          return `ℹ️ Cache hit rate low: ${rate}%. Consider increasing TTL or cache size.`;
        }
      }
    ];
  }
}

export const alertManager = new AlertManager();

// validators/computational/alerts/slack-notifier.ts

import { Alert, Notifier } from './alert-manager';

/**
 * Slack webhook notifier
 */
export class SlackNotifier implements Notifier {
  private webhookUrl: string;
  private channel?: string;
  
  constructor(options: { webhookUrl: string; channel?: string }) {
    this.webhookUrl = options.webhookUrl;
    this.channel = options.channel;
  }
  
  async send(alert: Alert): Promise<void> {
    const color = {
      info: '#36a64f',
      warning: '#ffa500',
      critical: '#ff0000'
    }[alert.severity];
    
    const payload = {
      channel: this.channel,
      attachments: [{
        color,
        title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        text: alert.message,
        fields: [
          { title: 'Alert ID', value: alert.id, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true }
        ],
        footer: 'FORGE Computational Validator',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };
    
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }
  
  async isHealthy(): Promise<boolean> {
    return !!this.webhookUrl;
  }
}

// validators/computational/alerts/email-notifier.ts

import { Alert, Notifier } from './alert-manager';

/**
 * Email notifier (using SendGrid or similar)
 */
export class EmailNotifier implements Notifier {
  private apiKey: string;
  private fromEmail: string;
  private toEmails: string[];
  
  constructor(options: {
    apiKey: string;
    fromEmail: string;
    toEmails: string[];
  }) {
    this.apiKey = options.apiKey;
    this.fromEmail = options.fromEmail;
    this.toEmails = options.toEmails;
  }
  
  async send(alert: Alert): Promise<void> {
    const subject = `[FORGE ${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = `
      <h2>${alert.title}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
      <p>${alert.message}</p>
      <hr>
      <p><small>Alert ID: ${alert.id}</small></p>
    `;
    
    // SendGrid API call
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: this.toEmails.map(email => ({ email }))
        }],
        from: { email: this.fromEmail },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`SendGrid failed: ${response.status}`);
    }
  }
  
  async isHealthy(): Promise<boolean> {
    return !!this.apiKey;
  }
}
```

### Environment Configuration

```bash
# .env additions
FORGE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
FORGE_SLACK_CHANNEL=#forge-alerts
SENDGRID_API_KEY=SG.xxxxx
FORGE_ALERT_FROM_EMAIL=alerts@arcfoundry.ai
FORGE_ALERT_TO_EMAILS=joe@arcfoundry.ai,team@arcfoundry.ai
```

### Verification

```bash
# Test alert rules
pnpm test -- --grep "AlertManager"

# Test Slack notifier (with mock)
pnpm test -- --grep "SlackNotifier"

# Manual test
curl -X POST http://localhost:3000/api/forge/computational/alerts/test
```

### Done When
- [ ] Alert rules evaluate correctly
- [ ] Slack notifications work
- [ ] Email notifications work
- [ ] Cooldown prevents spam
- [ ] Acknowledge API works
- [ ] Alert history persisted

---

## Task 3.4: Batch Validation

**Time:** 4 hours | **Tokens:** ~4K

### Purpose
Implement parallel batch validation for processing multiple claims efficiently while respecting rate limits.

### Files to Create/Modify

```
validators/computational/
├── batch/
│   ├── batch-processor.ts     # NEW - Batch orchestration
│   └── parallel-executor.ts   # NEW - Concurrent execution
└── computational-validator.ts # MODIFY - Add batch methods
```

### Implementation

```typescript
// validators/computational/batch/batch-processor.ts

import { ComputationalClaim, ValidationResult, ValidationReport } from '../types';
import { ComputationalValidator } from '../computational-validator';

export interface BatchConfig {
  /** Max concurrent validations */
  concurrency: number;
  /** Max claims per batch */
  batchSize: number;
  /** Timeout per claim (ms) */
  claimTimeoutMs: number;
  /** Total batch timeout (ms) */
  batchTimeoutMs: number;
  /** Continue on individual failures */
  continueOnError: boolean;
  /** Priority queue (critical claims first) */
  prioritize: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentComplete: number;
  estimatedTimeRemainingMs: number;
}

export interface BatchResult {
  batchId: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  claims: ValidationResult[];
  errors: BatchError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    failed: number;
    avgLatencyMs: number;
  };
}

export interface BatchError {
  claimId: string;
  error: string;
  timestamp: Date;
}

type ProgressCallback = (progress: BatchProgress) => void;

/**
 * Batch processor for validating multiple claims concurrently
 */
export class BatchProcessor {
  private validator: ComputationalValidator;
  private config: BatchConfig;
  
  constructor(validator: ComputationalValidator, config?: Partial<BatchConfig>) {
    this.validator = validator;
    this.config = {
      concurrency: config?.concurrency ?? 5,
      batchSize: config?.batchSize ?? 100,
      claimTimeoutMs: config?.claimTimeoutMs ?? 10000,
      batchTimeoutMs: config?.batchTimeoutMs ?? 300000, // 5 minutes
      continueOnError: config?.continueOnError ?? true,
      prioritize: config?.prioritize ?? true
    };
  }
  
  /**
   * Process a batch of claims with progress reporting
   */
  async processBatch(
    claims: ComputationalClaim[],
    onProgress?: ProgressCallback
  ): Promise<BatchResult> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = new Date();
    const results: ValidationResult[] = [];
    const errors: BatchError[] = [];
    let completedCount = 0;
    const latencies: number[] = [];
    
    // Prioritize if enabled (critical claims first)
    const orderedClaims = this.config.prioritize 
      ? this.prioritizeClaims(claims)
      : claims;
    
    // Split into batches
    const batches = this.chunkArray(orderedClaims, this.config.batchSize);
    
    for (const batch of batches) {
      // Process batch with concurrency limit
      const batchResults = await this.processWithConcurrency(
        batch,
        async (claim) => {
          const claimStart = Date.now();
          try {
            const result = await this.withTimeout(
              this.validator.validateClaim(claim),
              this.config.claimTimeoutMs
            );
            latencies.push(Date.now() - claimStart);
            return result;
          } catch (error) {
            if (!this.config.continueOnError) throw error;
            errors.push({
              claimId: claim.id,
              error: (error as Error).message,
              timestamp: new Date()
            });
            return null;
          } finally {
            completedCount++;
            onProgress?.({
              total: claims.length,
              completed: completedCount,
              failed: errors.length,
              pending: claims.length - completedCount,
              percentComplete: Math.round((completedCount / claims.length) * 100),
              estimatedTimeRemainingMs: this.estimateTimeRemaining(
                completedCount,
                claims.length,
                latencies
              )
            });
          }
        },
        this.config.concurrency
      );
      
      results.push(...batchResults.filter((r): r is ValidationResult => r !== null));
    }
    
    const endTime = new Date();
    
    return {
      batchId,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      claims: results,
      errors,
      summary: {
        total: claims.length,
        valid: results.filter(r => r.status === 'VALID').length,
        invalid: results.filter(r => r.status === 'INVALID').length,
        failed: errors.length,
        avgLatencyMs: latencies.length > 0 
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
          : 0
      }
    };
  }
  
  /**
   * Process items with concurrency limit
   */
  private async processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];
    
    for (const item of items) {
      const promise = processor(item).then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const p = executing[i];
          // Check if promise is settled
          await Promise.race([p, Promise.resolve()]).then(() => {
            executing.splice(i, 1);
          }).catch(() => {
            executing.splice(i, 1);
          });
        }
      }
    }
    
    await Promise.all(executing);
    return results;
  }
  
  /**
   * Add timeout to a promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  
  /**
   * Prioritize claims (critical categories first)
   */
  private prioritizeClaims(claims: ComputationalClaim[]): ComputationalClaim[] {
    const priority: Record<string, number> = {
      'financial': 1,
      'defense': 1,
      'evm': 2,
      'statistical': 3,
      'conversion': 4,
      'generic': 5
    };
    
    return [...claims].sort((a, b) => {
      const aPriority = priority[(a as any).category] ?? 5;
      const bPriority = priority[(b as any).category] ?? 5;
      return aPriority - bPriority;
    });
  }
  
  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Estimate remaining time based on current progress
   */
  private estimateTimeRemaining(
    completed: number,
    total: number,
    latencies: number[]
  ): number {
    if (completed === 0 || latencies.length === 0) return 0;
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const remaining = total - completed;
    
    // Adjust for concurrency
    return Math.round((remaining * avgLatency) / this.config.concurrency);
  }
}

// Add to computational-validator.ts

export class ComputationalValidator {
  // ... existing code ...
  
  /**
   * Validate claims in batch with progress reporting
   */
  async validateBatch(
    claims: ComputationalClaim[],
    options?: {
      onProgress?: (progress: BatchProgress) => void;
      concurrency?: number;
    }
  ): Promise<BatchResult> {
    const processor = new BatchProcessor(this, {
      concurrency: options?.concurrency ?? 5
    });
    return processor.processBatch(claims, options?.onProgress);
  }
  
  /**
   * Validate text in batch (for large documents)
   */
  async validateTextBatch(
    text: string,
    options?: {
      onProgress?: (progress: BatchProgress) => void;
    }
  ): Promise<BatchResult> {
    const claims = detectComputationalClaims(text);
    return this.validateBatch(claims, options);
  }
}
```

### Verification

```bash
# Test batch processor
pnpm test -- --grep "BatchProcessor"

# Load test with 100 claims
pnpm test:load -- --claims=100 --concurrency=5

# Integration test
pnpm test:integration -- --grep "batch-validation"
```

### Done When
- [ ] Batch processing works with concurrency limit
- [ ] Progress reporting accurate
- [ ] Timeout handling works
- [ ] Priority queue orders claims correctly
- [ ] Errors don't stop batch (continueOnError)
- [ ] Memory usage stable for large batches

---

## Phase 3 Completion Checklist

- [ ] Task 3.1: Redis distributed caching
- [ ] Task 3.2: Circuit breaker pattern
- [ ] Task 3.3: Cost alerting system
- [ ] Task 3.4: Batch validation
- [ ] All tests passing (>90% coverage)
- [ ] Production deployment tested
- [ ] Documentation updated
- [ ] Operations runbook complete

**Epic 14.1 Complete When:**
- All Phase 1, 2, 3 tasks done
- 97% confidence gate met
- All CA-01 through CA-12 criteria verified

**Next:** Epic 14.2 - Semantic Accuracy Layer (L2)
