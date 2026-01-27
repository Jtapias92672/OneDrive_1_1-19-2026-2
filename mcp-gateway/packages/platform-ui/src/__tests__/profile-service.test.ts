// Profile Service Tests - Epic 15
import {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  exportProfile,
  clearProfileStore,
  onProfileEvent,
  ProfileEvent,
} from '../lib/persona/profile-service';

describe('Profile Service', () => {
  beforeEach(() => {
    clearProfileStore();
  });

  describe('createProfile', () => {
    it('should create a new profile with defaults', async () => {
      const result = await createProfile({ userId: 'user-1' });

      expect(result.profile.userId).toBe('user-1');
      expect(result.profile.personaType).toBe('unclassified');
      expect(result.profile.aiExperienceLevel).toBe(1);
      expect(result.profile.interfaceComplexity).toBe('standard');
      expect(result.profile.version).toBe(1);
    });

    it('should return computed dashboard config', async () => {
      const result = await createProfile({ userId: 'user-1' });

      expect(result.computedDashboard).toBeDefined();
      expect(result.computedDashboard.personaTemplate).toBe('unclassified');
    });

    it('should emit profile.created event', async () => {
      const events: ProfileEvent[] = [];
      const unsubscribe = onProfileEvent((e) => events.push(e));

      await createProfile({ userId: 'user-1' });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('profile.created');
      expect(events[0].userId).toBe('user-1');

      unsubscribe();
    });

    it('should throw if profile already exists', async () => {
      await createProfile({ userId: 'user-1' });

      await expect(createProfile({ userId: 'user-1' }))
        .rejects.toThrow('Profile already exists');
    });
  });

  describe('getProfile', () => {
    it('should return profile and dashboard config', async () => {
      await createProfile({ userId: 'user-1' });
      const result = await getProfile('user-1');

      expect(result).not.toBeNull();
      expect(result!.profile.userId).toBe('user-1');
      expect(result!.computedDashboard).toBeDefined();
    });

    it('should return null for non-existent profile', async () => {
      const result = await getProfile('non-existent');
      expect(result).toBeNull();
    });

    it('should update lastActiveAt on retrieval', async () => {
      await createProfile({ userId: 'user-1' });
      const before = new Date();

      await new Promise((r) => setTimeout(r, 10));
      const result = await getProfile('user-1');

      expect(result!.profile.lastActiveAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('updateProfile', () => {
    it('should update persona type', async () => {
      await createProfile({ userId: 'user-1' });
      const result = await updateProfile('user-1', { personaType: 'disappointed' });

      expect(result!.profile.personaType).toBe('disappointed');
    });

    it('should update dashboard based on new persona', async () => {
      await createProfile({ userId: 'user-1' });
      const result = await updateProfile('user-1', { personaType: 'hesitant' });

      expect(result!.computedDashboard.personaTemplate).toBe('hesitant');
    });

    it('should increment version on update', async () => {
      await createProfile({ userId: 'user-1' });
      const result = await updateProfile('user-1', { personaType: 'disappointed' });

      expect(result!.profile.version).toBe(2);
    });

    it('should emit profile.updated event', async () => {
      await createProfile({ userId: 'user-1' });

      const events: ProfileEvent[] = [];
      const unsubscribe = onProfileEvent((e) => events.push(e));

      await updateProfile('user-1', { personaType: 'disappointed' });

      expect(events.some((e) => e.type === 'profile.updated')).toBe(true);
      unsubscribe();
    });

    it('should emit profile.persona_changed when persona changes', async () => {
      await createProfile({ userId: 'user-1' });

      const events: ProfileEvent[] = [];
      const unsubscribe = onProfileEvent((e) => events.push(e));

      await updateProfile('user-1', { personaType: 'frontier' });

      const personaChangedEvent = events.find((e) => e.type === 'profile.persona_changed');
      expect(personaChangedEvent).toBeDefined();
      expect(personaChangedEvent!.previousPersona).toBe('unclassified');

      unsubscribe();
    });

    it('should return null for non-existent profile', async () => {
      const result = await updateProfile('non-existent', { personaType: 'disappointed' });
      expect(result).toBeNull();
    });

    it('should merge notification preferences', async () => {
      await createProfile({ userId: 'user-1' });
      const result = await updateProfile('user-1', {
        notificationPreferences: {
          email: { enabled: false, frequency: 'weekly', types: [] },
          inApp: { enabled: true, showProgressiveProfiling: false, showTips: true, showCelebrations: true },
        },
      });

      expect(result!.profile.notificationPreferences.email.enabled).toBe(false);
      expect(result!.profile.notificationPreferences.email.frequency).toBe('weekly');
    });
  });

  describe('deleteProfile', () => {
    it('should delete existing profile', async () => {
      await createProfile({ userId: 'user-1' });
      const deleted = await deleteProfile('user-1');

      expect(deleted).toBe(true);

      const result = await getProfile('user-1');
      expect(result).toBeNull();
    });

    it('should return false for non-existent profile', async () => {
      const deleted = await deleteProfile('non-existent');
      expect(deleted).toBe(false);
    });

    it('should emit profile.deleted event', async () => {
      await createProfile({ userId: 'user-1' });

      const events: ProfileEvent[] = [];
      const unsubscribe = onProfileEvent((e) => events.push(e));

      await deleteProfile('user-1');

      expect(events.some((e) => e.type === 'profile.deleted')).toBe(true);
      unsubscribe();
    });
  });

  describe('exportProfile', () => {
    it('should return a copy of the profile', async () => {
      await createProfile({ userId: 'user-1' });
      const exported = await exportProfile('user-1');

      expect(exported).not.toBeNull();
      expect(exported!.userId).toBe('user-1');

      // Modify exported copy
      exported!.personaType = 'frontier';

      // Original should be unchanged
      const original = await getProfile('user-1');
      expect(original!.profile.personaType).toBe('unclassified');
    });

    it('should return null for non-existent profile', async () => {
      const exported = await exportProfile('non-existent');
      expect(exported).toBeNull();
    });
  });

  describe('Dashboard routing with override', () => {
    it('should use override persona for dashboard config', async () => {
      await createProfile({ userId: 'user-1' });
      await updateProfile('user-1', {
        personaType: 'disappointed',
        dashboardPreferences: { overridePersona: 'frontier' },
      });

      const result = await getProfile('user-1');

      expect(result!.profile.personaType).toBe('disappointed');
      expect(result!.computedDashboard.personaTemplate).toBe('frontier');
    });
  });
});
