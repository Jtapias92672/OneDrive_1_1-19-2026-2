import { SignalBatcher } from '../SignalBatcher';
import { BehaviorSignal, SignalBatch } from '../types';

describe('SignalBatcher', () => {
  let batcher: SignalBatcher;
  let flushCallback: jest.Mock;
  let batchIdGenerator: jest.Mock;

  const createSignal = (overrides: Partial<BehaviorSignal> = {}): BehaviorSignal => ({
    id: `signal-${Date.now()}`,
    userId: 'user-1',
    sessionId: 'session-1',
    signalType: 'page_viewed',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    flushCallback = jest.fn().mockResolvedValue(undefined);
    batchIdGenerator = jest.fn().mockReturnValue('batch-123');
    batcher = new SignalBatcher(flushCallback, batchIdGenerator);
  });

  afterEach(() => {
    jest.useRealTimers();
    batcher.clear();
  });

  describe('add', () => {
    it('adds signals to the queue', () => {
      const signal = createSignal();
      batcher.add(signal);

      expect(batcher.queueSize).toBe(1);
    });

    it('flushes when reaching max batch size (10)', async () => {
      for (let i = 0; i < 10; i++) {
        batcher.add(createSignal({ id: `signal-${i}` }));
      }

      // Wait for flush
      await Promise.resolve();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(batcher.queueSize).toBe(0);
    });

    it('includes all signals in batch', async () => {
      for (let i = 0; i < 10; i++) {
        batcher.add(createSignal({ id: `signal-${i}` }));
      }

      await Promise.resolve();

      const batch = flushCallback.mock.calls[0][0] as SignalBatch;
      expect(batch.signals.length).toBe(10);
    });
  });

  describe('flush', () => {
    it('flushes queued signals', async () => {
      batcher.add(createSignal());
      batcher.add(createSignal());

      await batcher.flush();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(batcher.queueSize).toBe(0);
    });

    it('does nothing when queue is empty', async () => {
      await batcher.flush();

      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('re-queues signals on failure', async () => {
      flushCallback.mockRejectedValueOnce(new Error('Network error'));

      batcher.add(createSignal());
      batcher.add(createSignal());

      await batcher.flush();

      expect(batcher.queueSize).toBe(2);
    });

    it('flushes after 30 seconds', async () => {
      batcher.add(createSignal());

      // Advance 30 seconds
      jest.advanceTimersByTime(30 * 1000);

      // Allow async flush to complete
      await Promise.resolve();

      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushBeacon', () => {
    const mockSendBeacon = jest.fn().mockReturnValue(true);

    beforeEach(() => {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
      });
    });

    afterEach(() => {
      mockSendBeacon.mockClear();
    });

    it('sends signals via beacon API', () => {
      batcher.add(createSignal());
      batcher.add(createSignal());

      const result = batcher.flushBeacon('/api/signals/batch');

      expect(result).toBe(true);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/signals/batch',
        expect.any(Blob)
      );
    });

    it('returns true when queue is empty', () => {
      const result = batcher.flushBeacon('/api/signals/batch');

      expect(result).toBe(true);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it('clears queue after beacon', () => {
      batcher.add(createSignal());

      batcher.flushBeacon('/api/signals/batch');

      expect(batcher.queueSize).toBe(0);
    });
  });

  describe('getQueue', () => {
    it('returns copy of queued signals', () => {
      const signal1 = createSignal({ id: 'sig-1' });
      const signal2 = createSignal({ id: 'sig-2' });

      batcher.add(signal1);
      batcher.add(signal2);

      const queue = batcher.getQueue();

      expect(queue.length).toBe(2);
      expect(queue[0].id).toBe('sig-1');
      expect(queue[1].id).toBe('sig-2');
    });
  });

  describe('clear', () => {
    it('clears all queued signals', () => {
      batcher.add(createSignal());
      batcher.add(createSignal());

      batcher.clear();

      expect(batcher.queueSize).toBe(0);
    });
  });
});
