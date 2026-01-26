/**
 * FORGE Feedback Generator
 * 
 * @epic 04 - Convergence Engine
 * @task 5.1 - Feedback Generation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Generates human-readable and LLM-compatible feedback
 *   from convergence session results.
 */

import {
  ConvergenceSession,
  ConvergenceFeedback,
  IterationResult,
  ValidationResult,
  RepairAction,
} from '../types';

// ============================================
// FEEDBACK GENERATOR
// ============================================

export class FeedbackGenerator {
  /**
   * Generate feedback from a convergence session
   */
  generate(session: ConvergenceSession): ConvergenceFeedback {
    const lastIteration = session.iterations[session.iterations.length - 1];
    const score = lastIteration?.score ?? 0;
    
    // Collect errors from last iteration
    const errors = this.extractErrors(lastIteration);
    
    // Generate repair actions
    const actions = this.generateActions(lastIteration, session.iterations);
    
    // Generate summary
    const summary = this.generateSummary(session, lastIteration);
    
    // Generate guidance
    const guidance = this.generateGuidance(session, errors, actions);
    
    // Determine if should continue
    const shouldContinue = session.status === 'running' && !lastIteration?.allPassed;
    
    // Stop reason
    const stopReason = this.getStopReason(session);
    
    return {
      summary,
      iteration: session.iterations.length,
      score,
      errors,
      actions,
      guidance,
      shouldContinue,
      stopReason,
    };
  }

  /**
   * Generate feedback for a specific iteration
   */
  generateForIteration(
    iteration: IterationResult,
    history: IterationResult[]
  ): ConvergenceFeedback {
    const errors = this.extractErrors(iteration);
    const actions = this.generateActions(iteration, history);
    const summary = this.generateIterationSummary(iteration, history);
    const guidance = this.generateIterationGuidance(iteration, errors);
    
    return {
      summary,
      iteration: iteration.iteration,
      score: iteration.score,
      errors,
      actions,
      guidance,
      shouldContinue: !iteration.allPassed,
    };
  }

  // ==========================================
  // ERROR EXTRACTION
  // ==========================================

