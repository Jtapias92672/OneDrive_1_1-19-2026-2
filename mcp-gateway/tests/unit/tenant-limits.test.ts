/**
 * Unit Tests: Per-Tenant Rate Limits
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.8 - Per-Tenant Limits
 *
 * Tests TenantRateLimiter, TenantQuotaManager, and TenantLimitsManager.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TenantRateLimiter,
  TenantQuotaManager,
  TenantLimitsManager,
  RateLimitConfig,
  TenantQuota,
  TenantLimits,
} from '../../tenant/limits.js';

describe('Tenant Limits (tenant/limits.ts)', () => {
  describe('TenantRateLimiter', () => {
    let rateLimiter: TenantRateLimiter;

    beforeEach(() => {
      rateLimiter = new TenantRateLimiter();
    });

    describe('Constructor', () => {
      it('should create with default limits', () => {
        const limiter = new TenantRateLimiter();
        const result = limiter.checkLimit('new-tenant');
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(100); // Default limit
      });

      it('should create with custom default limits', () => {
        const customLimit: RateLimitConfig = {
          limit: 50,
          windowMs: 30000,
          blockOnLimit: false,
        };
        const limiter = new TenantRateLimiter(customLimit);
        const result = limiter.checkLimit('tenant-1');
        expect(result.limit).toBe(50);
      });
    });

    describe('setLimit', () => {
      it('should set custom limit for tenant', () => {
        rateLimiter.setLimit('premium-tenant', {
          limit: 1000,
          windowMs: 60000,
          blockOnLimit: true,
        });

        const result = rateLimiter.checkLimit('premium-tenant');
        expect(result.limit).toBe(1000);
      });

      it('should override existing limit', () => {
        rateLimiter.setLimit('tenant-1', { limit: 50, windowMs: 60000, blockOnLimit: true });
        rateLimiter.setLimit('tenant-1', { limit: 200, windowMs: 60000, blockOnLimit: true });

        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.limit).toBe(200);
      });
    });

    describe('checkLimit', () => {
      it('should allow request when under limit', () => {
        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeLessThanOrEqual(99); // One token consumed
      });

      it('should decrement tokens on each check', () => {
        rateLimiter.setLimit('tenant-1', { limit: 5, windowMs: 60000, blockOnLimit: true });

        for (let i = 0; i < 5; i++) {
          const result = rateLimiter.checkLimit('tenant-1');
          expect(result.allowed).toBe(true);
        }

        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should deny request when limit exceeded', () => {
        rateLimiter.setLimit('tenant-1', { limit: 1, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1'); // Use the one token

        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('should return current request count', () => {
        rateLimiter.setLimit('tenant-1', { limit: 10, windowMs: 60000, blockOnLimit: true });

        for (let i = 0; i < 3; i++) {
          rateLimiter.checkLimit('tenant-1');
        }

        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.current).toBeGreaterThan(0);
      });

      it('should calculate resetIn correctly', () => {
        rateLimiter.setLimit('tenant-1', { limit: 10, windowMs: 60000, blockOnLimit: true });
        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.resetIn).toBeGreaterThan(0);
      });
    });

    describe('Token Refill', () => {
      it('should refill tokens over time', async () => {
        rateLimiter.setLimit('tenant-1', { limit: 10, windowMs: 100, blockOnLimit: true });

        // Consume all tokens
        for (let i = 0; i < 10; i++) {
          rateLimiter.checkLimit('tenant-1');
        }

        // Wait for refill
        await new Promise((resolve) => setTimeout(resolve, 150));

        const result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(true);
      });
    });

    describe('consume', () => {
      it('should consume tokens without checking', () => {
        rateLimiter.setLimit('tenant-1', { limit: 10, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1'); // Initialize bucket

        const consumed = rateLimiter.consume('tenant-1', 5);
        expect(consumed).toBe(true);
      });

      it('should fail to consume more tokens than available', () => {
        rateLimiter.setLimit('tenant-1', { limit: 3, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1'); // Initialize bucket, consume 1

        const consumed = rateLimiter.consume('tenant-1', 5);
        expect(consumed).toBe(false);
      });

      it('should return false for uninitialized tenant', () => {
        const consumed = rateLimiter.consume('unknown-tenant');
        expect(consumed).toBe(false);
      });

      it('should consume default 1 token', () => {
        rateLimiter.setLimit('tenant-1', { limit: 5, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1');

        const consumed = rateLimiter.consume('tenant-1');
        expect(consumed).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset rate limit for tenant', () => {
        rateLimiter.setLimit('tenant-1', { limit: 1, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1'); // Use the token

        // Should be denied now
        let result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(false);

        // Reset
        rateLimiter.reset('tenant-1');

        // Should be allowed again with fresh bucket
        result = rateLimiter.checkLimit('tenant-1');
        expect(result.allowed).toBe(true);
      });
    });

    describe('getState', () => {
      it('should return current state for tenant', () => {
        rateLimiter.setLimit('tenant-1', { limit: 10, windowMs: 60000, blockOnLimit: true });
        rateLimiter.checkLimit('tenant-1');

        const state = rateLimiter.getState('tenant-1');
        expect(state).not.toBeNull();
        expect(state!.limit).toBe(10);
        expect(state!.tokens).toBeLessThan(10);
      });

      it('should return null for uninitialized tenant', () => {
        const state = rateLimiter.getState('unknown-tenant');
        expect(state).toBeNull();
      });
    });
  });

  describe('TenantQuotaManager', () => {
    let quotaManager: TenantQuotaManager;

    beforeEach(() => {
      quotaManager = new TenantQuotaManager();
    });

    describe('Constructor', () => {
      it('should create with default quota', () => {
        const quota = quotaManager.getQuota('new-tenant');
        expect(quota.dailyRequests).toBe(10000);
        expect(quota.monthlyRequests).toBe(300000);
        expect(quota.concurrentRequests).toBe(10);
      });

      it('should create with custom default quota', () => {
        const customQuota: TenantQuota = {
          dailyRequests: 1000,
          monthlyRequests: 30000,
          concurrentRequests: 5,
          maxPayloadSize: 512 * 1024,
          maxResponseSize: 5 * 1024 * 1024,
          maxExecutionTime: 15000,
          allowedTools: [],
          blockedTools: [],
        };
        const manager = new TenantQuotaManager(customQuota);
        const quota = manager.getQuota('tenant-1');
        expect(quota.dailyRequests).toBe(1000);
      });
    });

    describe('setQuota', () => {
      it('should set partial quota for tenant', () => {
        quotaManager.setQuota('tenant-1', { dailyRequests: 5000 });
        const quota = quotaManager.getQuota('tenant-1');
        expect(quota.dailyRequests).toBe(5000);
        expect(quota.monthlyRequests).toBe(300000); // Default preserved
      });

      it('should override existing quota', () => {
        quotaManager.setQuota('tenant-1', { dailyRequests: 5000 });
        quotaManager.setQuota('tenant-1', { dailyRequests: 2000, concurrentRequests: 20 });

        const quota = quotaManager.getQuota('tenant-1');
        expect(quota.dailyRequests).toBe(2000);
        expect(quota.concurrentRequests).toBe(20);
      });
    });

    describe('checkQuota', () => {
      it('should allow request within quota', () => {
        const result = quotaManager.checkQuota('tenant-1');
        expect(result.allowed).toBe(true);
        expect(result.violations.length).toBe(0);
      });

      it('should deny request exceeding daily limit', () => {
        quotaManager.setQuota('tenant-1', { dailyRequests: 2 });

        // Use up quota
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        const result = quotaManager.checkQuota('tenant-1');
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.type === 'daily')).toBe(true);
      });

      it('should deny request exceeding monthly limit', () => {
        quotaManager.setQuota('tenant-1', { monthlyRequests: 2 });

        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        const result = quotaManager.checkQuota('tenant-1');
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.type === 'monthly')).toBe(true);
      });

      it('should deny request exceeding concurrent limit', () => {
        quotaManager.setQuota('tenant-1', { concurrentRequests: 2 });

        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        const result = quotaManager.checkQuota('tenant-1');
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.type === 'concurrent')).toBe(true);
      });

      it('should deny request exceeding payload size', () => {
        quotaManager.setQuota('tenant-1', { maxPayloadSize: 1000 });

        const result = quotaManager.checkQuota('tenant-1', { payloadSize: 2000 });
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.type === 'payload')).toBe(true);
      });

      it('should deny blocked tool', () => {
        quotaManager.setQuota('tenant-1', { blockedTools: ['dangerous_tool'] });

        const result = quotaManager.checkQuota('tenant-1', { toolName: 'dangerous_tool' });
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.type === 'execution')).toBe(true);
        expect(result.violations.some((v) => v.message.includes('blocked'))).toBe(true);
      });

      it('should deny tool not in allowed list', () => {
        quotaManager.setQuota('tenant-1', { allowedTools: ['safe_tool'] });

        const result = quotaManager.checkQuota('tenant-1', { toolName: 'other_tool' });
        expect(result.allowed).toBe(false);
        expect(result.violations.some((v) => v.message.includes('not in allowed'))).toBe(true);
      });

      it('should allow tool in allowed list', () => {
        quotaManager.setQuota('tenant-1', { allowedTools: ['safe_tool'] });

        const result = quotaManager.checkQuota('tenant-1', { toolName: 'safe_tool' });
        expect(result.allowed).toBe(true);
      });

      it('should return usage statistics', () => {
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        const result = quotaManager.checkQuota('tenant-1');
        expect(result.usage.dailyRequests).toBe(2);
        expect(result.usage.monthlyRequests).toBe(2);
      });
    });

    describe('startRequest and endRequest', () => {
      it('should increment daily and monthly counters', () => {
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        const usage = quotaManager.getUsage('tenant-1');
        expect(usage.dailyRequests).toBe(2);
        expect(usage.monthlyRequests).toBe(2);
      });

      it('should track concurrent requests', () => {
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        let result = quotaManager.checkQuota('tenant-1');
        expect(result.usage.concurrentRequests).toBe(3);

        quotaManager.endRequest('tenant-1');

        result = quotaManager.checkQuota('tenant-1');
        expect(result.usage.concurrentRequests).toBe(2);
      });

      it('should not go below zero concurrent requests', () => {
        quotaManager.endRequest('tenant-1'); // End without start
        const result = quotaManager.checkQuota('tenant-1');
        expect(result.usage.concurrentRequests).toBe(0);
      });
    });

    describe('getUsage', () => {
      it('should return usage for tenant', () => {
        quotaManager.startRequest('tenant-1');
        const usage = quotaManager.getUsage('tenant-1');
        expect(usage.dailyRequests).toBe(1);
        expect(usage.lastReset).toBeInstanceOf(Date);
      });

      it('should create usage record if not exists', () => {
        const usage = quotaManager.getUsage('new-tenant');
        expect(usage.dailyRequests).toBe(0);
        expect(usage.monthlyRequests).toBe(0);
      });
    });

    describe('resetUsage', () => {
      it('should reset all usage for tenant', () => {
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');
        quotaManager.startRequest('tenant-1');

        quotaManager.resetUsage('tenant-1');

        const usage = quotaManager.getUsage('tenant-1');
        expect(usage.dailyRequests).toBe(0);
        expect(usage.monthlyRequests).toBe(0);
        expect(usage.concurrentRequests).toBe(0);
      });
    });

    describe('Counter Reset', () => {
      it('should have lastReset date', () => {
        const usage = quotaManager.getUsage('tenant-1');
        expect(usage.lastReset).toBeInstanceOf(Date);
      });
    });
  });

  describe('TenantLimitsManager', () => {
    let limitsManager: TenantLimitsManager;

    beforeEach(() => {
      limitsManager = new TenantLimitsManager();
    });

    describe('Constructor', () => {
      it('should create with rate limiter and quota manager', () => {
        expect(limitsManager.getRateLimiter()).toBeInstanceOf(TenantRateLimiter);
        expect(limitsManager.getQuotaManager()).toBeInstanceOf(TenantQuotaManager);
      });
    });

    describe('configureTenant', () => {
      it('should configure tenant with full limits', () => {
        const limits: TenantLimits = {
          tenantId: 'tenant-1',
          rateLimit: {
            limit: 50,
            windowMs: 30000,
            blockOnLimit: true,
          },
          quota: {
            dailyRequests: 1000,
            monthlyRequests: 30000,
            concurrentRequests: 5,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: ['dangerous_tool'],
          },
          active: true,
          priority: 'high',
        };

        limitsManager.configureTenant(limits);

        const retrieved = limitsManager.getTenantLimits('tenant-1');
        expect(retrieved).toBeDefined();
        expect(retrieved!.priority).toBe('high');
        expect(retrieved!.active).toBe(true);
      });
    });

    describe('checkLimits', () => {
      it('should check both rate limit and quota', () => {
        const result = limitsManager.checkLimits('tenant-1');

        expect(result.allowed).toBe(true);
        expect(result.rateLimit).toBeDefined();
        expect(result.quota).toBeDefined();
      });

      it('should deny inactive tenant', () => {
        limitsManager.configureTenant({
          tenantId: 'inactive-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: false,
          priority: 'normal',
        });

        const result = limitsManager.checkLimits('inactive-tenant');
        expect(result.allowed).toBe(false);
        expect(result.quota.violations.some((v) => v.message.includes('inactive'))).toBe(true);
      });

      it('should deny when rate limit exceeded', () => {
        limitsManager.configureTenant({
          tenantId: 'limited-tenant',
          rateLimit: { limit: 1, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'normal',
        });

        limitsManager.checkLimits('limited-tenant'); // Use the one token
        const result = limitsManager.checkLimits('limited-tenant');
        expect(result.allowed).toBe(false);
        expect(result.rateLimit.allowed).toBe(false);
      });

      it('should deny when quota exceeded', () => {
        limitsManager.configureTenant({
          tenantId: 'quota-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 1,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'normal',
        });

        limitsManager.startRequest('quota-tenant');
        const result = limitsManager.checkLimits('quota-tenant');
        expect(result.allowed).toBe(false);
        expect(result.quota.allowed).toBe(false);
      });

      it('should pass tool name to quota check', () => {
        limitsManager.configureTenant({
          tenantId: 'tool-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: ['blocked_tool'],
          },
          active: true,
          priority: 'normal',
        });

        const result = limitsManager.checkLimits('tool-tenant', { toolName: 'blocked_tool' });
        expect(result.allowed).toBe(false);
      });

      it('should pass payload size to quota check', () => {
        limitsManager.configureTenant({
          tenantId: 'size-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1000,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'normal',
        });

        const result = limitsManager.checkLimits('size-tenant', { payloadSize: 5000 });
        expect(result.allowed).toBe(false);
      });
    });

    describe('startRequest and endRequest', () => {
      it('should delegate to quota manager', () => {
        limitsManager.startRequest('tenant-1');
        limitsManager.startRequest('tenant-1');

        const quota = limitsManager.getQuotaManager().getUsage('tenant-1');
        expect(quota.dailyRequests).toBe(2);

        limitsManager.endRequest('tenant-1');
        // Concurrent should be decremented but daily/monthly preserved
      });
    });

    describe('getTenantLimits', () => {
      it('should return configured limits', () => {
        limitsManager.configureTenant({
          tenantId: 'test-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'critical',
        });

        const limits = limitsManager.getTenantLimits('test-tenant');
        expect(limits).toBeDefined();
        expect(limits!.priority).toBe('critical');
      });

      it('should return undefined for unconfigured tenant', () => {
        const limits = limitsManager.getTenantLimits('unknown-tenant');
        expect(limits).toBeUndefined();
      });
    });

    describe('Priority Levels', () => {
      it('should support low priority', () => {
        limitsManager.configureTenant({
          tenantId: 'low-tenant',
          rateLimit: { limit: 10, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 1000,
            monthlyRequests: 10000,
            concurrentRequests: 2,
            maxPayloadSize: 512 * 1024,
            maxResponseSize: 1024 * 1024,
            maxExecutionTime: 10000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'low',
        });

        const limits = limitsManager.getTenantLimits('low-tenant');
        expect(limits!.priority).toBe('low');
      });

      it('should support normal priority', () => {
        limitsManager.configureTenant({
          tenantId: 'normal-tenant',
          rateLimit: { limit: 100, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 10000,
            monthlyRequests: 300000,
            concurrentRequests: 10,
            maxPayloadSize: 1024 * 1024,
            maxResponseSize: 10 * 1024 * 1024,
            maxExecutionTime: 30000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'normal',
        });

        const limits = limitsManager.getTenantLimits('normal-tenant');
        expect(limits!.priority).toBe('normal');
      });

      it('should support high priority', () => {
        limitsManager.configureTenant({
          tenantId: 'high-tenant',
          rateLimit: { limit: 500, windowMs: 60000, blockOnLimit: true },
          quota: {
            dailyRequests: 50000,
            monthlyRequests: 1500000,
            concurrentRequests: 50,
            maxPayloadSize: 5 * 1024 * 1024,
            maxResponseSize: 50 * 1024 * 1024,
            maxExecutionTime: 60000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'high',
        });

        const limits = limitsManager.getTenantLimits('high-tenant');
        expect(limits!.priority).toBe('high');
      });

      it('should support critical priority', () => {
        limitsManager.configureTenant({
          tenantId: 'critical-tenant',
          rateLimit: { limit: 1000, windowMs: 60000, blockOnLimit: false },
          quota: {
            dailyRequests: 100000,
            monthlyRequests: 3000000,
            concurrentRequests: 100,
            maxPayloadSize: 10 * 1024 * 1024,
            maxResponseSize: 100 * 1024 * 1024,
            maxExecutionTime: 120000,
            allowedTools: [],
            blockedTools: [],
          },
          active: true,
          priority: 'critical',
        });

        const limits = limitsManager.getTenantLimits('critical-tenant');
        expect(limits!.priority).toBe('critical');
      });
    });
  });
});
