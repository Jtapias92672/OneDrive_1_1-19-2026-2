import { SignalThrottler } from '../SignalThrottler';

describe('SignalThrottler', () => {
  let throttler: SignalThrottler;

  beforeEach(() => {
    throttler = new SignalThrottler();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shouldAllow', () => {
    it('allows signals under the limit', () => {
      expect(throttler.shouldAllow('page_viewed')).toBe(true);
      expect(throttler.shouldAllow('feature_discovered')).toBe(true);
    });

    it('blocks signals over the limit', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        throttler.recordSignal('page_viewed');
      }

      expect(throttler.shouldAllow('page_viewed')).toBe(false);
    });

    it('always allows critical signals', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        throttler.recordSignal('page_viewed');
      }

      expect(throttler.shouldAllow('task_completed')).toBe(true);
      expect(throttler.shouldAllow('task_abandoned')).toBe(true);
    });

    it('resets after one hour', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        throttler.recordSignal('page_viewed');
      }

      expect(throttler.shouldAllow('page_viewed')).toBe(false);

      // Advance time by 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(throttler.shouldAllow('page_viewed')).toBe(true);
    });
  });

  describe('recordSignal', () => {
    it('increments count for regular signals', () => {
      throttler.recordSignal('page_viewed');
      throttler.recordSignal('feature_discovered');

      const state = throttler.getState();
      expect(state.count).toBe(2);
      expect(state.remaining).toBe(98);
    });

    it('does not count critical signals', () => {
      throttler.recordSignal('task_completed');
      throttler.recordSignal('task_abandoned');

      const state = throttler.getState();
      expect(state.count).toBe(0);
      expect(state.remaining).toBe(100);
    });
  });

  describe('getState', () => {
    it('returns current throttle state', () => {
      throttler.recordSignal('page_viewed');

      const state = throttler.getState();
      expect(state.count).toBe(1);
      expect(state.remaining).toBe(99);
      expect(state.resetsIn).toBeGreaterThan(0);
    });

    it('returns fresh state after window reset', () => {
      throttler.recordSignal('page_viewed');

      // Advance past window
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);

      const state = throttler.getState();
      expect(state.count).toBe(0);
      expect(state.remaining).toBe(100);
      expect(state.resetsIn).toBe(0);
    });
  });

  describe('reset', () => {
    it('clears throttle state', () => {
      throttler.recordSignal('page_viewed');
      throttler.recordSignal('page_viewed');

      throttler.reset();

      const state = throttler.getState();
      expect(state.count).toBe(0);
    });
  });
});
