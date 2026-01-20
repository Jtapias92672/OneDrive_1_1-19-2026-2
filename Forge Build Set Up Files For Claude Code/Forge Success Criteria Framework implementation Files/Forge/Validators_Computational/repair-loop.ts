/**
 * FORGE Repair Loop Integration
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.3 - Repair Loop Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Integrates computational validation with FORGE's convergence engine.
 *   Feeds correct answers back to the reflection agent for repair.
 *   Implements the core FORGE value proposition: iterative convergence
 *   until outputs meet quality standards.
 */

import {
  ComputationalValidator,
  ValidationReport,
  ValidationResult,
  ComputationalClaim,
} from './computational-validator';
import { DetectionResult, detectClaims } from './claim-detector';
import { EvidencePackBuilder, EvidencePack } from './evidence-pack';

// ============================================
// TYPES
// ============================================

export interface RepairFeedback {
  /** Claim that failed validation */
  claimId: string;
  
  /** Original text containing the error */
  originalText: string;
  
  /** The incorrect value stated */
  incorrectValue: string;
  
  /** The correct value computed */
  correctValue: string;
  
  /** Mathematical expression */
  expression: string;
  
  /** Formula used (e.g., "CPI = EV / AC") */
  formula?: string;
  
  /** Category for targeted repair */
  category?: string;
  
  /** Severity affects repair priority */
  severity: 'critical' | 'major' | 'minor';
  
  /** Confidence in the correction */
  confidence: number;
  
  /** Suggested replacement text */
  suggestedReplacement: string;
  
  /** Explanation for the agent */
  explanation: string;
}

export interface ConvergenceConfig {
  /** Maximum iterations before giving up */
  maxIterations: number;
  
  /** Target pass rate to consider converged */
  targetPassRate: number;
  
  /** Minimum improvement per iteration to continue */
  minImprovementRate: number;
  
  /** Whether to fail fast on critical errors */
  failFastOnCritical: boolean;
  
  /** Budget limit for Wolfram calls per convergence attempt */
  wolframBudgetPerAttempt: number;
}

export interface ConvergenceState {
  /** Current iteration number */
  iteration: number;
  
  /** Maximum iterations allowed */
  maxIterations: number;
  
  /** Current pass rate */
  currentPassRate: number;
  
  /** Target pass rate */
  targetPassRate: number;
  
  /** Whether convergence has been achieved */
  converged: boolean;
  
  /** Reason for exit */
  exitReason?: 'target_reached' | 'max_iterations' | 'no_improvement' | 'budget_exhausted' | 'critical_failure';
  
  /** History of iterations */
  history: Array<{
    iteration: number;
    passRate: number;
    claimsRepaired: number;
    wolframCalls: number;
    timestamp: string;
  }>;
  
  /** All evidence packs from each iteration */
  evidencePacks: EvidencePack[];
}

export interface RepairLoopResult {
  /** Final convergence state */
  convergence: ConvergenceState;
  
  /** Final repaired text (if converged) */
  repairedText?: string;
  
  /** All repair feedback generated */
  allFeedback: RepairFeedback[];
  
  /** Total processing time */
  totalTimeMs: number;
}

// ============================================
// REPAIR LOOP ENGINE
// ============================================

export class RepairLoopEngine {
  private validator: ComputationalValidator;
  private config: ConvergenceConfig;

  constructor(config?: Partial<ConvergenceConfig>) {
    this.validator = new ComputationalValidator({ mode: 'conditional' });
    this.config = {
      maxIterations: 5,
      targetPassRate: 0.95,
      minImprovementRate: 0.05,
      failFastOnCritical: true,
      wolframBudgetPerAttempt: 50,
      ...config,
    };
  }

