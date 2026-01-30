/**
 * Wolfram Result Cache
 * Epic 14: In-memory cache with TTL (Redis-ready interface)
 */
import { WolframResult } from './types';
export declare class WolframCache {
    private cache;
    private ttl;
    constructor(ttlSeconds?: number);
    /**
     * Generate cache key from query
     */
    private getCacheKey;
    /**
     * Get cached result
     */
    get(query: string): Promise<WolframResult | null>;
    /**
     * Set cached result
     */
    set(query: string, result: WolframResult, ttlOverride?: number): Promise<void>;
    /**
     * Delete cached result
     */
    delete(query: string): Promise<boolean>;
    /**
     * Check if query is cached
     */
    has(query: string): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hitRate: number;
    };
    /**
     * Clear all cached entries
     */
    clear(): void;
    /**
     * Reset cache (for testing)
     */
    reset(): void;
}
export declare const wolframCache: WolframCache;
