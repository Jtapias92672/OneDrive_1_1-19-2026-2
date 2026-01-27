// ============================================================================
// FORGE PERSONA SYSTEM - TYPE DEFINITIONS
// Epic 15: Persona Foundation
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export type PersonaType =
  | 'disappointed'  // P1: Disappointed Adopter - "Sarah"
  | 'hesitant'      // P2: High-Performing Hesitator - "David"
  | 'frontier'      // P3: Frontier Navigator - "Maria"
  | 'beginner'      // P0: New to AI
  | 'unclassified'; // Not yet completed onboarding

export type AIExperienceLevel = 1 | 2 | 3 | 4 | 5;

export type AIUsageFrequency = 'rarely' | 'weekly' | 'daily' | 'hourly';

export type TeamSize = 'individual' | 'small' | 'medium' | 'enterprise';

export type PolicyType = 'none' | 'vague' | 'restrictive' | 'permissive';

export type InterfaceComplexity = 'minimal' | 'standard' | 'advanced';

export type Industry =
  | 'finance'
  | 'healthcare'
  | 'legal'
  | 'government'
  | 'defense'
  | 'technology'
  | 'manufacturing'
  | 'retail'
  | 'education'
  | 'other';

// ─────────────────────────────────────────────────────────────────────────────
// SKILL SYSTEM TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SkillType =
  | 'prompt_engineering'
  | 'output_evaluation'
  | 'task_decomposition'
  | 'frontier_calibration'
  | 'error_recovery'
  | 'workflow_design'
  | 'compliance_awareness'
  | 'security_hygiene';

