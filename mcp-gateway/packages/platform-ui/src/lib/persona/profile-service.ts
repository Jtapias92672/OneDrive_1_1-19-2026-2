// ============================================================================
// PROFILE SERVICE
// Epic 15: Persona Foundation
// ============================================================================

import {
  ForgeUserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileResponse,
  DashboardConfig,
  PersonaType,
  createDefaultProfile,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORE (MVP - Replace with PostgreSQL + Redis in production)
// ─────────────────────────────────────────────────────────────────────────────

const profileStore = new Map<string, ForgeUserProfile>();
const eventListeners: ((event: ProfileEvent) => void)[] = [];

export interface ProfileEvent {
  type: 'profile.created' | 'profile.updated' | 'profile.persona_changed' | 'profile.deleted';
  userId: string;
  timestamp: Date;
  data?: UpdateProfileRequest | { personaType: PersonaType };
  previousPersona?: PersonaType;
}

function emitEvent(event: ProfileEvent): void {
  eventListeners.forEach((listener) => listener(event));
}

export function onProfileEvent(listener: (event: ProfileEvent) => void): () => void {
  eventListeners.push(listener);
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONFIGURATION BY PERSONA
// ─────────────────────────────────────────────────────────────────────────────

const dashboardConfigs: Record<PersonaType, DashboardConfig> = {
  disappointed: {
    personaTemplate: 'disappointed',
    widgets: [
      { id: 'reliability-score', type: 'reliability-banner', position: { row: 0, col: 0 }, size: { width: 4, height: 1 }, visible: true },
      { id: 'templates', type: 'template-grid', position: { row: 1, col: 0 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'recent-projects', type: 'project-list', position: { row: 1, col: 2 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'skill-progress', type: 'skill-progress', position: { row: 3, col: 0 }, size: { width: 2, height: 1 }, visible: true },
      { id: 'help-widget', type: 'help-widget', position: { row: 3, col: 2 }, size: { width: 2, height: 1 }, visible: true },
    ],
    theme: 'light',
    density: 'comfortable',
  },
  hesitant: {
    personaTemplate: 'hesitant',
    widgets: [
      { id: 'compliance-status', type: 'compliance-banner', position: { row: 0, col: 0 }, size: { width: 4, height: 1 }, visible: true },
      { id: 'data-classification', type: 'data-classification-guide', position: { row: 1, col: 0 }, size: { width: 4, height: 1 }, visible: true },
      { id: 'evidence-packs', type: 'evidence-pack-list', position: { row: 2, col: 0 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'pending-reviews', type: 'pending-reviews', position: { row: 2, col: 2 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'org-policy', type: 'organization-policy', position: { row: 4, col: 0 }, size: { width: 2, height: 1 }, visible: true },
      { id: 'audit-trail', type: 'audit-trail-widget', position: { row: 4, col: 2 }, size: { width: 2, height: 1 }, visible: true },
    ],
    theme: 'light',
    density: 'comfortable',
  },
  frontier: {
    personaTemplate: 'frontier',
    widgets: [
      { id: 'frontier-map', type: 'frontier-map', position: { row: 0, col: 0 }, size: { width: 4, height: 2 }, visible: true },
      { id: 'complexity-analyzer', type: 'task-complexity-analyzer', position: { row: 2, col: 0 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'accuracy-chart', type: 'accuracy-chart', position: { row: 2, col: 2 }, size: { width: 2, height: 2 }, visible: true },
      { id: 'recent-tasks', type: 'recent-tasks-confidence', position: { row: 4, col: 0 }, size: { width: 2, height: 1 }, visible: true },
      { id: 'experimental', type: 'experimental-features', position: { row: 4, col: 2 }, size: { width: 2, height: 1 }, visible: true },
    ],
    theme: 'light',
    density: 'comfortable',
  },
  beginner: {
    personaTemplate: 'beginner',
    widgets: [
      { id: 'welcome', type: 'welcome-banner', position: { row: 0, col: 0 }, size: { width: 4, height: 1 }, visible: true },
      { id: 'guided-start', type: 'guided-start', position: { row: 1, col: 0 }, size: { width: 4, height: 2 }, visible: true },
      { id: 'tutorials', type: 'tutorial-list', position: { row: 3, col: 0 }, size: { width: 2, height: 1 }, visible: true },
      { id: 'help-widget', type: 'help-widget', position: { row: 3, col: 2 }, size: { width: 2, height: 1 }, visible: true },
    ],
    theme: 'light',
    density: 'spacious',
  },
  unclassified: {
    personaTemplate: 'unclassified',
    widgets: [
      { id: 'onboarding-prompt', type: 'onboarding-prompt', position: { row: 0, col: 0 }, size: { width: 4, height: 2 }, visible: true },
    ],
    theme: 'light',
    density: 'comfortable',
  },
};

function getDashboardConfig(profile: ForgeUserProfile): DashboardConfig {
  if (profile.dashboardPreferences?.overridePersona) {
    return dashboardConfigs[profile.dashboardPreferences.overridePersona];
  }
  return dashboardConfigs[profile.personaType];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SERVICE API
// ─────────────────────────────────────────────────────────────────────────────

export async function createProfile(request: CreateProfileRequest): Promise<ProfileResponse> {
  const { userId } = request;

  if (profileStore.has(userId)) {
    throw new Error(`Profile already exists for user ${userId}`);
  }

  const profile = createDefaultProfile(userId);
  profileStore.set(userId, profile);

  emitEvent({
    type: 'profile.created',
    userId,
    timestamp: new Date(),
    data: profile,
  });

  return {
    profile,
    computedDashboard: getDashboardConfig(profile),
  };
}

export async function getProfile(userId: string): Promise<ProfileResponse | null> {
  const profile = profileStore.get(userId);
  if (!profile) return null;

  // Update last active
  profile.lastActiveAt = new Date();

  return {
    profile,
    computedDashboard: getDashboardConfig(profile),
  };
}

export async function updateProfile(
  userId: string,
  updates: UpdateProfileRequest
): Promise<ProfileResponse | null> {
  const profile = profileStore.get(userId);
  if (!profile) return null;

  const previousPersona = profile.personaType;

  // Apply updates
  if (updates.personaType !== undefined) profile.personaType = updates.personaType;
  if (updates.industry !== undefined) profile.industry = updates.industry;
  if (updates.role !== undefined) profile.role = updates.role;
  if (updates.teamSize !== undefined) profile.teamSize = updates.teamSize;
  if (updates.aiExperienceLevel !== undefined) profile.aiExperienceLevel = updates.aiExperienceLevel;
  if (updates.aiUsageFrequency !== undefined) profile.aiUsageFrequency = updates.aiUsageFrequency;
  if (updates.primaryUseCases !== undefined) profile.primaryUseCases = updates.primaryUseCases;
  if (updates.interfaceComplexity !== undefined) profile.interfaceComplexity = updates.interfaceComplexity;

  if (updates.compliance) {
    profile.compliance = { ...profile.compliance, ...updates.compliance } as typeof profile.compliance;
  }
  if (updates.dashboardPreferences) {
    profile.dashboardPreferences = { ...profile.dashboardPreferences, ...updates.dashboardPreferences };
  }
  if (updates.notificationPreferences) {
    profile.notificationPreferences = {
      ...profile.notificationPreferences,
      ...updates.notificationPreferences,
      email: { ...profile.notificationPreferences.email, ...updates.notificationPreferences.email },
      inApp: { ...profile.notificationPreferences.inApp, ...updates.notificationPreferences.inApp },
    };
  }

  profile.updatedAt = new Date();
  profile.version += 1;

  // Emit events
  emitEvent({
    type: 'profile.updated',
    userId,
    timestamp: new Date(),
    data: updates,
  });

  if (previousPersona !== profile.personaType) {
    emitEvent({
      type: 'profile.persona_changed',
      userId,
      timestamp: new Date(),
      previousPersona,
      data: { personaType: profile.personaType },
    });
  }

  return {
    profile,
    computedDashboard: getDashboardConfig(profile),
  };
}

export async function deleteProfile(userId: string): Promise<boolean> {
  const existed = profileStore.delete(userId);

  if (existed) {
    emitEvent({
      type: 'profile.deleted',
      userId,
      timestamp: new Date(),
    });
  }

  return existed;
}

export async function exportProfile(userId: string): Promise<ForgeUserProfile | null> {
  const profile = profileStore.get(userId);
  return profile ? { ...profile } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function clearProfileStore(): void {
  profileStore.clear();
}

export function getProfileStore(): Map<string, ForgeUserProfile> {
  return profileStore;
}