  /**
   * Generate repair feedback for invalid claims
   */
  generateRepairFeedback(report: ValidationReport, detectionResult: DetectionResult): RepairFeedback[] {
    const feedback: RepairFeedback[] = [];
    
    for (const result of report.claims) {
      if (result.status === 'INVALID' && result.correctAnswer) {
        const detectedClaim = detectionResult.claims.find(c => c.id === result.claimId);
        
        const severity = this.determineSeverity(result, detectedClaim);
        const explanation = this.generateExplanation(result, detectedClaim);
        const suggestedReplacement = this.generateReplacement(result, detectedClaim);
        
        feedback.push({
          claimId: result.claimId,
          originalText: detectedClaim?.originalText || '',
          incorrectValue: result.statedResult,
          correctValue: result.correctAnswer,
          expression: detectedClaim?.expression || '',
          formula: result.formula || detectedClaim?.formula,
          category: result.category || detectedClaim?.category,
          severity,
          confidence: result.confidence,
          suggestedReplacement,
          explanation,
        });
      }
    }
    
    // Sort by severity (critical first)
    return feedback.sort((a, b) => {
      const order = { critical: 0, major: 1, minor: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  /**
   * Format repair feedback for an LLM reflection agent
   */
  formatForReflectionAgent(feedback: RepairFeedback[]): string {
    if (feedback.length === 0) {
      return 'All computational claims validated successfully. No repairs needed.';
    }
    
    let prompt = `## Computational Errors Detected\n\n`;
    prompt += `Found ${feedback.length} computational error(s) requiring repair:\n\n`;
    
    for (let i = 0; i < feedback.length; i++) {
      const f = feedback[i];
      prompt += `### Error ${i + 1} [${f.severity.toUpperCase()}]\n`;
      prompt += `- **Expression:** \`${f.expression}\`\n`;
      prompt += `- **Stated Result:** ${f.incorrectValue}\n`;
      prompt += `- **Correct Result:** ${f.correctValue}\n`;
      if (f.formula) {
        prompt += `- **Formula:** ${f.formula}\n`;
      }
      prompt += `- **Confidence:** ${(f.confidence * 100).toFixed(0)}%\n`;
      prompt += `\n**Explanation:** ${f.explanation}\n`;
      prompt += `\n**Suggested Fix:** Replace "${f.originalText}" with "${f.suggestedReplacement}"\n\n`;
    }
    
    prompt += `---\n`;
    prompt += `Please regenerate the text with these corrections applied. `;
    prompt += `Ensure all mathematical calculations are verified before outputting.\n`;
    
    return prompt;
  }

  /**
   * Run a single validation iteration
   */
  async runIteration(
    text: string,
    state: ConvergenceState
  ): Promise<{
    report: ValidationReport;
    detection: DetectionResult;
    feedback: RepairFeedback[];
    evidencePack: EvidencePack;
  }> {
    // Detect claims
    const detection = detectClaims(text);
    
    // Validate
    const report = await this.validator.validateText(text);
    
    // Generate feedback
    const feedback = this.generateRepairFeedback(report, detection);
    
    // Build evidence pack
    const evidencePack = new EvidencePackBuilder()
      .setSource(text, 'agent_output', `iteration-${state.iteration}`)
      .addValidationReport(report, detection)
      .finalize();
    
    // Add repair suggestions to evidence pack
    for (const f of feedback) {
      // Evidence pack already has the data from the report
    }
    
    return { report, detection, feedback, evidencePack };
  }

  /**
   * Run full convergence loop
   * Note: This method expects an external repair function to be provided
   * In a real implementation, this would integrate with the FORGE orchestrator
   */
  async runConvergenceLoop(
    initialText: string,
    repairFunction: (text: string, feedback: RepairFeedback[]) => Promise<string>
  ): Promise<RepairLoopResult> {
    const startTime = Date.now();
    
    const state: ConvergenceState = {
      iteration: 0,
      maxIterations: this.config.maxIterations,
      currentPassRate: 0,
      targetPassRate: this.config.targetPassRate,
      converged: false,
      history: [],
      evidencePacks: [],
    };
    
    let currentText = initialText;
    const allFeedback: RepairFeedback[] = [];
    let previousPassRate = 0;
    
    while (state.iteration < this.config.maxIterations && !state.converged) {
      state.iteration++;
      
      // Run validation
      const { report, detection, feedback, evidencePack } = await this.runIteration(currentText, state);
      
      // Update state
      state.currentPassRate = report.summary.total > 0 
        ? report.summary.valid / report.summary.total 
        : 1;
      
      state.history.push({
        iteration: state.iteration,
        passRate: state.currentPassRate,
        claimsRepaired: feedback.length,
        wolframCalls: report.summary.wolframInvocations,
        timestamp: new Date().toISOString(),
      });
      
      state.evidencePacks.push(evidencePack);
      allFeedback.push(...feedback);
      
      // Check convergence conditions
      if (state.currentPassRate >= this.config.targetPassRate) {
        state.converged = true;
        state.exitReason = 'target_reached';
        break;
      }
      
      // Check for critical failures
      if (this.config.failFastOnCritical && feedback.some(f => f.severity === 'critical')) {
        // Continue but flag
      }
      
      // Check for improvement
      const improvement = state.currentPassRate - previousPassRate;
      if (state.iteration > 1 && improvement < this.config.minImprovementRate) {
        state.exitReason = 'no_improvement';
        break;
      }
      
      // If there are errors, attempt repair
      if (feedback.length > 0 && state.iteration < this.config.maxIterations) {
        currentText = await repairFunction(currentText, feedback);
      }
      
      previousPassRate = state.currentPassRate;
    }
    
    // Set final exit reason if not already set
    if (!state.exitReason) {
      state.exitReason = state.iteration >= this.config.maxIterations 
        ? 'max_iterations' 
        : 'target_reached';
    }
    
    return {
      convergence: state,
      repairedText: state.converged ? currentText : undefined,
      allFeedback,
      totalTimeMs: Date.now() - startTime,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private determineSeverity(
    result: ValidationResult,
    claim?: { category?: string; priority?: number }
  ): 'critical' | 'major' | 'minor' {
    // EVM calculations are critical for defense contracts
    if (claim?.category === 'evm') return 'critical';
    if (claim?.category === 'defense') return 'critical';
    
    // High-priority patterns are major
    if (claim?.priority && claim.priority >= 80) return 'major';
    
    // Financial calculations are major
    if (claim?.category === 'financial') return 'major';
    
    // Everything else is minor
    return 'minor';
  }

  private generateExplanation(
    result: ValidationResult,
    claim?: { expression?: string; formula?: string }
  ): string {
    const formula = result.formula || claim?.formula;
    
    if (formula) {
      return `The calculation using ${formula} yields ${result.correctAnswer}, ` +
             `not ${result.statedResult} as stated. ` +
             `This was verified with ${result.confidence * 100}% confidence.`;
    }
    
    return `The expression evaluates to ${result.correctAnswer}, ` +
           `not ${result.statedResult} as stated.`;
  }

  private generateReplacement(
    result: ValidationResult,
    claim?: { originalText?: string; expression?: string }
  ): string {
    if (!claim?.originalText) return result.correctAnswer || '';
    
    // Replace the stated result with the correct one
    const original = claim.originalText;
    const stated = result.statedResult;
    const correct = result.correctAnswer || '';
    
    // Simple replacement - more sophisticated logic could be added
    return original.replace(stated, correct);
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick repair feedback generation
 */
export async function generateRepairFeedback(
  text: string
): Promise<RepairFeedback[]> {
  const validator = new ComputationalValidator({ mode: 'conditional' });
  const detection = detectClaims(text);
  const report = await validator.validateText(text);
  
  const engine = new RepairLoopEngine();
  return engine.generateRepairFeedback(report, detection);
}

/**
 * Format feedback for reflection agent
 */
export function formatFeedbackForAgent(feedback: RepairFeedback[]): string {
  const engine = new RepairLoopEngine();
  return engine.formatForReflectionAgent(feedback);
}

// ============================================
// EXPORTS
// ============================================

export default RepairLoopEngine;
