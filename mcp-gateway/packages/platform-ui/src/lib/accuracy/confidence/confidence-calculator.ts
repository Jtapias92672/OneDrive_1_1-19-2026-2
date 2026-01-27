/**
 * Confidence Calculator
 * Epic 14: Calculate and display confidence scores
 */

import { ValidationResult, ContentConfidence, ConfidenceFactor } from '../validation/types';
import { ClaimCategory } from '../claims/types';

export class ConfidenceCalculator {
  /**
   * Calculate content confidence from validation results
   */
  calculate(validations: ValidationResult[], contentId?: string): ContentConfidence {
    if (validations.length === 0) {
      return this.emptyConfidence(contentId || '');
    }

    const verified = validations.filter((v) => v.status === 'verified').length;
    const unverified = validations.filter((v) => v.status === 'unverified').length;
    const failed = validations.filter((v) => v.status === 'failed').length;

    // Calculate base score
    const verificationRate = verified / validations.length;
    const baseScore = verificationRate * 100;

    // Apply penalties
    const failurePenalty = (failed / validations.length) * 30;
    const unverifiedPenalty = (unverified / validations.length) * 10;

    const overallScore = Math.max(0, Math.round(baseScore - failurePenalty - unverifiedPenalty));

    return {
      contentId: contentId || validations[0]?.claim?.id || '',
      overallScore,
      level: this.getLevel(overallScore),
      claimCount: validations.length,
      verifiedCount: verified,
      unverifiedCount: unverified,
      failedCount: failed,
      categoryScores: this.calculateCategoryScores(validations),
      factors: this.buildFactors(validations),
    };
  }

  /**
   * Get confidence level
   */
  getLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get display label for confidence score
   */
  getLabel(score: number): string {
    if (score >= 90) return 'Very High';
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'Low';
    return 'Very Low';
  }

  /**
   * Get color for confidence display
   */
  getColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 80) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
  }

  /**
   * Get hex color for confidence
   */
  getHexColor(score: number): string {
    if (score >= 80) return '#22C55E'; // green-500
    if (score >= 50) return '#EAB308'; // yellow-500
    return '#EF4444'; // red-500
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(validations: ValidationResult[]): Record<ClaimCategory, number> {
    const scores: Record<ClaimCategory, { total: number; verified: number }> = {
      mathematical: { total: 0, verified: 0 },
      scientific: { total: 0, verified: 0 },
      temporal: { total: 0, verified: 0 },
      quantitative: { total: 0, verified: 0 },
      technical: { total: 0, verified: 0 },
      factual: { total: 0, verified: 0 },
    };

    for (const validation of validations) {
      const cat = validation.claim.category;
      scores[cat].total++;
      if (validation.status === 'verified') {
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
  private buildFactors(validations: ValidationResult[]): ConfidenceFactor[] {
    const verified = validations.filter((v) => v.status === 'verified').length;
    const failed = validations.filter((v) => v.status === 'failed').length;

    return [
      {
        name: 'verification-rate',
        weight: 0.5,
        score: Math.round((verified / validations.length) * 100),
        reason: `${verified}/${validations.length} claims verified`,
      },
      {
        name: 'failure-rate',
        weight: 0.3,
        score: Math.round(100 - (failed / validations.length) * 100),
        reason: failed > 0 ? `${failed} claims failed verification` : 'No failures',
      },
      {
        name: 'source-authority',
        weight: 0.2,
        score: this.calculateAuthorityScore(validations),
        reason: 'Weighted by validation source authority',
      },
    ];
  }

  /**
   * Calculate authority score based on tiers used
   */
  private calculateAuthorityScore(validations: ValidationResult[]): number {
    if (validations.length === 0) return 100;

    const tierWeights = { 0: 20, 1: 70, 2: 85, 3: 100 };
    const totalWeight = validations.reduce(
      (sum, v) => sum + (tierWeights[v.tier as keyof typeof tierWeights] || 20),
      0
    );
    return Math.round(totalWeight / validations.length);
  }

  /**
   * Empty confidence for no validations
   */
  private emptyConfidence(contentId: string): ContentConfidence {
    return {
      contentId,
      overallScore: 100,
      level: 'high',
      claimCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      failedCount: 0,
      categoryScores: {
        mathematical: 100,
        scientific: 100,
        temporal: 100,
        quantitative: 100,
        technical: 100,
        factual: 100,
      },
      factors: [],
    };
  }
}

export const confidenceCalculator = new ConfidenceCalculator();
