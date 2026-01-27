/**
 * Component Priority System
 * Determines which components appear, in what order, with what variant for each persona
 */

export type PersonaType = 'disappointed' | 'hesitant' | 'frontier' | 'beginner' | 'unclassified';
export type ComponentVariant = 'simplified' | 'standard' | 'enhanced' | 'frontier-annotated';

export interface ComponentPriority {
  componentId: string;
  priority: number; // Higher = shown first
  visible: boolean;
  variant: ComponentVariant;
  unlockCondition?: string; // e.g., 'module-3-complete'
}

const PERSONA_COMPONENT_PRIORITIES: Record<PersonaType, ComponentPriority[]> = {
  disappointed: [
    // P1: Simplified, progress-focused
    { componentId: 'epic-overview', priority: 100, visible: true, variant: 'simplified' },
    { componentId: 'active-files', priority: 90, visible: true, variant: 'standard' },
    { componentId: 'verification-status', priority: 80, visible: true, variant: 'simplified' },
    { componentId: 'token-gauge', priority: 70, visible: true, variant: 'simplified' },
    // Hidden until unlocked
    { componentId: 'evidence-packs', priority: 60, visible: false, variant: 'simplified', unlockCondition: 'module-3-complete' },
    { componentId: 'cars-autonomy', priority: 50, visible: false, variant: 'simplified', unlockCondition: 'module-5-complete' },
    { componentId: 'supply-chain', priority: 40, visible: false, variant: 'simplified', unlockCondition: 'module-6-complete' },
  ],

  hesitant: [
    // P2: Compliance-first ordering
    { componentId: 'compliance-status', priority: 100, visible: true, variant: 'enhanced' },
    { componentId: 'evidence-packs', priority: 95, visible: true, variant: 'enhanced' },
    { componentId: 'cars-autonomy', priority: 90, visible: true, variant: 'enhanced' },
    { componentId: 'supply-chain', priority: 85, visible: true, variant: 'enhanced' },
    { componentId: 'data-protection', priority: 80, visible: true, variant: 'enhanced' },
    { componentId: 'audit-trail', priority: 75, visible: true, variant: 'standard' },
    { componentId: 'pending-reviews', priority: 70, visible: true, variant: 'standard' },
    { componentId: 'organization-policy', priority: 65, visible: true, variant: 'standard' },
    { componentId: 'epic-overview', priority: 60, visible: true, variant: 'standard' },
    { componentId: 'token-gauge', priority: 55, visible: true, variant: 'standard' },
  ],

  frontier: [
    // P3: Capability + calibration focus
    { componentId: 'frontier-map', priority: 100, visible: true, variant: 'frontier-annotated' },
    { componentId: 'task-complexity', priority: 95, visible: true, variant: 'frontier-annotated' },
    { componentId: 'accuracy-chart', priority: 90, visible: true, variant: 'frontier-annotated' },
    { componentId: 'experimental-features', priority: 85, visible: true, variant: 'frontier-annotated' },
    { componentId: 'epic-overview', priority: 80, visible: true, variant: 'frontier-annotated' },
    { componentId: 'evidence-packs', priority: 75, visible: true, variant: 'standard' },
    { componentId: 'cars-autonomy', priority: 70, visible: true, variant: 'standard' },
    { componentId: 'supply-chain', priority: 65, visible: true, variant: 'simplified' },
    { componentId: 'token-gauge', priority: 60, visible: true, variant: 'standard' },
  ],

  beginner: [
    // P0: Guided, minimal
    { componentId: 'guided-tutorial', priority: 100, visible: true, variant: 'simplified' },
    { componentId: 'epic-overview', priority: 90, visible: true, variant: 'simplified' },
    { componentId: 'active-files', priority: 80, visible: true, variant: 'simplified' },
    { componentId: 'help-widget', priority: 70, visible: true, variant: 'simplified' },
  ],

  unclassified: [
    // Default: Show core components
    { componentId: 'epic-overview', priority: 100, visible: true, variant: 'standard' },
    { componentId: 'evidence-packs', priority: 90, visible: true, variant: 'standard' },
    { componentId: 'token-gauge', priority: 80, visible: true, variant: 'standard' },
    { componentId: 'verification-status', priority: 70, visible: true, variant: 'standard' },
  ],
};

/**
 * Get component priorities for a persona
 */
export function getComponentPriorities(
  personaType: PersonaType,
  completedModules: string[] = []
): ComponentPriority[] {
  const priorities =
    PERSONA_COMPONENT_PRIORITIES[personaType] ||
    PERSONA_COMPONENT_PRIORITIES.unclassified;

  return priorities
    .map((p) => {
      // Check unlock conditions
      if (p.unlockCondition) {
        // If condition exists, component is visible only if condition is met
        return { ...p, visible: completedModules.includes(p.unlockCondition) };
      }
      return p;
    })
    .filter((p) => p.visible)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get all component priorities (including hidden)
 */
export function getAllComponentPriorities(
  personaType: PersonaType
): ComponentPriority[] {
  return (
    PERSONA_COMPONENT_PRIORITIES[personaType] ||
    PERSONA_COMPONENT_PRIORITIES.unclassified
  ).sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a specific component is visible for a persona
 */
export function isComponentVisible(
  componentId: string,
  personaType: PersonaType,
  completedModules: string[] = []
): boolean {
  const priorities = getComponentPriorities(personaType, completedModules);
  return priorities.some((p) => p.componentId === componentId);
}

/**
 * Get component variant for a persona
 */
export function getComponentVariant(
  componentId: string,
  personaType: PersonaType
): ComponentVariant | null {
  const priorities =
    PERSONA_COMPONENT_PRIORITIES[personaType] ||
    PERSONA_COMPONENT_PRIORITIES.unclassified;

  const priority = priorities.find((p) => p.componentId === componentId);
  return priority?.variant || null;
}
