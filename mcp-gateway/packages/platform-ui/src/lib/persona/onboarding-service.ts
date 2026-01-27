// ============================================================================
// ONBOARDING SERVICE
// Epic 15: Persona Foundation
// ============================================================================

import {
  OnboardingQuestion,
  OnboardingResponse,
  SubmitOnboardingRequest,
  SubmitOnboardingResponse,
  PersonaType,
  DashboardConfig,
} from './types';
import { getProfile, updateProfile } from './profile-service';

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const QUESTIONS: OnboardingQuestion[] = [
  // Q1: Primary routing question
  {
    questionId: 'q1-motivation',
    questionText: 'What brought you to Forge today?',
    options: [
      { value: 'disappointed', label: 'AI tools have disappointed me before', routesTo: 'disappointed' },
      { value: 'compliance', label: 'I need security and compliance guarantees', routesTo: 'hesitant' },
      { value: 'unpredictable', label: 'AI results feel unpredictable', routesTo: 'frontier' },
      { value: 'new', label: "I'm new to AI tools", routesTo: 'beginner' },
    ],
  },

  // Q2 variants by persona
  {
    questionId: 'q2-disappointed',
    questionText: 'What frustrated you most about previous AI tools?',
    options: [
      { value: 'quality', label: 'Output quality was inconsistent' },
      { value: 'iterations', label: 'Too many iterations to get it right' },
      { value: 'wasted-time', label: 'Wasted time on failed attempts' },
      { value: 'trust', label: "Couldn't trust the results" },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'disappointed' },
  },
  {
    questionId: 'q2-hesitant',
    questionText: 'What compliance frameworks matter most to you?',
    options: [
      { value: 'soc2', label: 'SOC 2' },
      { value: 'hipaa', label: 'HIPAA' },
      { value: 'cmmc', label: 'CMMC / Government' },
      { value: 'gdpr', label: 'GDPR / Privacy' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'compliance' },
  },
  {
    questionId: 'q2-frontier',
    questionText: 'How do you currently handle AI unpredictability?',
    options: [
      { value: 'avoid-complex', label: 'I avoid complex tasks' },
      { value: 'heavy-review', label: 'Heavy human review on everything' },
      { value: 'trial-error', label: 'Trial and error each time' },
      { value: 'want-better', label: "I want a better approach" },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'unpredictable' },
  },
  {
    questionId: 'q2-beginner',
    questionText: 'What do you want to create with AI?',
    options: [
      { value: 'websites', label: 'Websites and landing pages' },
      { value: 'dashboards', label: 'Dashboards and admin panels' },
      { value: 'apps', label: 'Web applications' },
      { value: 'exploring', label: "I'm still exploring" },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'new' },
  },

  // Q3 variants by persona
  {
    questionId: 'q3-disappointed',
    questionText: 'How often do you need to use AI tools?',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'A few times a week' },
      { value: 'monthly', label: 'A few times a month' },
      { value: 'project', label: 'Only for specific projects' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'disappointed' },
  },
  {
    questionId: 'q3-hesitant',
    questionText: 'Does your organization have AI usage policies?',
    options: [
      { value: 'strict', label: 'Yes, strict policies' },
      { value: 'some', label: 'Some guidelines' },
      { value: 'developing', label: 'Still developing them' },
      { value: 'none', label: 'No formal policies' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'compliance' },
  },
  {
    questionId: 'q3-frontier',
    questionText: 'What level of AI involvement do you prefer?',
    options: [
      { value: 'ai-lead', label: 'AI leads, I review' },
      { value: 'hybrid', label: 'Collaborative - AI and me together' },
      { value: 'human-lead', label: 'I lead, AI assists' },
      { value: 'depends', label: 'Depends on the task' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'unpredictable' },
  },
  {
    questionId: 'q3-beginner',
    questionText: 'How would you describe your technical background?',
    options: [
      { value: 'developer', label: 'Software developer' },
      { value: 'designer', label: 'Designer' },
      { value: 'pm', label: 'Product/Project manager' },
      { value: 'non-tech', label: 'Non-technical' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'new' },
  },

  // Q4 variants by persona
  {
    questionId: 'q4-disappointed',
    questionText: 'What would make you trust AI tools again?',
    options: [
      { value: 'reliability', label: 'Consistent, predictable results' },
      { value: 'templates', label: 'Proven templates that work' },
      { value: 'support', label: 'Good support when things go wrong' },
      { value: 'transparency', label: 'Clear about what AI can/cannot do' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'disappointed' },
  },
  {
    questionId: 'q4-hesitant',
    questionText: 'What data sensitivity level will you work with?',
    options: [
      { value: 'public', label: 'Mostly public data' },
      { value: 'internal', label: 'Internal business data' },
      { value: 'confidential', label: 'Confidential/PII data' },
      { value: 'restricted', label: 'Highly restricted data' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'compliance' },
  },
  {
    questionId: 'q4-frontier',
    questionText: 'Would you be interested in calibration exercises?',
    options: [
      { value: 'yes', label: "Yes, I want to improve my AI judgment" },
      { value: 'maybe', label: 'Maybe, if they are quick' },
      { value: 'no', label: 'No, I just want to work' },
      { value: 'advanced', label: 'Yes, including advanced analytics' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'unpredictable' },
  },
  {
    questionId: 'q4-beginner',
    questionText: 'How much guidance would you like?',
    options: [
      { value: 'lots', label: 'Walk me through everything' },
      { value: 'some', label: 'Some tips along the way' },
      { value: 'minimal', label: 'Minimal - I learn by doing' },
      { value: 'adaptive', label: 'Adapt to my pace' },
    ],
    conditionalOn: { questionId: 'q1-motivation', selectedValue: 'new' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SERVICE API
// ─────────────────────────────────────────────────────────────────────────────

export function getOnboardingQuestions(track?: PersonaType): OnboardingQuestion[] {
  if (!track) {
    // Return only Q1 initially
    return QUESTIONS.filter((q) => q.questionId === 'q1-motivation');
  }

  // Return Q1 + persona-specific Q2-Q4
  const trackValue = track === 'disappointed' ? 'disappointed' :
                    track === 'hesitant' ? 'compliance' :
                    track === 'frontier' ? 'unpredictable' :
                    'new';

  return QUESTIONS.filter((q) =>
    q.questionId === 'q1-motivation' ||
    q.conditionalOn?.selectedValue === trackValue
  );
}

export function getNextQuestion(
  responses: OnboardingResponse[]
): OnboardingQuestion | null {
  // Find answered question IDs
  const answeredIds = new Set(responses.map((r) => r.questionId));

  // Get Q1 answer to determine track
  const q1Response = responses.find((r) => r.questionId === 'q1-motivation');
  if (!q1Response) {
    return QUESTIONS.find((q) => q.questionId === 'q1-motivation') || null;
  }

  // Find next unanswered question in the track
  const trackQuestions = QUESTIONS.filter((q) =>
    q.questionId === 'q1-motivation' ||
    q.conditionalOn?.selectedValue === q1Response.selectedOption
  );

  return trackQuestions.find((q) => !answeredIds.has(q.questionId)) || null;
}

export function classifyPersona(responses: OnboardingResponse[]): {
  persona: PersonaType;
  confidence: number;
} {
  const q1Response = responses.find((r) => r.questionId === 'q1-motivation');

  if (!q1Response) {
    return { persona: 'unclassified', confidence: 0 };
  }

  // Map Q1 answer to persona
  const personaMap: Record<string, PersonaType> = {
    disappointed: 'disappointed',
    compliance: 'hesitant',
    unpredictable: 'frontier',
    new: 'beginner',
  };

  const persona = personaMap[q1Response.selectedOption] || 'unclassified';

  // Confidence based on how many questions answered
  const trackQuestions = getOnboardingQuestions(persona);
  const answeredCount = responses.length;
  const totalCount = trackQuestions.length;
  const confidence = answeredCount / totalCount;

  return { persona, confidence };
}

export async function submitOnboarding(
  request: SubmitOnboardingRequest
): Promise<SubmitOnboardingResponse> {
  const { userId, responses } = request;
  const startTime = Date.now();

  // Classify persona
  const { persona, confidence } = classifyPersona(responses);

  // Update profile
  const profileResponse = await getProfile(userId);
  if (!profileResponse) {
    throw new Error(`Profile not found for user ${userId}`);
  }

  const completedAt = new Date();
  const timeToComplete = Math.round((Date.now() - startTime) / 1000);

  await updateProfile(userId, {
    personaType: persona,
  });

  // Update onboarding data directly
  const profile = profileResponse.profile;
  profile.onboarding = {
    completedAt,
    responses,
    classifiedPersona: persona,
    classificationConfidence: confidence,
    timeToComplete,
  };

  // Get dashboard config for the persona
  const updatedProfile = await getProfile(userId);
  if (!updatedProfile) {
    throw new Error(`Profile not found after update for user ${userId}`);
  }

  return {
    classifiedPersona: persona,
    confidence,
    dashboardConfig: updatedProfile.computedDashboard,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { QUESTIONS };