export interface SkillModule {
  id: string;
  name: string;
  skillType: SkillType;
  completedAt: Date;
  score: number;
  timeSpentMinutes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface WidgetConfig {
  id: string;
  type: string;
  position: { row: number; col: number };
  size: { width: number; height: number };
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface DashboardConfig {
  personaTemplate: PersonaType;
  widgets: WidgetConfig[];
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface DashboardPreferences {
  overridePersona?: PersonaType;
  customWidgets?: WidgetConfig[];
  pinnedProjects?: string[];
  collapsedSections?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'realtime' | 'daily' | 'weekly';
    types: ('task_complete' | 'task_failed' | 'review_required' | 'tips')[];
  };
  inApp: {
    enabled: boolean;
    showProgressiveProfiling: boolean;
    showTips: boolean;
    showCelebrations: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING RESPONSES
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingResponse {
  questionId: string;
  questionText: string;
  selectedOption: string;
  answeredAt: Date;
}

export interface OnboardingData {
  completedAt?: Date;
  responses: OnboardingResponse[];
  classifiedPersona: PersonaType;
  classificationConfidence: number;
  timeToComplete: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE CONTEXT (Persona 2 Specific)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComplianceContext {
  hasOrganizationalPolicy: boolean;
  policyType: PolicyType;
  policyDocumentUrl?: string;
  dataClassificationRequired: boolean;
  auditTrailRequired: boolean;
  approvedDataTiers: (1 | 2 | 3 | 4)[];
  complianceFrameworks: ('SOC2' | 'HIPAA' | 'CMMC' | 'GDPR' | 'ISO27001' | 'FedRAMP')[];
  lastComplianceReview?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN USER PROFILE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface ForgeUserProfile {
  userId: string;
  createdAt: Date;
  personaType: PersonaType;
  industry?: Industry;
  role?: string;
  teamSize?: TeamSize;
  aiExperienceLevel: AIExperienceLevel;
  aiUsageFrequency: AIUsageFrequency;
  primaryUseCases: string[];
  compliance?: ComplianceContext;
  completedModules: SkillModule[];
  currentModule?: SkillModule;
  skillScores: Partial<Record<SkillType, number>>;
  taskSuccessRate: number;
  averageIterationsToSuccess: number;
  totalTasksCompleted: number;
  totalTimeInPlatform: number;
  dashboardPreferences: DashboardPreferences;
  notificationPreferences: NotificationPreferences;
  interfaceComplexity: InterfaceComplexity;
  onboarding: OnboardingData;
  lastActiveAt: Date;
  updatedAt: Date;
  version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE CREATION DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export function createDefaultProfile(userId: string): ForgeUserProfile {
  const now = new Date();
  return {
    userId,
    createdAt: now,
    personaType: 'unclassified',
    aiExperienceLevel: 1,
    aiUsageFrequency: 'rarely',
    primaryUseCases: [],
    completedModules: [],
    skillScores: {},
    taskSuccessRate: 0,
    averageIterationsToSuccess: 0,
    totalTasksCompleted: 0,
    totalTimeInPlatform: 0,
    dashboardPreferences: {},
    notificationPreferences: {
      email: {
        enabled: true,
        frequency: 'daily',
        types: ['task_complete', 'task_failed'],
      },
      inApp: {
        enabled: true,
        showProgressiveProfiling: true,
        showTips: true,
        showCelebrations: true,
      },
    },
    interfaceComplexity: 'standard',
    onboarding: {
      responses: [],
      classifiedPersona: 'unclassified',
      classificationConfidence: 0,
      timeToComplete: 0,
    },
    lastActiveAt: now,
    updatedAt: now,
    version: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProfileRequest {
  userId: string;
}

export interface UpdateProfileRequest {
  personaType?: PersonaType;
  industry?: Industry;
  role?: string;
  teamSize?: TeamSize;
  aiExperienceLevel?: AIExperienceLevel;
  aiUsageFrequency?: AIUsageFrequency;
  primaryUseCases?: string[];
  compliance?: Partial<ComplianceContext>;
  dashboardPreferences?: Partial<DashboardPreferences>;
  notificationPreferences?: Partial<NotificationPreferences>;
  interfaceComplexity?: InterfaceComplexity;
}

export interface ProfileResponse {
  profile: ForgeUserProfile;
  computedDashboard: DashboardConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING API TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingQuestion {
  questionId: string;
  questionText: string;
  options: { value: string; label: string; routesTo?: PersonaType }[];
  conditionalOn?: { questionId: string; selectedValue: string };
}

export interface SubmitOnboardingRequest {
  userId: string;
  responses: OnboardingResponse[];
}

export interface SubmitOnboardingResponse {
  classifiedPersona: PersonaType;
  confidence: number;
  dashboardConfig: DashboardConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIORAL SIGNAL TYPES (US-15.6, US-15.7)
// ─────────────────────────────────────────────────────────────────────────────

export type SignalType =
  // Task lifecycle
  | 'task_started'
  | 'task_completed'
  | 'task_abandoned'

  // Output evaluation
  | 'output_accepted'
  | 'output_rejected'

  // Help & discovery
  | 'help_requested'
  | 'feature_discovered'
  | 'feature_ignored'

  // Navigation
  | 'page_viewed'
  | 'widget_interacted'

  // Persona signals
  | 'persona_override'
  | 'progressive_question_answered'
  | 'progressive_question_skipped';

export interface BehaviorSignal {
  id: string;
  userId: string;
  sessionId: string;
  signalType: SignalType;
  context?: Record<string, unknown>;
  clientVersion?: string;
  platform?: string;
  createdAt: Date;
}

export interface SignalBatch {
  signals: BehaviorSignal[];
  batchId: string;
  clientTimestamp: Date;
}

export interface IngestSignalsRequest {
  batch: SignalBatch;
}

export interface IngestSignalsResponse {
  accepted: number;
  rejected: number;
  errors?: { signalId: string; reason: string }[];
}

// Critical signals exempt from throttling
export const CRITICAL_SIGNALS: SignalType[] = [
  'task_completed',
  'task_abandoned',
  'error_encountered' as SignalType, // Will be added to type if needed
];

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSIVE PROFILING TYPES (US-15.7)
// ─────────────────────────────────────────────────────────────────────────────

export type ProgressiveTrigger =
  | 'first_complex_task'
  | 'first_failure'
  | 'first_success'
  | 'day_7_checkin';

export interface ProgressiveQuestion {
  id: string;
  trigger: ProgressiveTrigger;
  questionText: string;
  inputType: 'text' | 'select' | 'rating';
  options?: string[];
  skippable: boolean;
}

export interface ProgressiveQuestionRecord {
  questionId: string;
  trigger: ProgressiveTrigger;
  askedAt: Date;
  answeredAt?: Date;
  response?: string;
  skipped: boolean;
}

export const PROGRESSIVE_QUESTIONS: ProgressiveQuestion[] = [
  {
    id: 'pq-first-complex',
    trigger: 'first_complex_task',
    questionText: "What's the context for this project?",
    inputType: 'text',
    skippable: true,
  },
  {
    id: 'pq-first-failure',
    trigger: 'first_failure',
    questionText: 'What went wrong?',
    inputType: 'text',
    skippable: true,
  },
  {
    id: 'pq-first-success',
    trigger: 'first_success',
    questionText: 'What made this work?',
    inputType: 'text',
    skippable: true,
  },
  {
    id: 'pq-day-7',
    trigger: 'day_7_checkin',
    questionText: "How's Forge working for you?",
    inputType: 'rating',
    options: ['1', '2', '3', '4', '5'],
    skippable: true,
  },
];
