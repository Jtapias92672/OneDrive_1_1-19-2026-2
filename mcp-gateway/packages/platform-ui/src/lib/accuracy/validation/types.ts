/**
 * Validation Types
 * Epic 14: Multi-Tier Validation
 */

import { ClaimCategory, DetectedClaim } from '../claims/types';

export type ValidationStatus = 'verified' | 'unverified' | 'partial' | 'failed';
export type ValidationTier = 0 | 1 | 2 | 3;

export interface ConfidenceFactor {
  name: string;
  weight: number;
  score: number;
  reason: string;
}

export interface ValidationResult {
  claimId: string;
  claim: DetectedClaim;

  tier: ValidationTier;
  source: string;
  status: ValidationStatus;

  expectedValue?: string;
  actualValue?: string;
  match: boolean;

  confidence: number;
  confidenceFactors: ConfidenceFactor[];

  wolframUsed: boolean;
  wolframCost: number;

  validatedAt: Date;
}

export interface ValidationOptions {
  allowWolfram?: boolean;
  maxWolframCalls?: number;
  cacheResults?: boolean;
}

export interface ContentConfidence {
  contentId: string;
  overallScore: number;
  level: 'high' | 'medium' | 'low';

  claimCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  failedCount: number;

  categoryScores: Record<ClaimCategory, number>;
  factors: ConfidenceFactor[];
}

export interface ContentValidation {
  contentId: string;
  claims: ValidationResult[];
  confidence: ContentConfidence;
  totalCost: number;
  validatedAt: Date;
}
