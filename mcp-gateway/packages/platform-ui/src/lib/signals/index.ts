export { SignalCollector, getSignalCollector, initSignalCollector } from './SignalCollector';
export { SignalBatcher } from './SignalBatcher';
export { SignalThrottler } from './SignalThrottler';
export * from './types';

// Convenience export for simple usage
import { getSignalCollector } from './SignalCollector';
import type { SignalType } from './types';

/**
 * Global signal collector instance for easy access throughout the app.
 *
 * @example
 * import { forgeSignals } from '@/lib/signals';
 *
 * // Track an event
 * forgeSignals.track('task_started', { taskType: 'figma-import', taskId: '123' });
 *
 * // Track feature discovery
 * forgeSignals.track('feature_discovered', { featureId: 'templates', featureName: 'Template Gallery' });
 */
export const forgeSignals = {
  /**
   * Track a behavioral signal.
   */
  track(signalType: SignalType, context?: Record<string, unknown>): void {
    getSignalCollector().track(signalType, context);
  },
};

/**
 * Set user ID for signal tracking (call after login).
 */
export function setSignalUserId(userId: string): void {
  getSignalCollector().setUserId(userId);
}

/**
 * Flush all pending signals immediately.
 */
export async function flushSignals(): Promise<void> {
  await getSignalCollector().flush();
}
