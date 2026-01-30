/**
 * Wolfram Alpha Client
 * Epic 14: Computational Accuracy Layer
 */
import { WolframConfig, WolframResult, WolframQueryOptions } from './types.js';
import { WolframCache } from './wolfram-cache.js';
import { DetectedClaim } from '../claims/types.js';
export declare class WolframClient {
    private config;
    private rateLimiter;
    private cache;
    private queryFormatter;
    private enabled;
    constructor(config?: Partial<WolframConfig>, cache?: WolframCache);
    /**
     * Check if client is configured
     */
    isEnabled(): boolean;
    /**
     * Query Wolfram Alpha with a raw string
     */
    query(input: string, options?: WolframQueryOptions): Promise<WolframResult>;
    /**
     * Query Wolfram Alpha for a detected claim
     */
    validateClaim(claim: DetectedClaim): Promise<WolframResult>;
    /**
     * Make HTTP request to Wolfram Alpha
     */
    private makeRequest;
    /**
     * Parse Wolfram LLM API text response
     */
    private parseTextResponse;
    /**
     * Get mock result when API is not configured
     */
    private getMockResult;
    /**
     * Get rate limiter status
     */
    getRateLimitStatus(): {
        minuteRemaining: number;
        monthRemaining: number;
    };
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    /**
     * Reset for testing
     */
    reset(): void;
    private sleep;
}
export declare const wolframClient: WolframClient;
