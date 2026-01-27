/**
 * Tier 3 Validator - Wolfram Alpha
 * Epic 14: Authoritative validation via external API
 */

import { DetectedClaim } from '../claims/types';
import { ValidationResult, ConfidenceFactor } from './types';
import { WolframClient, WolframResult } from '../wolfram';

export class Tier3Validator {
  constructor(private wolframClient: WolframClient) {}

  /**
   * Validate claim using Wolfram Alpha
   */
  async validate(claim: DetectedClaim): Promise<ValidationResult> {
    const query = this.formatQuery(claim);
    const result = await this.wolframClient.query(query);

    const match = result.success ? this.compareResults(claim.text, result.result) : false;

    return {
      claimId: claim.id,
      claim,
      tier: 3,
      source: 'wolfram-alpha',
      status: this.determineStatus(result, match),
      expectedValue: result.result,
      actualValue: claim.text,
      match,
      confidence: this.calculateConfidence(result, match),
      confidenceFactors: this.buildFactors(result, match),
      wolframUsed: true,
      wolframCost: result.cost,
      validatedAt: new Date(),
    };
  }

  /**
   * Format claim into Wolfram query
   */
  private formatQuery(claim: DetectedClaim): string {
    const text = claim.text;

    switch (claim.category) {
      case 'mathematical':
        // Extract equation for direct calculation
        const mathMatch = text.match(/[\d\+\-\*\/\^\(\)\s.]+/);
        if (mathMatch) {
          return `calculate ${mathMatch[0].trim()}`;
        }
        return `calculate ${text}`;

      case 'scientific':
        // For constants and scientific facts
        if (/speed of light/i.test(text)) {
          return 'speed of light in m/s';
        }
        if (/avogadro/i.test(text)) {
          return "Avogadro's number";
        }
        return `what is ${text}`;

      case 'temporal':
        // For dates and events
        if (/released|founded|created|invented/i.test(text)) {
          return text.replace(/was\s+/i, '');
        }
        return `when was ${text}`;

      case 'quantitative':
        // For unit conversions and measurements
        return text;

      case 'technical':
        // For technical specs
        return text;

      case 'factual':
        // For general facts
        return text;

      default:
        return text;
    }
  }

  /**
   * Compare claim text with Wolfram result
   */
  private compareResults(claimText: string, wolframResult?: string): boolean {
    if (!wolframResult) return false;

    const claimLower = claimText.toLowerCase();
    const resultLower = wolframResult.toLowerCase();

    // Direct text containment
    if (claimLower.includes(resultLower) || resultLower.includes(claimLower)) {
      return true;
    }

    // Extract and compare numbers
    const claimNumbers = claimText.match(/[\d,]+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
    const resultNumbers = wolframResult.match(/[\d,]+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];

    if (claimNumbers.length === 0 || resultNumbers.length === 0) {
      return false;
    }

    // Parse numbers (remove commas)
    const claimNums = claimNumbers.map((n) => parseFloat(n.replace(/,/g, '')));
    const resultNums = resultNumbers.map((n) => parseFloat(n.replace(/,/g, '')));

    // Check if any numbers match within tolerance
    return claimNums.some((cn) =>
      resultNums.some((rn) => {
        if (isNaN(cn) || isNaN(rn)) return false;
        if (cn === 0 && rn === 0) return true;
        const maxVal = Math.max(Math.abs(cn), Math.abs(rn));
        return maxVal > 0 && Math.abs(cn - rn) / maxVal < 0.01;
      })
    );
  }

  /**
   * Determine validation status
   */
  private determineStatus(result: WolframResult, match: boolean): 'verified' | 'partial' | 'unverified' {
    if (!result.success) return 'unverified';
    if (match) return 'verified';
    return 'partial';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: WolframResult, match: boolean): number {
    if (!result.success) return 30;
    if (match) return 95;
    return 60; // Partial - got result but couldn't confirm match
  }

  /**
   * Build confidence factors
   */
  private buildFactors(result: WolframResult, match: boolean): ConfidenceFactor[] {
    return [
      {
        name: 'authority',
        weight: 0.4,
        score: 100,
        reason: 'Wolfram Alpha is authoritative source',
      },
      {
        name: 'api-success',
        weight: 0.3,
        score: result.success ? 100 : 0,
        reason: result.success ? 'API returned result' : 'API failed or no result',
      },
      {
        name: 'match',
        weight: 0.3,
        score: match ? 100 : 30,
        reason: match ? 'Values match' : 'Values differ or cannot compare',
      },
    ];
  }
}
