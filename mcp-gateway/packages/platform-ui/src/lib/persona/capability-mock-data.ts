// ============================================================================
// CAPABILITY DASHBOARD MOCK DATA
// Epic 15: P3 Dashboard (Frontier Navigator)
// ============================================================================

import {
  FrontierMapData,
  CalibrationHistory,
  RecentTask,
  ExperimentalFeature,
  TaskAnalysisResult,
} from './capability-types';

export const mockFrontierMap: FrontierMapData = {
  zones: [
    {
      zone: 'ai-alone',
      name: 'AI-Alone Zone',
      reliabilityRange: '95%+',
      examples: ['CRUD UI', 'Form Layouts', 'Data Tables', 'Basic Styling', 'Simple Components'],
      color: '#22C55E', // green
    },
    {
      zone: 'hybrid',
      name: 'Hybrid Zone',
      reliabilityRange: '70-95%',
      examples: ['Complex Logic', 'API Integration', 'State Management', 'Custom Hooks', 'Multi-step Forms'],
      color: '#7C3AED', // purple
    },
    {
      zone: 'human-alone',
      name: 'Human-Alone Zone',
      reliabilityRange: '<70%',
      examples: ['Novel Algorithms', 'Ambiguous Requirements', 'Creative Design', 'Edge Cases', 'Domain-specific Logic'],
      color: '#F59E0B', // amber
    },
  ],
  lastUpdated: '2026-01-26T00:00:00Z',
};

export const mockCalibrationHistory: CalibrationHistory = {
  currentAccuracy: 92,
  trendPercent: 4,
  calibrationLevel: 'expert',
  dataPoints: [
    { date: '2025-12-27', accuracy: 78 },
    { date: '2026-01-01', accuracy: 80 },
    { date: '2026-01-05', accuracy: 83 },
    { date: '2026-01-10', accuracy: 85 },
    { date: '2026-01-15', accuracy: 88 },
    { date: '2026-01-20', accuracy: 90 },
    { date: '2026-01-25', accuracy: 91 },
    { date: '2026-01-26', accuracy: 92 },
  ],
};

export const mockRecentTasks: RecentTask[] = [
  {
    id: 'task-001',
    name: 'Complex Dashboard',
    workflowType: 'Hybrid',
    confidenceScore: 78,
    actualOutcome: 'correct',
    completedAt: '2026-01-26T10:30:00Z',
  },
  {
    id: 'task-002',
    name: 'Simple Form',
    workflowType: 'AI-Alone',
    confidenceScore: 95,
    actualOutcome: 'correct',
    completedAt: '2026-01-26T09:15:00Z',
  },
  {
    id: 'task-003',
    name: 'API Client',
    workflowType: 'Human Review',
    confidenceScore: 62,
    actualOutcome: 'partial',
    completedAt: '2026-01-25T16:45:00Z',
  },
  {
    id: 'task-004',
    name: 'Data Table Component',
    workflowType: 'AI-Alone',
    confidenceScore: 94,
    actualOutcome: 'correct',
    completedAt: '2026-01-25T14:20:00Z',
  },
  {
    id: 'task-005',
    name: 'Custom Animation',
    workflowType: 'Hybrid',
    confidenceScore: 71,
    actualOutcome: 'wrong',
    completedAt: '2026-01-24T11:00:00Z',
  },
];

export const mockExperimentalFeatures: ExperimentalFeature[] = [
  {
    id: 'feat-001',
    name: 'Multi-file Generation',
    description: 'Generate entire component libraries in one go',
    stage: 'beta',
    tryUrl: '/experiments/multi-file',
  },
  {
    id: 'feat-002',
    name: 'Voice-to-Code',
    description: 'Describe components verbally, get code instantly',
    stage: 'alpha',
    tryUrl: '/experiments/voice-to-code',
  },
  {
    id: 'feat-003',
    name: 'Design System Import',
    description: 'Import your Figma design tokens automatically',
    stage: 'coming-soon',
  },
  {
    id: 'feat-004',
    name: 'Collaborative Sessions',
    description: 'Work on the same project with teammates in real-time',
    stage: 'alpha',
    tryUrl: '/experiments/collab',
  },
];

export function mockAnalyzeTask(taskDescription: string): TaskAnalysisResult {
  // Simple mock analysis based on keywords
  const desc = taskDescription.toLowerCase();

  let complexityScore = 3;
  let recommendedWorkflow: TaskAnalysisResult['recommendedWorkflow'] = 'Hybrid';
  let reasoning = 'This task has moderate complexity.';
  const confidenceFactors: string[] = [];

  // Simple keyword-based scoring
  if (desc.includes('simple') || desc.includes('basic') || desc.includes('crud')) {
    complexityScore = 1;
    recommendedWorkflow = 'AI-Alone';
    reasoning = 'This is a straightforward task well-suited for AI generation.';
    confidenceFactors.push('Standard patterns', 'Clear requirements');
  } else if (desc.includes('complex') || desc.includes('custom') || desc.includes('algorithm')) {
    complexityScore = 4;
    recommendedWorkflow = 'Hybrid';
    reasoning = 'This task has complexity that benefits from human oversight.';
    confidenceFactors.push('Custom logic required', 'Multiple dependencies');
  } else if (desc.includes('novel') || desc.includes('creative') || desc.includes('ambiguous')) {
    complexityScore = 5;
    recommendedWorkflow = 'Human Review';
    reasoning = 'This task requires significant human judgment and creativity.';
    confidenceFactors.push('Ambiguous requirements', 'Creative decisions needed');
  } else {
    confidenceFactors.push('Moderate complexity', 'Standard patterns with customization');
  }

  return {
    complexityScore,
    recommendedWorkflow,
    reasoning,
    confidenceFactors,
  };
}
