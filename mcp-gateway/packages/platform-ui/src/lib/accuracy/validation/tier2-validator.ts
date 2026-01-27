/**
 * Tier 2 Validator - Knowledge Base + Cache
 * Epic 14: Fast validation using cached results and internal facts
 */

import { DetectedClaim } from '../claims/types';
import { ValidationResult, ConfidenceFactor } from './types';
import { KnowledgeBase, KnowledgeFact } from './knowledge-base';
import { WolframCache } from '../wolfram/wolfram-cache';

export class Tier2Validator {
  constructor(
    private knowledgeBase: KnowledgeBase,
    private wolframCache: WolframCache
  ) {}

  /**
   * Attempt to validate claim from knowledge base or cache
   */
  async validate(claim: DetectedClaim): Promise<ValidationResult | null> {
    // Check knowledge base first
    const kbResult = await this.validateFromKnowledgeBase(claim);
    if (kbResult) return kbResult;

    // Check Wolfram cache
    const cachedResult = await this.validateFromCache(claim);
    if (cachedResult) return cachedResult;

    return null;
  }

  /**
   * Validate against knowledge base
   */
  private async validateFromKnowledgeBase(claim: DetectedClaim): Promise<ValidationResult | null> {
    const fact = await this.knowledgeBase.lookup(claim.text);
    if (!fact) return null;

    // Check if the claim contains the expected value
    const claimContainsValue = claim.text.toLowerCase().includes(fact.value.toLowerCase());

    return this.formatResult(claim, {
      source: 'knowledge-base',
      value: fact.value,
      confidence: fact.confidence,
      match: claimContainsValue,
    });
  }

  /**
   * Validate against Wolfram cache
   */
  private async validateFromCache(claim: DetectedClaim): Promise<ValidationResult | null> {
    const cached = await this.wolframCache.get(claim.text);
    if (!cached || !cached.success || !cached.result) return null;

    // Compare cached result with claim
    const match = this.compareValues(claim.text, cached.result);

    return this.formatResult(claim, {
      source: 'wolfram-cache',
      value: cached.result,
      confidence: match ? 90 : 60,
      match,
    });
  }

  /**
   * Compare claim text with expected value
   */
  private compareValues(claimText: string, expectedValue: string): boolean {
    const claimLower = claimText.toLowerCase();
    const expectedLower = expectedValue.toLowerCase();

    // Check if expected value is contained in claim
    if (claimLower.includes(expectedLower) || expectedLower.includes(claimLower)) {
      return true;
    }

    // Extract and compare numbers
    const claimNumbers = claimText.match(/[\d.]+/g)?.map(Number) || [];
    const expectedNumbers = expectedValue.match(/[\d.]+/g)?.map(Number) || [];

    if (claimNumbers.length > 0 && expectedNumbers.length > 0) {
      return claimNumbers.some((cn) =>
        expectedNumbers.some((en) => {
          if (cn === 0 && en === 0) return true;
          const maxVal = Math.max(Math.abs(cn), Math.abs(en));
          return maxVal > 0 && Math.abs(cn - en) / maxVal < 0.01;
        })
      );
    }

    return false;
  }

  /**
   * Format validation result
   */
  private formatResult(
    claim: DetectedClaim,
    data: {
      source: string;
      value: string;
      confidence: number;
      match: boolean;
    }
  ): ValidationResult {
    const factors: ConfidenceFactor[] = [
      {
        name: data.source,
        weight: 1,
        score: data.confidence,
        reason: `Retrieved from ${data.source}`,
      },
    ];

    if (!data.match) {
      factors.push({
        name: 'value-mismatch',
        weight: 0.5,
        score: 50,
        reason: 'Value found but may not exactly match claim',
      });
    }

    return {
      claimId: claim.id,
      claim,
      tier: 2,
      source: data.source,
      status: data.match ? 'verified' : 'partial',
      expectedValue: data.value,
      actualValue: claim.text,
      match: data.match,
      confidence: data.match ? data.confidence : Math.round(data.confidence * 0.7),
      confidenceFactors: factors,
      wolframUsed: false,
      wolframCost: 0,
      validatedAt: new Date(),
    };
  }
}
