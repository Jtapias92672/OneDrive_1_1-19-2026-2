import { policyStore } from '../policy/policy-store';
import { getDefaultPolicies } from '../policy/default-policies';

describe('PolicyStore', () => {
  beforeEach(() => {
    policyStore.reset();
  });

  describe('initialization', () => {
    it('loads default policies on first access', async () => {
      const policies = await policyStore.getAll();
      const defaults = getDefaultPolicies();

      expect(policies.length).toBe(defaults.length);
    });

    it('does not duplicate defaults on multiple initializations', async () => {
      await policyStore.getAll();
      await policyStore.getAll();
      const policies = await policyStore.getAll();
      const defaults = getDefaultPolicies();

      expect(policies.length).toBe(defaults.length);
    });
  });

  describe('getAll', () => {
    it('returns policies sorted by priority (descending)', async () => {
      const policies = await policyStore.getAll();

      for (let i = 1; i < policies.length; i++) {
        expect(policies[i - 1].priority).toBeGreaterThanOrEqual(policies[i].priority);
      }
    });
  });

  describe('getEnabled', () => {
    it('returns only enabled policies', async () => {
      await policyStore.create({
        name: 'Disabled Policy',
        enabled: false,
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
      });

      const enabled = await policyStore.getEnabled();
      const all = await policyStore.getAll();

      expect(enabled.length).toBe(all.length - 1);
      expect(enabled.every(p => p.enabled)).toBe(true);
    });
  });

  describe('create', () => {
    it('creates a new policy with generated ID', async () => {
      const policy = await policyStore.create({
        name: 'Test Policy',
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
      });

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Test Policy');
      expect(policy.enabled).toBe(true);
      expect(policy.priority).toBe(50);
      expect(policy.createdAt).toBeInstanceOf(Date);
      expect(policy.updatedAt).toBeInstanceOf(Date);
    });

    it('respects provided priority and enabled values', async () => {
      const policy = await policyStore.create({
        name: 'Custom Policy',
        enabled: false,
        priority: 75,
        conditions: [],
        actions: [],
      });

      expect(policy.enabled).toBe(false);
      expect(policy.priority).toBe(75);
    });
  });

  describe('getById', () => {
    it('returns policy by ID', async () => {
      const created = await policyStore.create({
        name: 'Find Me',
        conditions: [],
        actions: [],
      });

      const found = await policyStore.getById(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find Me');
    });

    it('returns null for unknown ID', async () => {
      const found = await policyStore.getById('unknown-id');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates policy fields', async () => {
      const created = await policyStore.create({
        name: 'Original Name',
        conditions: [],
        actions: [],
      });

      const updated = await policyStore.update(created.id, {
        name: 'Updated Name',
        priority: 90,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.priority).toBe(90);
      expect(updated?.id).toBe(created.id);
      expect(updated?.createdAt).toEqual(created.createdAt);
      // updatedAt should be equal or greater (may be same if very fast)
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('returns null for unknown ID', async () => {
      const updated = await policyStore.update('unknown-id', { name: 'Test' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes policy by ID', async () => {
      const created = await policyStore.create({
        name: 'Delete Me',
        conditions: [],
        actions: [],
      });

      const deleted = await policyStore.delete(created.id);
      const found = await policyStore.getById(created.id);

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('returns false for unknown ID', async () => {
      const deleted = await policyStore.delete('unknown-id');

      expect(deleted).toBe(false);
    });
  });

  describe('getByScope', () => {
    beforeEach(async () => {
      policyStore.reset();

      await policyStore.create({
        name: 'Global Policy',
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
        scope: {},
      });

      await policyStore.create({
        name: 'Workflow Scoped',
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
        scope: { workflowTypes: ['figma-to-code'] },
      });

      await policyStore.create({
        name: 'Environment Scoped',
        conditions: [{ field: 'test', operator: 'eq', value: true }],
        actions: [{ type: 'log' }],
        scope: { environments: ['production'] },
      });
    });

    it('returns global policies when no scope specified', async () => {
      const policies = await policyStore.getByScope();

      // Should include global + default policies (which have no scope)
      expect(policies.some(p => p.name === 'Global Policy')).toBe(true);
    });

    it('filters by workflow type', async () => {
      const policies = await policyStore.getByScope('figma-to-code');

      expect(policies.some(p => p.name === 'Workflow Scoped')).toBe(true);
      expect(policies.some(p => p.name === 'Global Policy')).toBe(true);
    });

    it('excludes non-matching workflow types', async () => {
      const policies = await policyStore.getByScope('ticket-to-pr');

      expect(policies.some(p => p.name === 'Workflow Scoped')).toBe(false);
    });

    it('filters by environment', async () => {
      const policies = await policyStore.getByScope(undefined, undefined, 'production');

      expect(policies.some(p => p.name === 'Environment Scoped')).toBe(true);
    });
  });

  describe('exists', () => {
    it('returns true for existing policy', async () => {
      const created = await policyStore.create({
        name: 'Exists',
        conditions: [],
        actions: [],
      });

      const exists = await policyStore.exists(created.id);

      expect(exists).toBe(true);
    });

    it('returns false for non-existing policy', async () => {
      const exists = await policyStore.exists('unknown-id');

      expect(exists).toBe(false);
    });
  });
});
