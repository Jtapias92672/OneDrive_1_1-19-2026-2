/**
 * E2E Integration Tests Index
 * Epic 12: End-to-End Testing Framework
 */

export * from './types';

// Re-export test utilities
export const E2E_VERSION = '1.0.0';

export const E2E_STAGES = [
  'figma-input',
  'ast-parse',
  'react-generate',
  'orchestration',
  'mendix-export',
  'governance',
  'accuracy',
] as const;

export const EPIC_COVERAGE = {
  'Epic 05': ['figma-input', 'ast-parse'],
  'Epic 06': ['react-generate'],
  'Epic 07': ['orchestration'],
  'Epic 11': ['mendix-export'],
  'Epic 13': ['governance'],
  'Epic 14': ['accuracy'],
} as const;
