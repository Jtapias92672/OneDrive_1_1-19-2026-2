/**
 * Token Tracker Tests
 */

import {
  getCurrentTokenUsage,
  addTokens,
  setTokens,
  resetSession,
  simulateTokenGrowth,
  getMockTokenUsage,
} from '../lib/token-tracker';

describe('Token Tracker', () => {
  beforeEach(() => {
    // Reset session before each test
    resetSession();
  });

  describe('getCurrentTokenUsage', () => {
    it('should return initial token usage after reset', () => {
      const result = getCurrentTokenUsage();
      expect(result).toBeDefined();
      expect(result.current).toBe(2500); // Initial system prompt tokens
      expect(result.optimal).toBe(15000);
      expect(result.warning).toBe(30000);
      expect(result.danger).toBe(40000);
      expect(result.status).toBe('optimal');
    });

    it('should have breakdown with all categories', () => {
      const result = getCurrentTokenUsage();
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.systemPrompt).toBe(2500);
      expect(result.breakdown.conversation).toBe(0);
      expect(result.breakdown.tools).toBe(0);
      expect(result.breakdown.context).toBe(0);
    });

    it('should have lastUpdated timestamp', () => {
      const result = getCurrentTokenUsage();
      expect(result.lastUpdated).toBeDefined();
      expect(new Date(result.lastUpdated).getTime()).not.toBeNaN();
    });
  });

  describe('addTokens', () => {
    it('should add tokens to conversation category', () => {
      addTokens('conversation', 1000);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.conversation).toBe(1000);
      expect(result.current).toBe(3500); // 2500 + 1000
    });

    it('should add tokens to tools category', () => {
      addTokens('tools', 500);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.tools).toBe(500);
      expect(result.current).toBe(3000); // 2500 + 500
    });

    it('should add tokens to context category', () => {
      addTokens('context', 2000);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.context).toBe(2000);
      expect(result.current).toBe(4500); // 2500 + 2000
    });

    it('should accumulate tokens with multiple adds', () => {
      addTokens('conversation', 1000);
      addTokens('conversation', 2000);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.conversation).toBe(3000);
    });
  });

  describe('setTokens', () => {
    it('should set tokens for a category', () => {
      setTokens('conversation', 5000);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.conversation).toBe(5000);
    });

    it('should overwrite previous token count', () => {
      addTokens('conversation', 1000);
      setTokens('conversation', 500);
      const result = getCurrentTokenUsage();
      expect(result.breakdown.conversation).toBe(500);
    });
  });

  describe('resetSession', () => {
    it('should reset all tokens to initial state', () => {
      addTokens('conversation', 10000);
      addTokens('tools', 5000);
      addTokens('context', 3000);

      resetSession();

      const result = getCurrentTokenUsage();
      expect(result.breakdown.systemPrompt).toBe(2500);
      expect(result.breakdown.conversation).toBe(0);
      expect(result.breakdown.tools).toBe(0);
      expect(result.breakdown.context).toBe(0);
      expect(result.current).toBe(2500);
    });
  });

  describe('status calculation', () => {
    it('should return optimal status for low token count', () => {
      // Already at 2500 (below 15000 optimal)
      const result = getCurrentTokenUsage();
      expect(result.status).toBe('optimal');
    });

    it('should return warning status for medium token count', () => {
      addTokens('conversation', 20000); // Total: 22500 (above 15000, below 30000)
      const result = getCurrentTokenUsage();
      expect(result.status).toBe('warning');
    });

    it('should return danger status for high token count', () => {
      addTokens('conversation', 35000); // Total: 37500 (above 30000)
      const result = getCurrentTokenUsage();
      expect(result.status).toBe('danger');
    });
  });

  describe('simulateTokenGrowth', () => {
    it('should return normal token state for normal mode', () => {
      const result = simulateTokenGrowth('normal');
      expect(result.status).toBe('optimal');
      expect(result.current).toBeLessThanOrEqual(15000);
    });

    it('should return warning token state for warning mode', () => {
      const result = simulateTokenGrowth('warning');
      expect(result.status).toBe('warning');
      expect(result.current).toBeGreaterThan(15000);
      expect(result.current).toBeLessThanOrEqual(30000);
    });

    it('should return danger token state for critical mode', () => {
      const result = simulateTokenGrowth('critical');
      expect(result.status).toBe('danger');
      expect(result.current).toBeGreaterThan(30000);
    });

    it('should include breakdown in result', () => {
      const result = simulateTokenGrowth('normal');
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.systemPrompt).toBe(2500);
    });
  });

  describe('getMockTokenUsage', () => {
    it('should return normal state by default', () => {
      const result = getMockTokenUsage();
      expect(result.status).toBe('optimal');
    });

    it('should return warning state for warning mode', () => {
      const result = getMockTokenUsage('warning');
      expect(result.status).toBe('warning');
    });

    it('should return danger state for critical mode', () => {
      const result = getMockTokenUsage('critical');
      expect(result.status).toBe('danger');
    });
  });
});
