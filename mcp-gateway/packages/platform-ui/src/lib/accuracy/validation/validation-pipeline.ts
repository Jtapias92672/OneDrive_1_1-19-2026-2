/**
 * Validation Pipeline
 * Epic 14: Orchestrates tier escalation for claim validation
 */

import { ClaimCategory, DetectedClaim } from '../claims/types';
import {
  ValidationResult,
  ValidationOptions,
  ContentValidation,
  ContentConfidence,
  ConfidenceFactor,
  ValidationTier,
} from './types';
import { Tier1Validator } from './tier1-validator';
import { Tier2Validator } from './tier2-validator';
import { Tier3Validator } from './tier3-validator';
import { ValidationStore } from './validation-store';

let contentIdCounter = 0;

function generateContentId(): string {
  return `content-${Date.now()}-${++contentIdCounter}`;
}

export class ValidationPipeline {
  constructor(
    private tier1: Tier1Validator,
    private tier2: Tier2Validator,
    private tier3: Tier3Validator,
    private store: ValidationStore
  ) {}

  /**
   * Validate a list of claims with tier escalation
   */
  async validate(
    claims: DetectedClaim[],
    options: ValidationOptions = {}
  ): Promise<ContentValidation> {
    const { allowWolfram = true, maxWolframCalls = 10, cacheResults = true } = options;

    const results: ValidationResult[] = [];
    let wolframCalls = 0;
    let totalCost = 0;

    for (const claim of claims) {
      let result: ValidationResult | null = null;

      // Tier 1: Local/Static validation (free, instant)
      result = await this.tier1.validate(claim);

      // Tier 2: Knowledge Base + Cache (if Tier 1 didn't verify)
      if (!result || result.status !== 'verified') {
        const tier2Result = await this.tier2.validate(claim);
        if (tier2Result) {
          // Only replace if tier2 is better
          if (!result || tier2Result.confidence > result.confidence) {
            result = tier2Result;
          }
        }
      }

      // Tier 3: Wolfram Alpha (if still not verified and budget permits)
      if (
        (!result || result.status !== 'verified') &&
        allowWolfram &&
        wolframCalls < maxWolframCalls
      ) {
        const tier3Result = await this.tier3.validate(claim);
        wolframCalls++;
        totalCost += tier3Result.wolframCost;

        // Only replace if tier3 is better
        if (!result || tier3Result.confidence > result.confidence) {
          result = tier3Result;
        }
      }

      // Fallback: Unverified
      if (!result) {
        result = this.createUnverifiedResult(claim);
      }

      results.push(result);
    }

    // Calculate overall confidence
    const confidence = this.calculateContentConfidence(results);
    const contentId = claims[0]?.id || generateContentId();

    const validation: ContentValidation = {
      contentId,
      claims: results,
      confidence,
      totalCost,
      validatedAt: new Date(),
    };

    // Store results
    if (cacheResults) {
      await this.store.saveContentValidation(validation);
    }

    return validation;
  }

  /**
   * Create fallback unverified result
   */
  private createUnverifiedResult(claim: DetectedClaim): ValidationResult {
    return {
      claimId: claim.id,
      claim,
      tier: 0 as ValidationTier,
      source: 'none',
      status: 'unverified',
      match: false,
      confidence: 20,
      confidenceFactors: [
        {
          name: 'no-validation',
          weight: 1,
          score: 20,
          reason: 'Could not validate at any tier',
        },
      ],
      wolframUsed: false,
      wolframCost: 0,
      validatedAt: new Date(),
    };
  }

  /**
   * Calculate overall content confidence from validation results
   */
  private calculateContentConfidence(results: ValidationResult[]): ContentConfidence {
    if (results.length === 0) {
      return {
        contentId: '',
        overallScore: 100,
        level: 'high',
        claimCount: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        failedCount: 0,
        categoryScores: this.emptyCategoryScores(),
        factors: [],
      };
    }

    const verified = results.filter((r) => r.status === 'verified').length;
    const unverified = results.filter((r) => r.status === 'unverified').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    // Base score from verification rate
    const verificationRate = verified / results.length;
    const baseScore = verificationRate * 100;

    // Penalties
    const failurePenalty = (failed / results.length) * 30;
    const unverifiedPenalty = (unverified / results.length) * 10;

    const overallScore = Math.max(0, Math.round(baseScore - failurePenalty - unverifiedPenalty));

    return {
      contentId: results[0]?.claim?.id || '',
      overallScore,
      level: this.determineLevel(overallScore),
      claimCount: results.length,
      verifiedCount: verified,
      unverifiedCount: unverified,
      failedCount: failed,
      categoryScores: this.calculateCategoryScores(results),
      factors: this.buildFactors(results),
    };
  }

  /**
   * Determine confidence level
   */
  private determineLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate scores per category
   */
  private calculateCategoryScores(results: ValidationResult[]): Record<ClaimCategory, number> {
    const scores: Record<ClaimCategory, { total: number; verified: number }> = {
      mathematical: { total: 0, verified: 0 },
      scientific: { total: 0, verified: 0 },
      temporal: { total: 0, verified: 0 },
      quantitative: { total: 0, verified: 0 },
      technical: { total: 0, verified: 0 },
      factual: { total: 0, verified: 0 },
    };

    for (const result of results) {
      const cat = result.claim.category;
      scores[cat].total++;
      if (result.status === 'verified') {
        scores[cat].verified++;
      }
    }

    const categoryScores: Record<ClaimCategory, number> = {} as Record<ClaimCategory, number>;
    for (const [cat, { total, verified }] of Object.entries(scores)) {
      categoryScores[cat as ClaimCategory] = total > 0 ? Math.round((verified / total) * 100) : 100;
    }

    return categoryScores;
  }

  /**
   * Build confidence factors
   */
  private buildFactors(results: ValidationResult[]): ConfidenceFactor[] {
    const verified = results.filter((r) => r.status === 'verified').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return [
      {
        name: 'verification-rate',
        weight: 0.5,
        score: Math.round((verified / results.length) * 100),
        reason: `${verified}/${results.length} claims verified`,
      },
      {
        name: 'failure-rate',
        weight: 0.3,
        score: Math.round(100 - (failed / results.length) * 100),
        reason: failed > 0 ? `${failed} claims failed verification` : 'No failures',
      },
      {
        name: 'tier-quality',
        weight: 0.2,
        score: this.calculateTierQuality(results),
        reason: 'Weighted by validation source authority',
      },
    ];
  }

  /**
   * Calculate tier quality score
   */
  private calculateTierQuality(results: ValidationResult[]): number {
    if (results.length === 0) return 100;

    const tierWeights: Record<ValidationTier, number> = { 0: 20, 1: 70, 2: 85, 3: 100 };
    const totalWeight = results.reduce((sum, r) => sum + (tierWeights[r.tier] || 20), 0);
    return Math.round(totalWeight / results.length);
  }

  /**
   * Empty category scores
   */
  private emptyCategoryScores(): Record<ClaimCategory, number> {
    return {
      mathematical: 100,
      scientific: 100,
      temporal: 100,
      quantitative: 100,
      technical: 100,
      factual: 100,
    };
  }
}
