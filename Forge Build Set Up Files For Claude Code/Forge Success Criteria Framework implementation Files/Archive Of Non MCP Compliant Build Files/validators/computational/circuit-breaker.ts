/**
 * FORGE Circuit Breaker
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 3.2 - Circuit Breaker
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Implements the circuit breaker pattern for Wolfram API calls.
 *   Prevents cascading failures and enables graceful degradation.
 *   
 *   States:
 *   - CLOSED: Normal operation, requests pass through
 *   - OPEN: Failures exceeded threshold, requests fail fast
 *   - HALF_OPEN: Testing if service recovered
 */

// ============================================
// TYPES
// ============================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  
  /** Time to wait before testing (ms) */
  resetTimeoutMs: number;
  
  /** Number of successful calls to close circuit */
  successThreshold: number;
  
  /** Window for counting failures (ms) */
  failureWindowMs: number;
  
  /** Timeout for individual requests (ms) */
  requestTimeoutMs: number;
  
  /** Callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, reason: string) => void;
  
  /** Callback when request is rejected */
  onReject?: (error: Error) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  rejections: number;
  lastFailure?: string;
  lastSuccess?: string;
  lastStateChange: string;
  stateChangeReason?: string;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  circuitState: CircuitState;
  latencyMs: number;
}

// ============================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private failures: Array<{ timestamp: number; error: string }> = [];
  private successCount: number = 0;
  private rejectionCount: number = 0;
  private lastStateChange: Date = new Date();
  private stateChangeReason?: string;
  private resetTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,
      resetTimeoutMs: 30000, // 30 seconds
      successThreshold: 3,
      failureWindowMs: 60000, // 1 minute
      requestTimeoutMs: 10000, // 10 seconds
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    
    // Check if circuit allows request
    if (!this.canExecute()) {
      this.rejectionCount++;
      const error = new Error(`Circuit breaker is ${this.state}`);
      
      if (this.config.onReject) {
        this.config.onReject(error);
      }
      
      return {
        success: false,
        error,
        circuitState: this.state,
        latencyMs: Date.now() - startTime,
      };
    }
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      
      this.recordSuccess();
      
      return {
        success: true,
        result,
        circuitState: this.state,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.recordFailure(error.message);
      
      return {
        success: false,
        error,
        circuitState: this.state,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if circuit allows execution
   */
  canExecute(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        // Check if reset timeout has passed
        const timeSinceOpen = Date.now() - this.lastStateChange.getTime();
        if (timeSinceOpen >= this.config.resetTimeoutMs) {
          this.transitionTo('HALF_OPEN', 'Reset timeout elapsed');
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    const recentFailures = this.getRecentFailures();
    
    return {
      state: this.state,
      failures: recentFailures.length,
      successes: this.successCount,
      rejections: this.rejectionCount,
      lastFailure: recentFailures.length > 0 
        ? new Date(recentFailures[recentFailures.length - 1].timestamp).toISOString()
        : undefined,
      lastSuccess: this.successCount > 0 ? new Date().toISOString() : undefined,
      lastStateChange: this.lastStateChange.toISOString(),
      stateChangeReason: this.stateChangeReason,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED', 'Manual reset');
    this.failures = [];
    this.successCount = 0;
    this.rejectionCount = 0;
  }

  /**
   * Force circuit to open state
   */
  forceOpen(reason: string): void {
    this.transitionTo('OPEN', `Forced: ${reason}`);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${this.config.requestTimeoutMs}ms`));
      }, this.config.requestTimeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private recordSuccess(): void {
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('CLOSED', 'Success threshold reached');
      }
    }
  }

  private recordFailure(errorMessage: string): void {
    this.failures.push({
      timestamp: Date.now(),
      error: errorMessage,
    });
    
    // Clean old failures
    this.cleanOldFailures();
    
    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit
      this.transitionTo('OPEN', 'Failure in half-open state');
    } else if (this.state === 'CLOSED') {
      // Check if threshold exceeded
      const recentFailures = this.getRecentFailures();
      if (recentFailures.length >= this.config.failureThreshold) {
        this.transitionTo('OPEN', `Failure threshold (${this.config.failureThreshold}) exceeded`);
      }
    }
  }

  private getRecentFailures(): Array<{ timestamp: number; error: string }> {
    const windowStart = Date.now() - this.config.failureWindowMs;
    return this.failures.filter(f => f.timestamp >= windowStart);
  }

  private cleanOldFailures(): void {
    const windowStart = Date.now() - this.config.failureWindowMs;
    this.failures = this.failures.filter(f => f.timestamp >= windowStart);
  }

  private transitionTo(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    
    if (oldState === newState) return;
    
    this.state = newState;
    this.lastStateChange = new Date();
    this.stateChangeReason = reason;
    
    // Reset success count on state change
    if (newState === 'HALF_OPEN' || newState === 'CLOSED') {
      this.successCount = 0;
    }
    
    // Clear any existing reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    // Set reset timer for OPEN state
    if (newState === 'OPEN') {
      this.resetTimer = setTimeout(() => {
        if (this.state === 'OPEN') {
          this.transitionTo('HALF_OPEN', 'Reset timeout elapsed');
        }
      }, this.config.resetTimeoutMs);
    }
    
    // Notify callback
    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState, reason);
    }
    
    console.log(`[CircuitBreaker] ${oldState} → ${newState}: ${reason}`);
  }
}

// ============================================
// CIRCUIT-PROTECTED WOLFRAM CLIENT
// ============================================

import { WolframClient, WolframQueryResult, getWolframClient, WolframError } from './wolfram-client';

export class ProtectedWolframClient {
  private client: WolframClient;
  private circuitBreaker: CircuitBreaker;

  constructor(client?: WolframClient, circuitConfig?: Partial<CircuitBreakerConfig>) {
    this.client = client || getWolframClient();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      successThreshold: 2,
      onStateChange: (from, to, reason) => {
        console.log(`[ProtectedWolframClient] Circuit: ${from} → ${to} (${reason})`);
      },
      ...circuitConfig,
    });
  }

  async query(input: string): Promise<WolframQueryResult> {
    const result = await this.circuitBreaker.execute(() => this.client.query(input));
    
    if (!result.success) {
      // Return a degraded result
      return {
        success: false,
        result: `Circuit breaker ${result.circuitState}: ${result.error?.message}`,
        numericValue: null,
        queryId: `cb-error-${Date.now()}`,
        latencyMs: result.latencyMs,
        cached: false,
      };
    }
    
    return result.result!;
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  getCircuitStats(): CircuitBreakerStats {
    return this.circuitBreaker.getStats();
  }

  resetCircuit(): void {
    this.circuitBreaker.reset();
  }
}

// ============================================
// EXPORTS
// ============================================

export default CircuitBreaker;
