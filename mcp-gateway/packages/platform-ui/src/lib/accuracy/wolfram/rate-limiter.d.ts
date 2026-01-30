/**
 * Rate Limiter for Wolfram API
 * Epic 14: Computational Accuracy Layer
 */
import { RateLimiterConfig } from './types';
export declare class RateLimiter {
    private config;
    private minuteTokens;
    private monthTokens;
    private lastMinuteReset;
    private currentMonth;
    constructor(config: RateLimiterConfig);
    /**
     * Acquire a token (blocking until available or throws if monthly limit reached)
     */
    acquire(): Promise<void>;
    /**
     * Check if request can be made without blocking
     */
    canAcquire(): boolean;
    /**
     * Get current rate limit status
     */
    getStatus(): {
        minuteRemaining: number;
        monthRemaining: number;
    };
    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens;
    private sleep;
    /**
     * Reset limits (for testing)
     */
    reset(): void;
}
