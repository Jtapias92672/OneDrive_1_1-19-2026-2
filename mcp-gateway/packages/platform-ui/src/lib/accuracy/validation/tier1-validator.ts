/**
 * Tier 1 Validator - Local/Static Validation
 * Epic 14: Free, instant validation for simple claims
 */

import { DetectedClaim } from '../claims/types';
import { ValidationResult, ConfidenceFactor } from './types';

interface ConstantDefinition {
  value: string;
  numericValue: number;
  tolerance?: number;
}

export class Tier1Validator {
  // Known physical/mathematical constants
  private constants = new Map<string, ConstantDefinition>([
    ['speed of light', { value: '299792458', numericValue: 299792458, tolerance: 0 }],
    ['gravitational constant', { value: '6.674e-11', numericValue: 6.674e-11, tolerance: 1e-13 }],
    ['avogadro', { value: '6.022e23', numericValue: 6.022e23, tolerance: 1e21 }],
    ['pi', { value: '3.14159265359', numericValue: 3.14159265359, tolerance: 0.0001 }],
    ['e constant', { value: '2.71828182846', numericValue: 2.71828182846, tolerance: 0.0001 }],
    ['euler', { value: '2.71828182846', numericValue: 2.71828182846, tolerance: 0.0001 }],
    ['planck', { value: '6.626e-34', numericValue: 6.626e-34, tolerance: 1e-36 }],
    ['boltzmann', { value: '1.381e-23', numericValue: 1.381e-23, tolerance: 1e-25 }],
    ['electron mass', { value: '9.109e-31', numericValue: 9.109e-31, tolerance: 1e-33 }],
    ['proton mass', { value: '1.673e-27', numericValue: 1.673e-27, tolerance: 1e-29 }],
  ]);

  /**
   * Attempt to validate claim locally
   */
  async validate(claim: DetectedClaim): Promise<ValidationResult | null> {
    if (claim.category === 'mathematical') {
      return this.validateArithmetic(claim);
    }

    if (claim.category === 'scientific') {
      return this.validateConstant(claim);
    }

    return null;
  }

  /**
   * Validate simple arithmetic equations
   */
  private validateArithmetic(claim: DetectedClaim): ValidationResult | null {
    // Match patterns like "5 + 3 = 8" or "10 * 2 = 20"
    const match = claim.text.match(
      /(\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/
    );
    if (!match) return null;

    const [, aStr, op, bStr, resultStr] = match;
    const a = Number(aStr);
    const b = Number(bStr);
    const claimed = Number(resultStr);

    const operator = this.normalizeOperator(op);
    const expected = this.evaluate(a, operator, b);

    if (isNaN(expected)) return null;

    const isMatch = Math.abs(expected - claimed) < 0.0001;

    return this.createResult(claim, {
      tier: 1,
      source: 'local-arithmetic',
      status: isMatch ? 'verified' : 'failed',
      expectedValue: String(expected),
      actualValue: String(claimed),
      match: isMatch,
      confidence: isMatch ? 100 : 0,
      factors: [
        {
          name: 'arithmetic',
          weight: 1,
          score: isMatch ? 100 : 0,
          reason: isMatch ? 'Direct calculation verified' : 'Calculation mismatch',
        },
      ],
    });
  }

  /**
   * Validate against known constants
   */
  private validateConstant(claim: DetectedClaim): ValidationResult | null {
    const text = claim.text.toLowerCase();

    for (const [name, constant] of Array.from(this.constants.entries())) {
      if (text.includes(name)) {
        // Extract number from claim
        const numberMatch = claim.text.match(/[\d,]+(?:\.\d+)?(?:e[+-]?\d+)?/i);
        if (!numberMatch) continue;

        const claimedStr = numberMatch[0].replace(/,/g, '');
        const claimedValue = parseFloat(claimedStr);

        if (isNaN(claimedValue)) continue;

        const tolerance =
          constant.tolerance !== undefined ? constant.tolerance : constant.numericValue * 0.01;
        const diff = Math.abs(claimedValue - constant.numericValue);
        const isMatch = diff <= tolerance;

        return this.createResult(claim, {
          tier: 1,
          source: 'local-constant',
          status: isMatch ? 'verified' : 'failed',
          expectedValue: constant.value,
          actualValue: claimedStr,
          match: isMatch,
          confidence: isMatch ? 95 : 10,
          factors: [
            {
              name: 'known-constant',
              weight: 1,
              score: isMatch ? 95 : 10,
              reason: isMatch
                ? `Matches known value for ${name}`
                : `Does not match known value for ${name}`,
            },
          ],
        });
      }
    }

    return null;
  }

  private normalizeOperator(op: string): string {
    switch (op) {
      case 'x':
      case '×':
        return '*';
      case '÷':
        return '/';
      default:
        return op;
    }
  }

  private evaluate(a: number, op: string, b: number): number {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : NaN;
      default:
        return NaN;
    }
  }

  private createResult(
    claim: DetectedClaim,
    data: {
      tier: 1;
      source: string;
      status: 'verified' | 'failed';
      expectedValue: string;
      actualValue: string;
      match: boolean;
      confidence: number;
      factors: ConfidenceFactor[];
    }
  ): ValidationResult {
    return {
      claimId: claim.id,
      claim,
      tier: data.tier,
      source: data.source,
      status: data.status,
      expectedValue: data.expectedValue,
      actualValue: data.actualValue,
      match: data.match,
      confidence: data.confidence,
      confidenceFactors: data.factors,
      wolframUsed: false,
      wolframCost: 0,
      validatedAt: new Date(),
    };
  }
}

export const tier1Validator = new Tier1Validator();
