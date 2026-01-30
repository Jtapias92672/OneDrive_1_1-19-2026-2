/**
 * Rate Limiter for Wolfram API
 * Epic 14: Computational Accuracy Layer
 */
export class RateLimiter {
    config;
    minuteTokens;
    monthTokens;
    lastMinuteReset;
    currentMonth;
    constructor(config) {
        this.config = config;
        this.minuteTokens = config.requestsPerMinute;
        this.monthTokens = config.requestsPerMonth;
        this.lastMinuteReset = Date.now();
        this.currentMonth = new Date().getMonth();
    }
    /**
     * Acquire a token (blocking until available or throws if monthly limit reached)
     */
    async acquire() {
        this.refillTokens();
        if (this.monthTokens <= 0) {
            throw new Error('Monthly rate limit exceeded');
        }
        if (this.minuteTokens <= 0) {
            // Wait for minute reset
            const waitTime = 60000 - (Date.now() - this.lastMinuteReset);
            if (waitTime > 0) {
                await this.sleep(waitTime);
                this.refillTokens();
            }
        }
        this.minuteTokens--;
        this.monthTokens--;
    }
    /**
     * Check if request can be made without blocking
     */
    canAcquire() {
        this.refillTokens();
        return this.minuteTokens > 0 && this.monthTokens > 0;
    }
    /**
     * Get current rate limit status
     */
    getStatus() {
        this.refillTokens();
        return {
            minuteRemaining: this.minuteTokens,
            monthRemaining: this.monthTokens,
        };
    }
    /**
     * Refill tokens based on elapsed time
     */
    refillTokens() {
        const now = Date.now();
        // Reset minute tokens if a minute has passed
        if (now - this.lastMinuteReset >= 60000) {
            this.minuteTokens = this.config.requestsPerMinute;
            this.lastMinuteReset = now;
        }
        // Reset month tokens if new month
        const currentMonth = new Date().getMonth();
        if (currentMonth !== this.currentMonth) {
            this.monthTokens = this.config.requestsPerMonth;
            this.currentMonth = currentMonth;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Reset limits (for testing)
     */
    reset() {
        this.minuteTokens = this.config.requestsPerMinute;
        this.monthTokens = this.config.requestsPerMonth;
        this.lastMinuteReset = Date.now();
        this.currentMonth = new Date().getMonth();
    }
}
