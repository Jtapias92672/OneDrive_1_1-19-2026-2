import { SignalType, CRITICAL_SIGNALS } from './types';

interface ThrottleState {
  count: number;
  windowStart: number;
}

const SIGNALS_PER_HOUR = 100;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Rate limiter for behavioral signals.
 * Limits to 100 signals per user per hour, with exemptions for critical signals.
 */
export class SignalThrottler {
  private state: ThrottleState = {
    count: 0,
    windowStart: Date.now(),
  };

  /**
   * Check if a signal should be allowed through the throttle.
   * Critical signals (task_completed, task_abandoned, error_encountered) bypass throttling.
   */
  shouldAllow(signalType: SignalType): boolean {
    // Critical signals always pass
    if (this.isCritical(signalType)) {
      return true;
    }

    const now = Date.now();

    // Reset window if hour has passed
    if (now - this.state.windowStart >= HOUR_MS) {
      this.state = {
        count: 0,
        windowStart: now,
      };
    }

    // Check if under limit
    return this.state.count < SIGNALS_PER_HOUR;
  }

  /**
   * Record that a signal was sent.
   */
  recordSignal(signalType: SignalType): void {
    // Don't count critical signals against the limit
    if (this.isCritical(signalType)) {
      return;
    }

    const now = Date.now();

    // Reset window if hour has passed
    if (now - this.state.windowStart >= HOUR_MS) {
      this.state = {
        count: 1,
        windowStart: now,
      };
    } else {
      this.state.count++;
    }
  }

  /**
   * Check if a signal type is critical (exempt from throttling).
   */
  private isCritical(signalType: SignalType): boolean {
    return CRITICAL_SIGNALS.includes(signalType);
  }

  /**
   * Get current throttle state for debugging/monitoring.
   */
  getState(): { count: number; remaining: number; resetsIn: number } {
    const now = Date.now();
    const elapsed = now - this.state.windowStart;

    if (elapsed >= HOUR_MS) {
      return {
        count: 0,
        remaining: SIGNALS_PER_HOUR,
        resetsIn: 0,
      };
    }

    return {
      count: this.state.count,
      remaining: Math.max(0, SIGNALS_PER_HOUR - this.state.count),
      resetsIn: HOUR_MS - elapsed,
    };
  }

  /**
   * Reset throttle state (for testing).
   */
  reset(): void {
    this.state = {
      count: 0,
      windowStart: Date.now(),
    };
  }
}
