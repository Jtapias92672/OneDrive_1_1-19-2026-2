/**
 * Wolfram Client Tests
 * Epic 14: Computational Accuracy Layer
 */

import { WolframClient } from '../wolfram/wolfram-client';
import { WolframCache } from '../wolfram/wolfram-cache';
import { RateLimiter } from '../wolfram/rate-limiter';

describe('WolframClient', () => {
  let client: WolframClient;
  let cache: WolframCache;

  beforeEach(() => {
    cache = new WolframCache();
    // Client without API key for testing
    client = new WolframClient({ appId: '' }, cache);
  });

  afterEach(() => {
    cache.clear();
  });

  describe('isEnabled', () => {
    it('returns false when no appId', () => {
      expect(client.isEnabled()).toBe(false);
    });

    it('returns true when appId is set', () => {
      const enabledClient = new WolframClient({ appId: 'test-key' });
      expect(enabledClient.isEnabled()).toBe(true);
    });
  });

  describe('query (mock mode)', () => {
    it('returns mock result for speed of light', async () => {
      const result = await client.query('speed of light in m/s');

      expect(result.success).toBe(true);
      expect(result.result).toContain('299792458');
      expect(result.cost).toBe(0);
    });

    it('returns mock result for Avogadro number', async () => {
      const result = await client.query("avogadro's number");

      expect(result.success).toBe(true);
      expect(result.result).toContain('6.02214076');
    });

    it('computes simple arithmetic', async () => {
      const result = await client.query('2 + 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('computes multiplication', async () => {
      const result = await client.query('10 * 5');
      expect(result.success).toBe(true);
      expect(result.result).toBe('50');
    });

    it('computes sqrt', async () => {
      const result = await client.query('sqrt(16)');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('returns error for unknown queries when not configured', async () => {
      const result = await client.query('some random query that is not mocked');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('caching', () => {
    it('returns cached result on second query', async () => {
      // First query
      const result1 = await client.query('2 + 2');
      expect(result1.cached).toBe(false);

      // Second query should be cached
      const result2 = await client.query('2 + 2');
      expect(result2.cached).toBe(true);
      expect(result2.cost).toBe(0);
    });

    it('caches normalized queries (case insensitive)', async () => {
      await client.query('speed of light in m/s');
      const result = await client.query('SPEED OF LIGHT IN M/S');

      expect(result.cached).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    it('returns rate limit status', () => {
      const status = client.getRateLimitStatus();

      expect(status.minuteRemaining).toBeDefined();
      expect(status.monthRemaining).toBeDefined();
      expect(status.minuteRemaining).toBeGreaterThan(0);
      expect(status.monthRemaining).toBeGreaterThan(0);
    });
  });

  describe('getCacheStats', () => {
    it('returns cache statistics', () => {
      const stats = client.getCacheStats();

      expect(stats.size).toBeDefined();
      expect(stats.hitRate).toBeDefined();
    });

    it('increases size after caching', async () => {
      const beforeStats = client.getCacheStats();
      await client.query('2 + 2');
      const afterStats = client.getCacheStats();

      expect(afterStats.size).toBeGreaterThan(beforeStats.size);
    });
  });

  describe('reset', () => {
    it('clears cache and resets rate limiter', async () => {
      await client.query('2 + 2');
      expect(client.getCacheStats().size).toBeGreaterThan(0);

      client.reset();

      expect(client.getCacheStats().size).toBe(0);
    });
  });
});

describe('WolframCache', () => {
  let cache: WolframCache;

  beforeEach(() => {
    cache = new WolframCache(1); // 1 second TTL
  });

  describe('get/set', () => {
    it('stores and retrieves results', async () => {
      const result = { success: true, query: 'test', cached: false, cost: 0 };
      await cache.set('test query', result);

      const retrieved = await cache.get('test query');
      expect(retrieved).toEqual(result);
    });

    it('returns null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('normalizes query keys (case insensitive)', async () => {
      const result = { success: true, query: 'TEST', cached: false, cost: 0 };
      await cache.set('TEST QUERY', result);

      const retrieved = await cache.get('test query');
      expect(retrieved).toEqual(result);
    });
  });

  describe('TTL', () => {
    it('expires entries after TTL', async () => {
      const result = { success: true, query: 'test', cached: false, cost: 0 };
      await cache.set('test', result);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const retrieved = await cache.get('test');
      expect(retrieved).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes entry from cache', async () => {
      const result = { success: true, query: 'test', cached: false, cost: 0 };
      await cache.set('test', result);

      const deleted = await cache.delete('test');
      expect(deleted).toBe(true);

      const retrieved = await cache.get('test');
      expect(retrieved).toBeNull();
    });

    it('returns false for non-existent key', async () => {
      const deleted = await cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('has', () => {
    it('returns true for existing entry', async () => {
      await cache.set('test', { success: true, query: 'test', cached: false, cost: 0 });
      expect(await cache.has('test')).toBe(true);
    });

    it('returns false for non-existent entry', async () => {
      expect(await cache.has('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      await cache.set('test1', { success: true, query: 'test1', cached: false, cost: 0 });
      await cache.set('test2', { success: true, query: 'test2', cached: false, cost: 0 });

      cache.clear();

      expect(await cache.has('test1')).toBe(false);
      expect(await cache.has('test2')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns cache size', async () => {
      await cache.set('test1', { success: true, query: 'test1', cached: false, cost: 0 });
      await cache.set('test2', { success: true, query: 'test2', cached: false, cost: 0 });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });
});

describe('RateLimiter', () => {
  describe('acquire', () => {
    it('allows requests within limits', async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 100 });

      // Should not throw
      await limiter.acquire();
      await limiter.acquire();
    });

    it('throws when monthly limit exceeded', async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 1 });

      await limiter.acquire(); // Use the one allowed

      await expect(limiter.acquire()).rejects.toThrow('Monthly rate limit exceeded');
    });
  });

  describe('canAcquire', () => {
    it('returns true when within limits', () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 100 });
      expect(limiter.canAcquire()).toBe(true);
    });

    it('returns false when limits exceeded', async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 1, requestsPerMonth: 100 });

      await limiter.acquire();
      expect(limiter.canAcquire()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('returns remaining tokens', () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 100 });

      const status = limiter.getStatus();
      expect(status.minuteRemaining).toBe(10);
      expect(status.monthRemaining).toBe(100);
    });

    it('decrements after acquire', async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 100 });

      await limiter.acquire();

      const status = limiter.getStatus();
      expect(status.minuteRemaining).toBe(9);
      expect(status.monthRemaining).toBe(99);
    });
  });

  describe('reset', () => {
    it('resets all limits', async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerMonth: 100 });

      await limiter.acquire();
      await limiter.acquire();

      limiter.reset();

      const status = limiter.getStatus();
      expect(status.minuteRemaining).toBe(10);
      expect(status.monthRemaining).toBe(100);
    });
  });
});
