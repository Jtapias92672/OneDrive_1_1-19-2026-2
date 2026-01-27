import {
  getComponentPriorities,
  getAllComponentPriorities,
  isComponentVisible,
  getComponentVariant,
  PersonaType,
} from '../component-priority';

describe('component-priority', () => {
  describe('getComponentPriorities', () => {
    it('returns priorities for disappointed persona (P1)', () => {
      const priorities = getComponentPriorities('disappointed');

      // Should show visible components only
      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].componentId).toBe('epic-overview');
      expect(priorities[0].variant).toBe('simplified');

      // Locked components should not appear
      expect(priorities.find((p) => p.componentId === 'evidence-packs')).toBeUndefined();
    });

    it('returns priorities for hesitant persona (P2)', () => {
      const priorities = getComponentPriorities('hesitant');

      // Compliance-first ordering
      expect(priorities[0].componentId).toBe('compliance-status');
      expect(priorities[0].variant).toBe('enhanced');

      // Evidence packs should be visible and enhanced
      const evidencePacks = priorities.find((p) => p.componentId === 'evidence-packs');
      expect(evidencePacks).toBeDefined();
      expect(evidencePacks?.variant).toBe('enhanced');
    });

    it('returns priorities for frontier persona (P3)', () => {
      const priorities = getComponentPriorities('frontier');

      // Capability-first ordering
      expect(priorities[0].componentId).toBe('frontier-map');
      expect(priorities[0].variant).toBe('frontier-annotated');
    });

    it('returns priorities for beginner persona (P0)', () => {
      const priorities = getComponentPriorities('beginner');

      expect(priorities[0].componentId).toBe('guided-tutorial');
      expect(priorities.length).toBeLessThan(5); // Minimal components
    });

    it('returns default priorities for unclassified', () => {
      const priorities = getComponentPriorities('unclassified');

      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities.find((p) => p.componentId === 'epic-overview')).toBeDefined();
    });

    it('unlocks components when modules completed', () => {
      const withoutModules = getComponentPriorities('disappointed', []);
      const withModules = getComponentPriorities('disappointed', ['module-3-complete']);

      // Evidence packs should unlock
      const beforeUnlock = withoutModules.find((p) => p.componentId === 'evidence-packs');
      const afterUnlock = withModules.find((p) => p.componentId === 'evidence-packs');

      expect(beforeUnlock).toBeUndefined();
      expect(afterUnlock).toBeDefined();
    });

    it('returns sorted by priority descending', () => {
      const priorities = getComponentPriorities('hesitant');

      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i - 1].priority).toBeGreaterThanOrEqual(priorities[i].priority);
      }
    });
  });

  describe('getAllComponentPriorities', () => {
    it('returns all components including hidden ones', () => {
      const all = getAllComponentPriorities('disappointed');
      const visible = getComponentPriorities('disappointed');

      expect(all.length).toBeGreaterThan(visible.length);

      // Should include locked components
      expect(all.find((p) => p.componentId === 'evidence-packs')).toBeDefined();
    });
  });

  describe('isComponentVisible', () => {
    it('returns true for visible components', () => {
      expect(isComponentVisible('epic-overview', 'hesitant')).toBe(true);
      expect(isComponentVisible('evidence-packs', 'hesitant')).toBe(true);
    });

    it('returns false for hidden components', () => {
      expect(isComponentVisible('evidence-packs', 'disappointed')).toBe(false);
    });

    it('respects unlock conditions', () => {
      expect(isComponentVisible('evidence-packs', 'disappointed', [])).toBe(false);
      expect(
        isComponentVisible('evidence-packs', 'disappointed', ['module-3-complete'])
      ).toBe(true);
    });
  });

  describe('getComponentVariant', () => {
    it('returns correct variant for persona', () => {
      expect(getComponentVariant('evidence-packs', 'hesitant')).toBe('enhanced');
      expect(getComponentVariant('evidence-packs', 'frontier')).toBe('standard');
      expect(getComponentVariant('epic-overview', 'disappointed')).toBe('simplified');
      expect(getComponentVariant('frontier-map', 'frontier')).toBe('frontier-annotated');
    });

    it('returns null for non-existent component', () => {
      expect(getComponentVariant('non-existent', 'hesitant')).toBeNull();
    });
  });
});
