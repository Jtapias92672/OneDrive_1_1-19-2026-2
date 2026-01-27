/**
 * Complexity Analysis Types
 * Epic 14: Task complexity scoring
 */

export interface ComplexityFactors {
  codeSize: number; // 0-100: Lines of code affected
  dependencies: number; // 0-100: Number of dependencies
  contextRequired: number; // 0-100: Amount of context needed
  novelty: number; // 0-100: How novel/unique the task is
  riskLevel: number; // 0-100: Potential for breaking changes
}

export interface ComplexityResult {
  score: number; // 0-100 overall complexity
  level: 'low' | 'medium' | 'high' | 'extreme';
  factors: ComplexityFactors;
  breakdown: FactorBreakdown[];
  recommendedWorkflow: 'autonomous' | 'supervised' | 'human-required';
  estimatedDuration: string;
  warnings: string[];
}

export interface FactorBreakdown {
  name: keyof ComplexityFactors;
  score: number;
  weight: number;
  contribution: number;
  description: string;
}

export interface ComplexityInput {
  description: string;
  fileCount?: number;
  linesChanged?: number;
  dependencyCount?: number;
  isNewFeature?: boolean;
  affectsPublicApi?: boolean;
  hasSecurityImplications?: boolean;
  requiresExternalData?: boolean;
}
