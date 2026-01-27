import { BehaviorSignal, SignalBatch } from './types';

const MAX_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30 * 1000; // 30 seconds

type FlushCallback = (batch: SignalBatch) => Promise<void>;

/**
 * Batches behavioral signals for efficient transmission.
 * Flushes when: max 10 signals OR 30 seconds elapsed (whichever first).
 */
export class SignalBatcher {
  private queue: BehaviorSignal[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushCallback: FlushCallback;
  private generateBatchId: () => string;

  constructor(
    flushCallback: FlushCallback,
    generateBatchId: () => string = () => crypto.randomUUID()
  ) {
    this.flushCallback = flushCallback;
    this.generateBatchId = generateBatchId;
  }

  /**
   * Add a signal to the batch queue.
   */
  add(signal: BehaviorSignal): void {
    this.queue.push(signal);

    // Start timer on first signal
    if (this.queue.length === 1) {
      this.startTimer();
    }

    // Flush if batch is full
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush all queued signals immediately.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    this.clearTimer();

    const signals = [...this.queue];
    this.queue = [];

    const batch: SignalBatch = {
      signals,
      batchId: this.generateBatchId(),
      clientTimestamp: new Date(),
    };

    try {
      await this.flushCallback(batch);
    } catch (error) {
      // Re-queue signals on failure for retry
      this.queue = [...signals, ...this.queue];
      console.error('[SignalBatcher] Flush failed, signals re-queued:', error);
    }
  }

  /**
   * Flush using Beacon API (for page unload).
   * Returns true if beacon was sent, false otherwise.
   */
  flushBeacon(endpoint: string): boolean {
    if (this.queue.length === 0) {
      return true;
    }

    this.clearTimer();

    const signals = [...this.queue];
    this.queue = [];

    const batch: SignalBatch = {
      signals,
      batchId: this.generateBatchId(),
      clientTimestamp: new Date(),
    };

    const payload = JSON.stringify({ batch });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      return navigator.sendBeacon(endpoint, blob);
    }

    // Fallback: synchronous XHR (not recommended, but better than losing data)
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, false); // Synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
      return xhr.status >= 200 && xhr.status < 300;
    } catch {
      return false;
    }
  }

  /**
   * Get current queue size.
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * Get queued signals (for testing).
   */
  getQueue(): BehaviorSignal[] {
    return [...this.queue];
  }

  /**
   * Clear all queued signals (for testing).
   */
  clear(): void {
    this.queue = [];
    this.clearTimer();
  }

  private startTimer(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private clearTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
