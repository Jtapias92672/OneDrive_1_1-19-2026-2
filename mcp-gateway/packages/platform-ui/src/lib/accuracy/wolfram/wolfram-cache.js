/**
 * Wolfram Result Cache
 * Epic 14: In-memory cache with TTL (Redis-ready interface)
 */
export class WolframCache {
    cache = new Map();
    ttl;
    constructor(ttlSeconds = 86400) {
        // Default 24 hours
        this.ttl = ttlSeconds * 1000;
    }
    /**
     * Generate cache key from query
     */
    getCacheKey(query) {
        // Simple hash for cache key
        const normalized = query.toLowerCase().trim();
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `wolfram:${Math.abs(hash).toString(16)}`;
    }
    /**
     * Get cached result
     */
    async get(query) {
        const key = this.getCacheKey(query);
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    /**
     * Set cached result
     */
    async set(query, result, ttlOverride) {
        const key = this.getCacheKey(query);
        const ttl = ttlOverride ? ttlOverride * 1000 : this.ttl;
        this.cache.set(key, {
            value: result,
            expiresAt: Date.now() + ttl,
        });
    }
    /**
     * Delete cached result
     */
    async delete(query) {
        const key = this.getCacheKey(query);
        return this.cache.delete(key);
    }
    /**
     * Check if query is cached
     */
    async has(query) {
        const result = await this.get(query);
        return result !== null;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        // Clean expired entries
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
        return {
            size: this.cache.size,
            hitRate: 0, // Would track in production
        };
    }
    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Reset cache (for testing)
     */
    reset() {
        this.clear();
    }
}
// Singleton instance
export const wolframCache = new WolframCache();
