/**
 * Error Recovery E2E Tests
 * Epic 12: Tests for error handling, retry logic, and resilience
 */

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  errors: string[];
  totalDuration: number;
}

/**
 * Retry handler with exponential backoff
 */
class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      backoffMs: config.backoffMs || 100,
      backoffMultiplier: config.backoffMultiplier || 2,
      maxBackoffMs: config.maxBackoffMs || 5000,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const errors: string[] = [];
    const startTime = Date.now();
    let attempts = 0;
    let currentBackoff = this.config.backoffMs;

    while (attempts < this.config.maxAttempts) {
      attempts++;

      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts,
          errors,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Attempt ${attempts}: ${errorMessage}`);

        if (attempts < this.config.maxAttempts) {
          await this.delay(currentBackoff);
          currentBackoff = Math.min(
            currentBackoff * this.config.backoffMultiplier,
            this.config.maxBackoffMs
          );
        }
      }
    }

    return {
      success: false,
      attempts,
      errors,
      totalDuration: Date.now() - startTime,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker for preventing cascade failures
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeMs: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldReset(): boolean {
    if (!this.lastFailure) return true;
    return Date.now() - this.lastFailure.getTime() >= this.resetTimeMs;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Error categorizer for different failure types
 */
class ErrorCategorizer {
  static categorize(error: Error): {
    category: 'transient' | 'permanent' | 'unknown';
    retryable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const message = error.message.toLowerCase();

    // Transient errors (retryable)
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('temporary') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('502')
    ) {
      return { category: 'transient', retryable: true, severity: 'medium' };
    }

    // Permanent errors (not retryable)
    if (
      message.includes('invalid') ||
      message.includes('not found') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404')
    ) {
      return { category: 'permanent', retryable: false, severity: 'high' };
    }

    return { category: 'unknown', retryable: true, severity: 'medium' };
  }
}

/**
 * Fallback handler for graceful degradation
 */
class FallbackHandler<T> {
  private fallbacks: Array<() => Promise<T>> = [];

  addFallback(fallback: () => Promise<T>): this {
    this.fallbacks.push(fallback);
    return this;
  }

  async execute(primary: () => Promise<T>): Promise<{ result: T; usedFallback: boolean; fallbackIndex?: number }> {
    try {
      const result = await primary();
      return { result, usedFallback: false };
    } catch (primaryError) {
      for (let i = 0; i < this.fallbacks.length; i++) {
        try {
          const result = await this.fallbacks[i]();
          return { result, usedFallback: true, fallbackIndex: i };
        } catch {
          continue;
        }
      }
      throw primaryError;
    }
  }
}

describe('@sanity Error Recovery E2E', () => {
  describe('retry handler', () => {
    it('@sanity succeeds on first attempt', async () => {
      const handler = new RetryHandler();
      let callCount = 0;

      const result = await handler.execute(async () => {
        callCount++;
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('@sanity retries on transient failure', async () => {
      const handler = new RetryHandler({ maxAttempts: 3, backoffMs: 10 });
      let callCount = 0;

      const result = await handler.execute(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Transient error');
        }
        return 'success after retry';
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.result).toBe('success after retry');
    });

    it('fails after max attempts', async () => {
      const handler = new RetryHandler({ maxAttempts: 3, backoffMs: 10 });

      const result = await handler.execute(async () => {
        throw new Error('Persistent error');
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.errors.length).toBe(3);
    });

    it('collects all error messages', async () => {
      const handler = new RetryHandler({ maxAttempts: 3, backoffMs: 10 });
      let callCount = 0;

      const result = await handler.execute(async () => {
        callCount++;
        throw new Error(`Error ${callCount}`);
      });

      expect(result.errors).toContain('Attempt 1: Error 1');
      expect(result.errors).toContain('Attempt 2: Error 2');
      expect(result.errors).toContain('Attempt 3: Error 3');
    });

    it('applies exponential backoff', async () => {
      const handler = new RetryHandler({
        maxAttempts: 4,
        backoffMs: 50,
        backoffMultiplier: 2,
      });

      const startTime = Date.now();
      let callCount = 0;

      await handler.execute(async () => {
        callCount++;
        if (callCount < 4) {
          throw new Error('Retry');
        }
        return 'done';
      });

      const elapsed = Date.now() - startTime;
      // Expected delays: 50 + 100 + 200 = 350ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(300);
    });

    it('respects max backoff limit', async () => {
      const handler = new RetryHandler({
        maxAttempts: 5,
        backoffMs: 100,
        backoffMultiplier: 10,
        maxBackoffMs: 200,
      });

      const startTime = Date.now();

      await handler.execute(async () => {
        throw new Error('Retry');
      });

      const elapsed = Date.now() - startTime;
      // With max backoff 200ms, should be capped
      // 100 + 200 + 200 + 200 = 700ms max
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('circuit breaker', () => {
    it('starts in closed state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe('closed');
    });

    it('opens after threshold failures', async () => {
      const breaker = new CircuitBreaker(3, 1000);

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });

    it('rejects calls when open', async () => {
      const breaker = new CircuitBreaker(1, 10000);

      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {
        // Expected
      }

      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow('Circuit breaker is open');
    });

    it('resets to closed on success', async () => {
      const breaker = new CircuitBreaker(5, 1000);

      // Some failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      // Success resets
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('tracks failure count', async () => {
      const breaker = new CircuitBreaker(5, 1000);

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getFailureCount()).toBe(3);
    });
  });

  describe('error categorization', () => {
    it('categorizes timeout as transient', () => {
      const result = ErrorCategorizer.categorize(new Error('Connection timeout'));
      expect(result.category).toBe('transient');
      expect(result.retryable).toBe(true);
    });

    it('categorizes network errors as transient', () => {
      const result = ErrorCategorizer.categorize(new Error('Network unavailable'));
      expect(result.category).toBe('transient');
      expect(result.retryable).toBe(true);
    });

    it('categorizes rate limits as transient', () => {
      const result = ErrorCategorizer.categorize(new Error('Rate limit exceeded'));
      expect(result.category).toBe('transient');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 404 as permanent', () => {
      const result = ErrorCategorizer.categorize(new Error('Resource not found (404)'));
      expect(result.category).toBe('permanent');
      expect(result.retryable).toBe(false);
    });

    it('categorizes auth errors as permanent', () => {
      const result = ErrorCategorizer.categorize(new Error('Unauthorized access'));
      expect(result.category).toBe('permanent');
      expect(result.retryable).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('categorizes unknown errors appropriately', () => {
      const result = ErrorCategorizer.categorize(new Error('Something weird happened'));
      expect(result.category).toBe('unknown');
      expect(result.retryable).toBe(true);
    });
  });

  describe('fallback handler', () => {
    it('returns primary result on success', async () => {
      const handler = new FallbackHandler<string>();
      handler.addFallback(async () => 'fallback');

      const result = await handler.execute(async () => 'primary');

      expect(result.result).toBe('primary');
      expect(result.usedFallback).toBe(false);
    });

    it('uses fallback on primary failure', async () => {
      const handler = new FallbackHandler<string>();
      handler.addFallback(async () => 'fallback');

      const result = await handler.execute(async () => {
        throw new Error('Primary failed');
      });

      expect(result.result).toBe('fallback');
      expect(result.usedFallback).toBe(true);
      expect(result.fallbackIndex).toBe(0);
    });

    it('tries multiple fallbacks in order', async () => {
      const handler = new FallbackHandler<string>();
      handler
        .addFallback(async () => {
          throw new Error('Fallback 1 failed');
        })
        .addFallback(async () => 'fallback 2');

      const result = await handler.execute(async () => {
        throw new Error('Primary failed');
      });

      expect(result.result).toBe('fallback 2');
      expect(result.fallbackIndex).toBe(1);
    });

    it('throws if all fallbacks fail', async () => {
      const handler = new FallbackHandler<string>();
      handler.addFallback(async () => {
        throw new Error('Fallback failed');
      });

      await expect(
        handler.execute(async () => {
          throw new Error('Primary failed');
        })
      ).rejects.toThrow('Primary failed');
    });
  });
});

describe('Pipeline Recovery Scenarios', () => {
  describe('Figma API recovery', () => {
    it('retries on Figma rate limit', async () => {
      const handler = new RetryHandler({ maxAttempts: 3, backoffMs: 10 });
      let attempts = 0;

      const result = await handler.execute(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Rate limit exceeded');
        }
        return { file: 'design.fig' };
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('fails fast on invalid file key', async () => {
      const error = new Error('File not found (404)');
      const category = ErrorCategorizer.categorize(error);

      expect(category.retryable).toBe(false);
    });
  });

  describe('React generation recovery', () => {
    it('handles partial generation failure', async () => {
      const components = ['Frame1', 'Frame2', 'Frame3'];
      const results: Array<{ name: string; success: boolean }> = [];

      for (const name of components) {
        const handler = new RetryHandler({ maxAttempts: 2, backoffMs: 10 });
        const result = await handler.execute(async () => {
          if (name === 'Frame2') {
            throw new Error('Template error');
          }
          return { code: `// ${name}` };
        });

        results.push({ name, success: result.success });
      }

      expect(results.filter((r) => r.success).length).toBe(2);
      expect(results.filter((r) => !r.success).length).toBe(1);
    });
  });

  describe('Mendix export recovery', () => {
    it('uses cached export as fallback', async () => {
      const handler = new FallbackHandler<{ pages: string[] }>();
      handler.addFallback(async () => ({
        pages: ['CachedPage1', 'CachedPage2'],
      }));

      const result = await handler.execute(async () => {
        throw new Error('Mendix API unavailable');
      });

      expect(result.usedFallback).toBe(true);
      expect(result.result.pages.length).toBe(2);
    });
  });
});