  private extractErrors(iteration: IterationResult | undefined): ConvergenceFeedback['errors'] {
    if (!iteration) return [];
    
    const errors: ConvergenceFeedback['errors'] = [];
    
    for (const validation of iteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          errors.push({
            path: error.path || validation.validatorId,
            message: error.message,
            suggestion: this.getSuggestion(error, validation),
          });
        }
      }
    }
    
    return errors;
  }

  private getSuggestion(error: any, validation: ValidationResult): string | undefined {
    if (error.expected !== undefined) {
      return `Set to ${JSON.stringify(error.expected)}`;
    }
    
    if (error.code === 'MISSING_FIELD') {
      return `Add the missing field`;
    }
    
    if (error.code === 'TYPE_MISMATCH') {
      return `Change the value type`;
    }
    
    if (validation.validatorType === 'regex') {
      return `Modify to match the required pattern`;
    }
    
    return undefined;
  }

  // ==========================================
  // ACTION GENERATION
  // ==========================================

  private generateActions(
    iteration: IterationResult | undefined,
    history: IterationResult[]
  ): RepairAction[] {
    if (!iteration) return [];
    
    const actions: RepairAction[] = [];
    let priority = 1;
    
    for (const validation of iteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          const action = this.createRepairAction(error, validation, priority++, history);
          actions.push(action);
        }
      }
    }
    
    // Sort by estimated impact
    actions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
    
    return actions.slice(0, 5); // Top 5 actions
  }

  private createRepairAction(
    error: any,
    validation: ValidationResult,
    priority: number,
    history: IterationResult[]
  ): RepairAction {
    // Determine action type
    let type: RepairAction['type'] = 'modify';
    let regenerationPrompt: string | undefined;
    
    // Complex errors might need regeneration
    if (error.severity === 'critical' || !error.expected) {
      type = 'regenerate';
      regenerationPrompt = this.buildRegenerationPrompt(error, validation);
    }
    
    // Estimate impact based on error frequency in history
    const frequency = this.countErrorFrequency(error, history);
    const estimatedImpact = Math.min(1, 0.3 + (1 / (frequency + 1)) * 0.5);
    
    return {
      id: `action_${Date.now()}_${priority}`,
      type,
      targetPath: error.path,
      description: error.message,
      suggestedValue: error.expected,
      regenerationPrompt,
      priority,
      estimatedImpact,
      sourceValidator: validation.validatorId,
      sourceError: error,
    };
  }

  private buildRegenerationPrompt(error: any, validation: ValidationResult): string {
    const parts = [
      `Fix the validation error in the output.`,
      ``,
      `Error: ${error.message}`,
      `Path: ${error.path || 'root'}`,
      `Validator: ${validation.validatorType}`,
    ];
    
    if (error.expected !== undefined) {
      parts.push(`Expected: ${JSON.stringify(error.expected)}`);
    }
    
    if (error.actual !== undefined) {
      parts.push(`Actual: ${JSON.stringify(error.actual)}`);
    }
    
    parts.push('');
    parts.push('Provide the corrected value that satisfies the validation.');
    
    return parts.join('\n');
  }

  private countErrorFrequency(error: any, history: IterationResult[]): number {
    let count = 0;
    
    for (const iteration of history) {
      for (const validation of iteration.validations) {
        for (const e of validation.errors) {
          if (e.code === error.code && e.path === error.path) {
            count++;
          }
        }
      }
    }
    
    return count;
  }

  // ==========================================
  // SUMMARY GENERATION
  // ==========================================

  private generateSummary(session: ConvergenceSession, lastIteration: IterationResult | undefined): string {
    const parts: string[] = [];
    
    // Status
    const statusEmoji = {
      'pending': '⏳',
      'running': '🔄',
      'converged': '✅',
      'failed': '❌',
      'aborted': '⚠️',
      'timeout': '⏱️',
    };
    
    parts.push(`${statusEmoji[session.status]} Status: ${session.status.toUpperCase()}`);
    
    // Iterations
    parts.push(`📊 Iterations: ${session.iterations.length}/${session.config.maxIterations}`);
    
    // Score
    if (lastIteration) {
      const scoreBar = this.renderScoreBar(lastIteration.score);
      parts.push(`📈 Score: ${(lastIteration.score * 100).toFixed(1)}% ${scoreBar}`);
      
      if (lastIteration.scoreDelta !== 0) {
        const deltaSign = lastIteration.scoreDelta > 0 ? '+' : '';
        parts.push(`   (${deltaSign}${(lastIteration.scoreDelta * 100).toFixed(1)}% from previous)`);
      }
    }
    
    // Validators
    if (lastIteration) {
      const passed = lastIteration.validations.filter(v => v.passed).length;
      const total = lastIteration.validations.length;
      parts.push(`✓ Validators: ${passed}/${total} passed`);
    }
    
    // Duration
    if (session.totalDurationMs) {
      parts.push(`⏱️ Duration: ${(session.totalDurationMs / 1000).toFixed(1)}s`);
    }
    
    return parts.join('\n');
  }

  private generateIterationSummary(iteration: IterationResult, history: IterationResult[]): string {
    const parts: string[] = [];
    
    parts.push(`Iteration ${iteration.iteration + 1}`);
    parts.push(`Score: ${(iteration.score * 100).toFixed(1)}%`);
    
    const passed = iteration.validations.filter(v => v.passed).length;
    const total = iteration.validations.length;
    parts.push(`Validators: ${passed}/${total} passed`);
    
    if (history.length > 1) {
      const improvement = iteration.scoreDelta > 0;
      parts.push(improvement ? '📈 Improving' : '📉 Declining');
    }
    
    return parts.join(' | ');
  }

  private renderScoreBar(score: number): string {
    const filled = Math.round(score * 10);
    const empty = 10 - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  // ==========================================
  // GUIDANCE GENERATION
  // ==========================================

  private generateGuidance(
    session: ConvergenceSession,
    errors: ConvergenceFeedback['errors'],
    actions: RepairAction[]
  ): string {
    const parts: string[] = [];
    
    if (session.status === 'converged') {
      parts.push('🎉 Convergence achieved! All validators passed.');
      return parts.join('\n');
    }
    
    if (session.status === 'failed') {
      parts.push('❌ Convergence failed after maximum iterations.');
      parts.push('Consider:');
      parts.push('- Relaxing validation constraints');
      parts.push('- Using a different convergence strategy');
      parts.push('- Manual intervention for persistent errors');
      return parts.join('\n');
    }
    
    // Running - provide specific guidance
    if (errors.length === 0) {
      parts.push('No errors detected. Check validation configuration.');
      return parts.join('\n');
    }
    
    parts.push('🔧 Focus on these fixes:');
    
    // Top 3 errors
    const topErrors = errors.slice(0, 3);
    for (let i = 0; i < topErrors.length; i++) {
      const error = topErrors[i];
      parts.push(`${i + 1}. ${error.path}: ${error.message}`);
      if (error.suggestion) {
        parts.push(`   → ${error.suggestion}`);
      }
    }
    
    if (errors.length > 3) {
      parts.push(`   ... and ${errors.length - 3} more errors`);
    }
    
    return parts.join('\n');
  }

  private generateIterationGuidance(
    iteration: IterationResult,
    errors: ConvergenceFeedback['errors']
  ): string {
    if (iteration.allPassed) {
      return 'All validators passed. Ready for next stage.';
    }
    
    if (errors.length === 0) {
      return 'Review validator configuration.';
    }
    
    const criticalErrors = iteration.validations
      .flatMap(v => v.errors)
      .filter(e => e.severity === 'critical');
    
    if (criticalErrors.length > 0) {
      return `Fix ${criticalErrors.length} critical error(s) first: ${criticalErrors[0].message}`;
    }
    
    return `Fix ${errors.length} validation error(s) to continue.`;
  }

  // ==========================================
  // STOP REASON
  // ==========================================

  private getStopReason(session: ConvergenceSession): string | undefined {
    switch (session.status) {
      case 'converged':
        return 'All validators passed with target score achieved';
      case 'failed':
        return `Maximum iterations (${session.config.maxIterations}) reached without convergence`;
      case 'timeout':
        return `Timeout after ${session.config.timeoutMs}ms`;
      case 'aborted':
        return 'Session aborted due to error or manual stop';
      default:
        return undefined;
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default FeedbackGenerator;
