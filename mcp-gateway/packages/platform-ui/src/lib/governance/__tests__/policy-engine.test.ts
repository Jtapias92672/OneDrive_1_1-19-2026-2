import { PolicyEngine } from '../policy/policy-engine';
import { policyStore } from '../policy/policy-store';
import { Policy, PolicyContext } from '../types';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    policyStore.reset();
    engine = new PolicyEngine();
  });

  describe('evaluate', () => {
    it('returns allowed when no policies match', async () => {
      const context: PolicyContext = {
        workflowType: 'test',
        riskLevel: 'low',
      };

      const result = await engine.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedPolicies.length).toBe(0);
    });

    it('blocks when a blocking policy matches', async () => {
      policyStore.reset();
      await policyStore.create({
        name: 'Block Test',
        conditions: [{ field: 'riskLevel', operator: 'eq', value: 'critical' }],
        actions: [{ type: 'block', params: { reason: 'Too risky' } }],
      });

      const context: PolicyContext = {
        riskLevel: 'critical',
      };

      const result = await engine.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Too risky');
      // At least our custom policy matches (may include default high-risk policy too)
      expect(result.matchedPolicies.some(p => p.name === 'Block Test')).toBe(true);
    });

    it('requires approval when require-approval action matched', async () => {
      await policyStore.create({
        name: 'Require Approval Test',
        conditions: [{ field: 'environment', operator: 'eq', value: 'production' }],
        actions: [{ type: 'require-approval' }],
      });

      const context: PolicyContext = {
        environment: 'production',
      };

      const result = await engine.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });

    it('evaluates default high-risk policy', async () => {
      // Default policies are loaded automatically
      const context: PolicyContext = {
        riskLevel: 'high',
      };

      const result = await engine.evaluate(context);

      expect(result.requiresApproval).toBe(true);
      expect(result.matchedPolicies.some(p => p.name === 'High Risk Approval Required')).toBe(true);
    });

    it('blocks tier 4 data by default', async () => {
      const context: PolicyContext = {
        dataClassification: 4,
      };

      const result = await engine.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.matchedPolicies.some(p => p.name === 'Data Classification Guard')).toBe(true);
    });

    it('blocks when token budget exceeded', async () => {
      const context: PolicyContext = {
        tokenUsagePercent: 150,
      };

      const result = await engine.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Token budget exceeded');
    });
  });

  describe('condition operators', () => {
    beforeEach(async () => {
      policyStore.reset();
    });

    it('eq operator matches equal values', async () => {
      await policyStore.create({
        name: 'EQ Test',
        conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ status: 'active' });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ status: 'inactive' });
      expect(result2.matchedPolicies.length).toBe(0);
    });

    it('ne operator matches unequal values', async () => {
      await policyStore.create({
        name: 'NE Test',
        conditions: [{ field: 'status', operator: 'ne', value: 'blocked' }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ status: 'active' });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ status: 'blocked' });
      expect(result2.matchedPolicies.length).toBe(0);
    });

    it('gt operator matches greater values', async () => {
      await policyStore.create({
        name: 'GT Test',
        conditions: [{ field: 'score', operator: 'gt', value: 50 }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ score: 75 });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ score: 50 });
      expect(result2.matchedPolicies.length).toBe(0);

      const result3 = await engine.evaluate({ score: 25 });
      expect(result3.matchedPolicies.length).toBe(0);
    });

    it('lt operator matches lesser values', async () => {
      await policyStore.create({
        name: 'LT Test',
        conditions: [{ field: 'count', operator: 'lt', value: 10 }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ count: 5 });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ count: 15 });
      expect(result2.matchedPolicies.length).toBe(0);
    });

    it('gte operator matches greater or equal values', async () => {
      await policyStore.create({
        name: 'GTE Test',
        conditions: [{ field: 'level', operator: 'gte', value: 3 }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ level: 3 });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ level: 5 });
      expect(result2.matchedPolicies.length).toBe(1);

      const result3 = await engine.evaluate({ level: 2 });
      expect(result3.matchedPolicies.length).toBe(0);
    });

    it('lte operator matches lesser or equal values', async () => {
      await policyStore.create({
        name: 'LTE Test',
        conditions: [{ field: 'tier', operator: 'lte', value: 2 }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ tier: 2 });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ tier: 1 });
      expect(result2.matchedPolicies.length).toBe(1);

      const result3 = await engine.evaluate({ tier: 3 });
      expect(result3.matchedPolicies.length).toBe(0);
    });

    it('in operator matches values in array', async () => {
      await policyStore.create({
        name: 'IN Test',
        conditions: [{ field: 'role', operator: 'in', value: ['admin', 'manager'] }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ role: 'admin' });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ role: 'user' });
      expect(result2.matchedPolicies.length).toBe(0);
    });

    it('contains operator matches substring', async () => {
      await policyStore.create({
        name: 'Contains Test',
        conditions: [{ field: 'path', operator: 'contains', value: '/api/' }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ path: '/api/users' });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ path: '/web/home' });
      expect(result2.matchedPolicies.length).toBe(0);
    });

    it('matches operator uses regex', async () => {
      await policyStore.create({
        name: 'Matches Test',
        conditions: [{ field: 'email', operator: 'matches', value: '^[a-z]+@test\\.com$' }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ email: 'admin@test.com' });
      expect(result.matchedPolicies.length).toBe(1);

      const result2 = await engine.evaluate({ email: 'user@other.com' });
      expect(result2.matchedPolicies.length).toBe(0);
    });
  });

  describe('multiple conditions', () => {
    it('requires all conditions to match (AND logic)', async () => {
      policyStore.reset();
      await policyStore.create({
        name: 'Multi Condition Test',
        conditions: [
          { field: 'environment', operator: 'eq', value: 'production' },
          { field: 'riskLevel', operator: 'eq', value: 'high' },
        ],
        actions: [{ type: 'block' }],
      });

      // Both match
      const result1 = await engine.evaluate({
        environment: 'production',
        riskLevel: 'high',
      });
      // Our custom policy should match
      expect(result1.matchedPolicies.some(p => p.name === 'Multi Condition Test')).toBe(true);

      // Only one condition matches - our multi-condition policy should NOT match
      const result2 = await engine.evaluate({
        environment: 'production',
        riskLevel: 'low',
      });
      // Our multi-condition policy should NOT be in the matched list
      expect(result2.matchedPolicies.some(p => p.name === 'Multi Condition Test')).toBe(false);

      // Neither matches for our multi-condition policy
      const result3 = await engine.evaluate({
        environment: 'development',
        riskLevel: 'low',
      });
      expect(result3.matchedPolicies.some(p => p.name === 'Multi Condition Test')).toBe(false);
    });
  });

  describe('priority ordering', () => {
    it('evaluates higher priority policies first', async () => {
      policyStore.reset();

      await policyStore.create({
        name: 'Low Priority',
        priority: 10,
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
      });

      await policyStore.create({
        name: 'High Priority',
        priority: 100,
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({ test: true });

      expect(result.matchedPolicies.length).toBe(2);
      expect(result.matchedPolicies[0].name).toBe('High Priority');
      expect(result.matchedPolicies[1].name).toBe('Low Priority');
    });
  });

  describe('nested field access', () => {
    it('supports dot notation for nested fields', async () => {
      policyStore.reset();
      await policyStore.create({
        name: 'Nested Test',
        conditions: [{ field: 'user.role', operator: 'eq', value: 'admin' }],
        actions: [{ type: 'log' }],
      });

      const result = await engine.evaluate({
        user: { role: 'admin' },
      });
      expect(result.matchedPolicies.length).toBe(1);
    });
  });
});
