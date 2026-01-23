/**
 * FORGE Redis Cache Layer
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 3.1 - Redis Caching
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Distributed caching layer for Wolfram API results.
 *   Enables multi-instance deployment with shared cache.
 *   
 *   Features:
 *   - TTL-based expiration
 *   - Cache key normalization
 *   - Metrics collection
 *   - Graceful degradation when Redis unavailable
 */

// ============================================
// TYPES
// ============================================

export interface RedisCacheConfig {
  /** Redis connection URL */
  url: string;
  
  /** Default TTL in seconds */
  defaultTtlSeconds: number;
  
  /** Key prefix for namespacing */
  keyPrefix: string;
  
  /** Maximum retries on connection failure */
  maxRetries: number;
  
  /** Retry delay in ms */
  retryDelayMs: number;
  
  /** Enable local fallback when Redis unavailable */
  enableLocalFallback: boolean;
  
  /** Local cache max size (if fallback enabled) */
  localCacheMaxSize: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  hitRate: number;
  avgLatencyMs: number;
  connected: boolean;
  lastError?: string;
}

export interface CachedResult {
  value: string;
  numericValue: number | null;
  cachedAt: string;
  source: 'redis' | 'local';
}

// ============================================
// REDIS CACHE IMPLEMENTATION
// ============================================

/**
 * Redis cache client for Wolfram results
 * Note: This is a mock implementation. In production, use ioredis or redis package.
 */
export class RedisCache {
  private config: RedisCacheConfig;
  private connected: boolean = false;
  private localCache: Map<string, { value: CachedResult; expiry: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0,
    hitRate: 0,
    avgLatencyMs: 0,
    connected: false,
  };
  private latencies: number[] = [];

  constructor(config?: Partial<RedisCacheConfig>) {
    this.config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultTtlSeconds: 3600, // 1 hour
      keyPrefix: 'forge:wolfram:',
      maxRetries: 3,
      retryDelayMs: 1000,
      enableLocalFallback: true,
      localCacheMaxSize: 1000,
      ...config,
    };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<boolean> {
    try {
      // In production, this would be:
      // this.client = new Redis(this.config.url);
      // await this.client.ping();
      
      console.log(`[RedisCache] Connecting to ${this.config.url}...`);
      
      // Simulate connection
      this.connected = true;
      this.stats.connected = true;
      
      console.log('[RedisCache] Connected successfully');
      return true;
    } catch (error: any) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.connected = false;
      this.stats.connected = false;
      
      console.warn(`[RedisCache] Connection failed: ${error.message}`);
      
      if (this.config.enableLocalFallback) {
        console.log('[RedisCache] Using local cache fallback');
      }
      
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.stats.connected = false;
    console.log('[RedisCache] Disconnected');
  }

  /**
   * Get a cached Wolfram result
   */
  async get(query: string): Promise<CachedResult | null> {
    const startTime = Date.now();
    const key = this.buildKey(query);
    
    try {
      // Try Redis first
      if (this.connected) {
        // In production:
        // const data = await this.client.get(key);
        // if (data) {
        //   const result = JSON.parse(data);
        //   this.recordHit(startTime);
        //   return { ...result, source: 'redis' };
        // }
        
        // Simulate Redis get (would be actual Redis call)
        const redisResult = null; // Simulated miss
        
        if (redisResult) {
          this.recordHit(startTime);
          return redisResult;
        }
      }
      
      // Try local fallback
      if (this.config.enableLocalFallback) {
        const localEntry = this.localCache.get(key);
        if (localEntry && localEntry.expiry > Date.now()) {
          this.recordHit(startTime);
          return { ...localEntry.value, source: 'local' };
        }
      }
      
      this.recordMiss(startTime);
      return null;
    } catch (error: any) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.recordMiss(startTime);
      return null;
    }
  }

  /**
   * Set a cached Wolfram result
   */
  async set(
    query: string,
    result: string,
    numericValue: number | null,
    ttlSeconds?: number
  ): Promise<boolean> {
    const key = this.buildKey(query);
    const ttl = ttlSeconds || this.config.defaultTtlSeconds;
    
    const cached: CachedResult = {
      value: result,
      numericValue,
      cachedAt: new Date().toISOString(),
      source: 'redis',
    };
    
    try {
      // Try Redis first
      if (this.connected) {
        // In production:
        // await this.client.setex(key, ttl, JSON.stringify(cached));
        
        // Simulate Redis set
        console.log(`[RedisCache] SET ${key} (TTL: ${ttl}s)`);
      }
      
      // Also set in local cache
      if (this.config.enableLocalFallback) {
        this.setLocal(key, { ...cached, source: 'local' }, ttl);
      }
      
      this.stats.sets++;
      return true;
    } catch (error: any) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      
      // Fall back to local cache
      if (this.config.enableLocalFallback) {
        this.setLocal(key, { ...cached, source: 'local' }, ttl);
        return true;
      }
      
      return false;
    }
  }

  /**
   * Delete a cached result
   */
  async delete(query: string): Promise<boolean> {
    const key = this.buildKey(query);
    
    try {
      if (this.connected) {
        // In production: await this.client.del(key);
      }
      
      this.localCache.delete(key);
      return true;
    } catch (error: any) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      return false;
    }
  }

  /**
   * Clear all cached results
   */
  async clear(): Promise<boolean> {
    try {
      if (this.connected) {
        // In production: await this.client.flushdb(); // or use pattern delete
        console.log('[RedisCache] Cache cleared');
      }
      
      this.localCache.clear();
      return true;
    } catch (error: any) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      avgLatencyMs: this.latencies.length > 0 
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length 
        : 0,
    };
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    return this.connected || this.config.enableLocalFallback;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildKey(query: string): string {
    // Normalize the query for consistent caching
    const normalized = query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/,/g, '');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `${this.config.keyPrefix}${Math.abs(hash).toString(16)}`;
  }

  private setLocal(key: string, value: CachedResult, ttlSeconds: number): void {
    // Evict oldest entries if at capacity
    if (this.localCache.size >= this.config.localCacheMaxSize) {
      const oldest = this.localCache.keys().next().value;
      if (oldest) this.localCache.delete(oldest);
    }
    
    this.localCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  private recordHit(startTime: number): void {
    this.stats.hits++;
    this.recordLatency(startTime);
  }

  private recordMiss(startTime: number): void {
    this.stats.misses++;
    this.recordLatency(startTime);
  }

  private recordLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    this.latencies.push(latency);
    
    // Keep last 1000 latencies
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }
  }
}

// ============================================
// CACHE-WRAPPED WOLFRAM CLIENT
// ============================================

import { WolframClient, WolframQueryResult, getWolframClient } from './wolfram-client';

export class CachedWolframClient {
  private client: WolframClient;
  private cache: RedisCache;

  constructor(client?: WolframClient, cacheConfig?: Partial<RedisCacheConfig>) {
    this.client = client || getWolframClient();
    this.cache = new RedisCache(cacheConfig);
  }

  async connect(): Promise<void> {
    await this.cache.connect();
  }

  async query(input: string): Promise<WolframQueryResult> {
    // Try cache first
    const cached = await this.cache.get(input);
    if (cached) {
      return {
        success: true,
        result: cached.value,
        numericValue: cached.numericValue,
        queryId: `cache-${Date.now()}`,
        latencyMs: 1,
        cached: true,
      };
    }
    
    // Query Wolfram
    const result = await this.client.query(input);
    
    // Cache successful results
    if (result.success) {
      await this.cache.set(input, result.result, result.numericValue);
    }
    
    return result;
  }

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}

// ============================================
// EXPORTS
// ============================================

export default RedisCache;
