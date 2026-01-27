/**
 * Complexity Analyzer
 * Epic 14: 5-factor complexity scoring for tasks
 */

import {
  ComplexityFactors,
  ComplexityResult,
  ComplexityInput,
  FactorBreakdown,
} from './types';

const FACTOR_WEIGHTS: Record<keyof ComplexityFactors, number> = {
  codeSize: 0.2,
  dependencies: 0.2,
  contextRequired: 0.25,
  novelty: 0.15,
  riskLevel: 0.2,
};

export class ComplexityAnalyzer {
  /**
   * Analyze task complexity
   */
  analyze(input: ComplexityInput): ComplexityResult {
    const factors = this.calculateFactors(input);
    const breakdown = this.calculateBreakdown(factors);
    const score = this.calculateScore(factors);
    const level = this.getLevel(score);

    return {
      score,
      level,
      factors,
      breakdown,
      recommendedWorkflow: this.getRecommendedWorkflow(score),
      estimatedDuration: this.estimateDuration(score),
      warnings: this.generateWarnings(factors, input),
    };
  }

  private calculateFactors(input: ComplexityInput): ComplexityFactors {
    return {
      codeSize: this.scoreCodeSize(input),
      dependencies: this.scoreDependencies(input),
      contextRequired: this.scoreContext(input),
      novelty: this.scoreNovelty(input),
      riskLevel: this.scoreRisk(input),
    };
  }

  private scoreCodeSize(input: ComplexityInput): number {
    const lines = input.linesChanged || 0;
    const files = input.fileCount || 1;

    if (lines <= 10 && files <= 1) return 10;
    if (lines <= 50 && files <= 3) return 30;
    if (lines <= 200 && files <= 10) return 50;
    if (lines <= 500 && files <= 20) return 70;
    return 90;
  }

  private scoreDependencies(input: ComplexityInput): number {
    const deps = input.dependencyCount || 0;

    if (deps === 0) return 10;
    if (deps <= 3) return 30;
    if (deps <= 10) return 50;
    if (deps <= 25) return 70;
    return 90;
  }

  private scoreContext(input: ComplexityInput): number {
    let score = 30; // Base score

    // Analyze description for context indicators
    const desc = input.description.toLowerCase();

    if (desc.includes('refactor') || desc.includes('restructure')) score += 20;
    if (desc.includes('api') || desc.includes('interface')) score += 15;
    if (desc.includes('database') || desc.includes('migration')) score += 20;
    if (desc.includes('integration') || desc.includes('external')) score += 25;
    if (input.requiresExternalData) score += 20;
    if (input.affectsPublicApi) score += 15;

    return Math.min(score, 100);
  }

  private scoreNovelty(input: ComplexityInput): number {
    let score = 20; // Base score

    const desc = input.description.toLowerCase();

    if (input.isNewFeature) score += 30;
    if (desc.includes('new') || desc.includes('create')) score += 15;
    if (desc.includes('prototype') || desc.includes('experimental')) score += 25;
    if (desc.includes('research') || desc.includes('investigate')) score += 20;
    if (desc.includes('fix') || desc.includes('bug')) score -= 10; // Less novel

    return Math.min(Math.max(score, 0), 100);
  }

  private scoreRisk(input: ComplexityInput): number {
    let score = 20; // Base score

    const desc = input.description.toLowerCase();

    if (input.hasSecurityImplications) score += 40;
    if (input.affectsPublicApi) score += 25;
    if (desc.includes('security') || desc.includes('auth')) score += 30;
    if (desc.includes('payment') || desc.includes('financial')) score += 35;
    if (desc.includes('delete') || desc.includes('remove')) score += 20;
    if (desc.includes('production') || desc.includes('deploy')) score += 15;

    return Math.min(score, 100);
  }

  private calculateBreakdown(factors: ComplexityFactors): FactorBreakdown[] {
    return Object.entries(factors).map(([name, score]) => {
      const key = name as keyof ComplexityFactors;
      const weight = FACTOR_WEIGHTS[key];
      return {
        name: key,
        score,
        weight,
        contribution: Math.round(score * weight),
        description: this.getFactorDescription(key, score),
      };
    });
  }

  private getFactorDescription(factor: keyof ComplexityFactors, score: number): string {
    const level = score < 30 ? 'Low' : score < 60 ? 'Medium' : 'High';
    const descriptions: Record<keyof ComplexityFactors, string> = {
      codeSize: `${level} code size impact`,
      dependencies: `${level} dependency complexity`,
      contextRequired: `${level} context requirements`,
      novelty: `${level} novelty/uniqueness`,
      riskLevel: `${level} risk level`,
    };
    return descriptions[factor];
  }

  private calculateScore(factors: ComplexityFactors): number {
    let total = 0;
    for (const [key, score] of Object.entries(factors)) {
      total += score * FACTOR_WEIGHTS[key as keyof ComplexityFactors];
    }
    return Math.round(total);
  }

  private getLevel(score: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'extreme';
  }

  private getRecommendedWorkflow(
    score: number
  ): 'autonomous' | 'supervised' | 'human-required' {
    if (score < 30) return 'autonomous';
    if (score < 60) return 'supervised';
    return 'human-required';
  }

  private estimateDuration(score: number): string {
    if (score < 20) return '< 30 minutes';
    if (score < 40) return '30 minutes - 2 hours';
    if (score < 60) return '2-4 hours';
    if (score < 80) return '4-8 hours';
    return '> 1 day';
  }

  private generateWarnings(factors: ComplexityFactors, input: ComplexityInput): string[] {
    const warnings: string[] = [];

    if (factors.riskLevel >= 70) {
      warnings.push('High risk: Requires careful review and testing');
    }
    if (factors.contextRequired >= 70) {
      warnings.push('High context: Ensure full understanding before proceeding');
    }
    if (factors.novelty >= 70) {
      warnings.push('High novelty: Consider prototyping first');
    }
    if (input.hasSecurityImplications) {
      warnings.push('Security implications: Require security review');
    }
    if (input.affectsPublicApi) {
      warnings.push('Public API changes: Consider backwards compatibility');
    }

    return warnings;
  }
}

export const complexityAnalyzer = new ComplexityAnalyzer();
