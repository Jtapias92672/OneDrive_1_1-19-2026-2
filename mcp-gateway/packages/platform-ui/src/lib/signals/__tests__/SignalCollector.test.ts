/**
 * @jest-environment jsdom
 */

import { SignalCollector, getSignalCollector, initSignalCollector } from '../SignalCollector';

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ accepted: 1, rejected: 0 }),
});

describe('SignalCollector', () => {
  let collector: SignalCollector;

  beforeEach(() => {
    jest.useFakeTimers();
    collector = new SignalCollector({ disabled: false });
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    collector.reset();
  });

  describe('track', () => {
    it('queues signals', () => {
      collector.track('page_viewed', { page: 'home' });

      expect(collector.getPendingCount()).toBe(1);
    });

    it('does not track when disabled', () => {
      const disabled = new SignalCollector({ disabled: true });
      disabled.track('page_viewed');

      expect(disabled.getPendingCount()).toBe(0);
    });

    it('sanitizes PII from context', async () => {
      collector.track('page_viewed', {
        page: 'home',
        email: 'test@example.com',
        name: 'John Doe',
        validField: 'allowed',
      });

      // Trigger flush
      await collector.flush();

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const signal = body.batch.signals[0];

      expect(signal.context.validField).toBe('allowed');
      expect(signal.context.email).toBeUndefined();
      expect(signal.context.name).toBeUndefined();
    });

    it('throttles non-critical signals', () => {
      // Exhaust throttle limit
      for (let i = 0; i < 100; i++) {
        collector.track('page_viewed');
      }

      const countBefore = collector.getPendingCount();

      collector.track('page_viewed');

      expect(collector.getPendingCount()).toBe(countBefore); // No increase
    });

    it('allows critical signals through throttle', () => {
      // Exhaust throttle limit
      for (let i = 0; i < 100; i++) {
        collector.track('page_viewed');
      }

      const countBefore = collector.getPendingCount();

      collector.track('task_completed');

      expect(collector.getPendingCount()).toBe(countBefore + 1);
    });
  });

  describe('setUserId', () => {
    it('sets user ID for subsequent signals', async () => {
      collector.setUserId('user-123');
      collector.track('page_viewed');

      await collector.flush();

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const signal = body.batch.signals[0];

      expect(signal.userId).toBe('user-123');
    });
  });

  describe('setSessionId', () => {
    it('sets session ID for subsequent signals', async () => {
      collector.setSessionId('session-abc');
      collector.track('page_viewed');

      await collector.flush();

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const signal = body.batch.signals[0];

      expect(signal.sessionId).toBe('session-abc');
    });
  });

  describe('flush', () => {
    it('sends batched signals to API', async () => {
      collector.track('page_viewed', { page: 'home' });
      collector.track('feature_discovered', { featureId: 'templates' });

      await collector.flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/signals/batch',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.batch.signals.length).toBe(2);
    });

    it('clears queue after successful flush', async () => {
      collector.track('page_viewed');

      await collector.flush();

      expect(collector.getPendingCount()).toBe(0);
    });
  });

  describe('setEnabled', () => {
    it('enables signal collection', () => {
      collector.setEnabled(true);
      collector.track('page_viewed');

      expect(collector.getPendingCount()).toBe(1);
    });

    it('disables signal collection', () => {
      collector.setEnabled(false);
      collector.track('page_viewed');

      expect(collector.getPendingCount()).toBe(0);
    });
  });

  describe('getThrottleState', () => {
    it('returns throttle information', () => {
      collector.track('page_viewed');

      const state = collector.getThrottleState();

      expect(state.count).toBe(1);
      expect(state.remaining).toBe(99);
      expect(state.resetsIn).toBeGreaterThan(0);
    });
  });

  describe('isInitialized', () => {
    it('returns true after initialization', () => {
      expect(collector.isInitialized()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears queue and throttle state', () => {
      collector.track('page_viewed');
      collector.track('page_viewed');

      collector.reset();

      expect(collector.getPendingCount()).toBe(0);
      expect(collector.getThrottleState().count).toBe(0);
    });
  });
});

describe('getSignalCollector', () => {
  it('returns singleton instance', () => {
    const instance1 = getSignalCollector();
    const instance2 = getSignalCollector();

    expect(instance1).toBe(instance2);
  });
});

describe('initSignalCollector', () => {
  it('creates new instance with config', () => {
    const instance = initSignalCollector({ disabled: true });

    expect(instance.isInitialized()).toBe(true);
  });
});
