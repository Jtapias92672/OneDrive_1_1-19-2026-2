/**
 * Rate Limiter for Wolfram API
 * Epic 14: Computational Accuracy Layer
 */

import { RateLimiterConfig } from './types';

export class RateLimiter {
  private minuteTokens: number;
  private monthTokens: number;
  private lastMinuteReset: number;
  private currentMonth: number;

  constructor(private config: RateLimiterConfig) {
    this.minuteTokens = config.requestsPerMinute;
    this.monthTokens = config.requestsPerMonth;
    this.lastMinuteReset = Date.now();
    this.currentMonth = new Date().getMonth();
  }

  /**
   * Acquire a token (blocking until available or throws if monthly limit reached)
   */
  async acquire(): Promise<void> {
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
  canAcquire(): boolean {
    this.refillTokens();
    return this.minuteTokens > 0 && this.monthTokens > 0;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { minuteRemaining: number; monthRemaining: number } {
    this.refillTokens();
    return {
      minuteRemaining: this.minuteTokens,
      monthRemaining: this.monthTokens,
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset limits (for testing)
   */
  reset(): void {
    this.minuteTokens = this.config.requestsPerMinute;
    this.monthTokens = this.config.requestsPerMonth;
    this.lastMinuteReset = Date.now();
    this.currentMonth = new Date().getMonth();
  }
}
