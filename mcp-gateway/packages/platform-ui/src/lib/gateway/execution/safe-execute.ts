/**
 * MCP Gateway - Safe Execution with CARS Integration
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.3.3 - Integrate CARS with execution
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Safe code execution with integrated:
 *   - CARS risk assessment (all executions)
 *   - L3/L4 operations require human approval
 *   - Sandbox violation alerts
 *   - Privacy filtering (pre and post)
 *   - Audit logging
 *
 *   Aligned with:
 *   - 05_CONVERGENCE_ENGINE § CE-01 through CE-05
 *   - 09_DATA_PROTECTION § DP-05
 *   - 12_HUMAN_REVIEW § HR-01, HR-02
 */

import {
  ExecutionOptions,
  ExecutionResult,
  SafeExecutionResult,
  RiskAssessmentSummary,
  DataClassification,
  CARSApprovalRequest,
  CARSApprovalResponse,
} from './types';
import { VMSandbox } from './vm-sandbox';
import { privacyFilter } from './privacy-filter';
import { executionAuditLogger } from './audit-logger';

// ============================================
// RISK PATTERNS FOR CODE ANALYSIS
// ============================================

interface RiskPattern {
  pattern: RegExp;
  type: string;
  score: number;
  mitigation: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  // Code execution risks (L4 - Critical)
  { pattern: /eval\s*\(/gi, type: 'CODE_EXECUTION', score: 0.9, mitigation: 'Use VM sandbox' },
  { pattern: /new\s+Function\s*\(/gi, type: 'CODE_EXECUTION', score: 0.9, mitigation: 'Use VM sandbox' },
  { pattern: /exec\s*\(/gi, type: 'CODE_EXECUTION', score: 0.95, mitigation: 'Use VM sandbox' },
  { pattern: /spawn\s*\(/gi, type: 'CODE_EXECUTION', score: 0.95, mitigation: 'Block subprocess' },

  // File system risks (L3 - High)
  { pattern: /fs\.\w+Sync/gi, type: 'FILE_SYSTEM_ACCESS', score: 0.7, mitigation: 'Use virtual filesystem' },
  { pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi, type: 'FILE_SYSTEM_ACCESS', score: 0.6, mitigation: 'Use virtual filesystem' },
  { pattern: /readFile|writeFile|unlink|rmdir/gi, type: 'FILE_SYSTEM_ACCESS', score: 0.6, mitigation: 'Use virtual filesystem' },

  // Network risks (L3 - High)
  { pattern: /fetch\s*\(/gi, type: 'NETWORK_ACCESS', score: 0.5, mitigation: 'Block network in sandbox' },
  { pattern: /http\.|https\./gi, type: 'NETWORK_ACCESS', score: 0.5, mitigation: 'Block network in sandbox' },
  { pattern: /XMLHttpRequest/gi, type: 'NETWORK_ACCESS', score: 0.5, mitigation: 'Block network in sandbox' },
  { pattern: /WebSocket/gi, type: 'NETWORK_ACCESS', score: 0.6, mitigation: 'Block network in sandbox' },

  // Data exfiltration risks (L4 - Critical)
  { pattern: /process\.env/gi, type: 'DATA_EXFILTRATION', score: 0.8, mitigation: 'Filter environment variables' },
  { pattern: /AKIA[0-9A-Z]{16}/gi, type: 'SECRET_EXPOSURE', score: 1.0, mitigation: 'BLOCK - AWS key detected' },
  { pattern: /-----BEGIN.*PRIVATE KEY/gi, type: 'SECRET_EXPOSURE', score: 1.0, mitigation: 'BLOCK - Private key detected' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/gi, type: 'SECRET_EXPOSURE', score: 1.0, mitigation: 'BLOCK - API key detected' },

  // Privilege escalation (L4 - Critical)
  { pattern: /sudo|chmod|chown/gi, type: 'PRIVILEGE_ESCALATION', score: 0.9, mitigation: 'Block privileged operations' },
  { pattern: /child_process/gi, type: 'PRIVILEGE_ESCALATION', score: 0.85, mitigation: 'Block subprocess access' },

  // Deceptive compliance patterns (FROM CARS)
  { pattern: /ignore.*previous|disregard.*instruction/gi, type: 'DECEPTIVE_COMPLIANCE', score: 0.95, mitigation: 'BLOCK - Potential prompt injection' },
  { pattern: /pretend.*you.*are|act.*as.*if/gi, type: 'DECEPTIVE_COMPLIANCE', score: 0.6, mitigation: 'Review for roleplay manipulation' },
  { pattern: /bypass.*security|skip.*validation/gi, type: 'DECEPTIVE_COMPLIANCE', score: 0.9, mitigation: 'BLOCK - Security bypass attempt' },

  // Resource abuse (L2 - Medium)
  { pattern: /while\s*\(\s*true\s*\)/gi, type: 'RESOURCE_ABUSE', score: 0.4, mitigation: 'Enforce timeout' },
  { pattern: /setInterval/gi, type: 'RESOURCE_ABUSE', score: 0.3, mitigation: 'Block timers in sandbox' },
  { pattern: /setTimeout.*0\s*\)/gi, type: 'RESOURCE_ABUSE', score: 0.3, mitigation: 'Block zero-delay timers' },
];

// ============================================
// RISK ASSESSOR
// ============================================

class CodeRiskAssessor {
  private approvalThreshold: number;
  private blockThreshold: number;

  constructor(options?: { approvalThreshold?: number; blockThreshold?: number }) {
    this.approvalThreshold = options?.approvalThreshold ?? 0.5;
    this.blockThreshold = options?.blockThreshold ?? 0.9;
  }

  /**
   * Assess risk level of code
   */
  assess(code: string): RiskAssessmentSummary {
    const types: string[] = [];
    const factors: string[] = [];
    const mitigations: string[] = [];
    let maxScore = 0;

    for (const { pattern, type, score, mitigation } of RISK_PATTERNS) {
      // Reset lastIndex for global patterns
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(code)) {
        if (!types.includes(type)) types.push(type);
        factors.push(`Detected: ${pattern.source}`);
        mitigations.push(mitigation);
        maxScore = Math.max(maxScore, score);
      }
    }

    // Check for secrets via privacy filter
    if (privacyFilter.containsSecrets(code)) {
      types.push('SECRET_EXPOSURE');
      factors.push('Secrets detected in code');
      mitigations.push('BLOCK - Remove secrets from code');
      maxScore = Math.max(maxScore, 1.0);
    }

    const level = this.scoreToLevel(maxScore);
    const requiresApproval = maxScore >= this.approvalThreshold;
    const recommendedClassification = this.determineClassification(types, maxScore);

    return {
      level,
      score: maxScore,
      types,
      recommendedClassification,
      requiresApproval,
    };
  }

  private scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private determineClassification(types: string[], score: number): DataClassification {
    if (types.includes('SECRET_EXPOSURE') || types.includes('DECEPTIVE_COMPLIANCE')) {
      return 'RESTRICTED';
    }
    if (score >= 0.7 || types.includes('DATA_EXFILTRATION')) {
      return 'CONFIDENTIAL';
    }
    if (score >= 0.3) {
      return 'INTERNAL';
    }
    return 'PUBLIC';
  }

  /**
   * Check if code should be blocked outright
   */
  shouldBlock(assessment: RiskAssessmentSummary): boolean {
    return assessment.score >= this.blockThreshold;
  }
}

// ============================================
// APPROVAL MANAGER
// ============================================

class ApprovalManager {
  private pendingApprovals = new Map<string, PendingApproval>();
  private approvalTimeout: number;

  constructor(options?: { approvalTimeoutMs?: number }) {
    this.approvalTimeout = options?.approvalTimeoutMs ?? 300000; // 5 minutes
  }

  /**
   * Request human approval for execution
   */
  async requestApproval(request: CARSApprovalRequest): Promise<CARSApprovalResponse> {
    // Store pending approval
    this.pendingApprovals.set(request.requestId, {
      request,
      createdAt: Date.now(),
      resolved: false,
    });

    // Log approval request
    executionAuditLogger.logApprovalRequest(
      request.sessionId,
      request.executionId,
      request.requestId,
      request.riskAssessment.level
    );

    // In production, this would:
    // 1. Send notification to approval channel
    // 2. Wait for response (with timeout)
    // 3. Return approval decision

    // For now, simulate auto-denial for high risk
    return new Promise((resolve) => {
      setTimeout(() => {
        const response: CARSApprovalResponse = {
          requestId: request.requestId,
          approved: false,
          reason: 'Automatic denial - human approval required (simulation)',
          timestamp: new Date().toISOString(),
        };

        this.pendingApprovals.delete(request.requestId);

        executionAuditLogger.logApprovalResponse(
          request.sessionId,
          request.executionId,
          request.requestId,
          response.approved,
          response.approver,
          response.reason
        );

        resolve(response);
      }, 100);
    });
  }

  /**
   * Process external approval response
   */
  processApproval(response: CARSApprovalResponse): boolean {
    const pending = this.pendingApprovals.get(response.requestId);
    if (!pending || pending.resolved) {
      return false;
    }

    pending.resolved = true;
    pending.response = response;
    this.pendingApprovals.delete(response.requestId);

    return true;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): CARSApprovalRequest[] {
    const now = Date.now();
    const pending: CARSApprovalRequest[] = [];

    for (const [id, approval] of this.pendingApprovals) {
      if (!approval.resolved && now - approval.createdAt < this.approvalTimeout) {
        pending.push(approval.request);
      } else if (now - approval.createdAt >= this.approvalTimeout) {
        // Clean up expired
        this.pendingApprovals.delete(id);
      }
    }

    return pending;
  }
}

interface PendingApproval {
  request: CARSApprovalRequest;
  createdAt: number;
  resolved: boolean;
  response?: CARSApprovalResponse;
}

// ============================================
// SAFE EXECUTE FUNCTION
// ============================================

const riskAssessor = new CodeRiskAssessor();
const approvalManager = new ApprovalManager();
let executionCounter = 0;

/**
 * Safely execute code with CARS integration
 *
 * Flow:
 * 1. CARS Risk Assessment
 * 2. Pre-execution privacy scan
 * 3. Approval gate (if required)
 * 4. Sandbox execution
 * 5. Post-execution privacy filter
 * 6. Audit logging
 */
export async function safeExecute(
  code: string,
  sessionId: string,
  options: ExecutionOptions = {}
): Promise<SafeExecutionResult> {
  const executionId = generateExecutionId();
  const startTime = Date.now();

  // STEP 1: CARS Risk Assessment
  const assessment = riskAssessor.assess(code);

  executionAuditLogger.logExecutionStart(sessionId, executionId, {
    codeLength: code.length,
    options: { ...options } as Record<string, unknown>,
    riskLevel: assessment.level,
    riskScore: assessment.score,
    riskTypes: assessment.types,
  }, assessment.recommendedClassification);

  executionAuditLogger.logRiskAssessment(sessionId, executionId, {
    level: assessment.level,
    score: assessment.score,
    types: assessment.types,
    factors: [],
    requiresApproval: assessment.requiresApproval,
  });

  // STEP 2: Block if critical risk and not pre-approved
  if (riskAssessor.shouldBlock(assessment) && !options.skipRiskAssessment) {
    const result: SafeExecutionResult = {
      success: false,
      output: '',
      error: `Execution blocked: Risk level ${assessment.level} (score: ${assessment.score.toFixed(2)}) exceeds safety threshold. Risk types: ${assessment.types.join(', ')}`,
      duration: Date.now() - startTime,
      riskAssessment: assessment,
      auditTrail: sessionId,
      requiresApproval: true,
      approvalStatus: 'denied',
    };

    executionAuditLogger.logExecutionEnd(sessionId, executionId, {
      success: false,
      duration: result.duration,
      error: result.error,
    }, assessment.recommendedClassification);

    return result;
  }

  // STEP 3: Request approval if required (L3/L4 operations)
  if (assessment.requiresApproval && !options.skipRiskAssessment) {
    const approvalRequest: CARSApprovalRequest = {
      requestId: `approval_${executionId}`,
      sessionId,
      executionId,
      codeSnippet: code.slice(0, 500) + (code.length > 500 ? '...' : ''),
      riskAssessment: assessment,
      userId: options.userId,
      timestamp: new Date().toISOString(),
      timeoutMs: 300000,
    };

    const approvalResponse = await approvalManager.requestApproval(approvalRequest);

    if (!approvalResponse.approved) {
      const result: SafeExecutionResult = {
        success: false,
        output: '',
        error: `Execution requires human approval. Request ID: ${approvalRequest.requestId}. ${approvalResponse.reason ?? ''}`,
        duration: Date.now() - startTime,
        riskAssessment: assessment,
        auditTrail: sessionId,
        requiresApproval: true,
        approvalStatus: 'denied',
      };

      executionAuditLogger.logExecutionEnd(sessionId, executionId, {
        success: false,
        duration: result.duration,
        error: result.error,
      }, assessment.recommendedClassification);

      return result;
    }
  }

  // STEP 4: Pre-execution privacy scan
  const preFilter = privacyFilter.filter(code);
  if (preFilter.blocked) {
    executionAuditLogger.logPrivacyDetection(
      sessionId,
      executionId,
      preFilter.detections,
      'blocked'
    );

    const result: SafeExecutionResult = {
      success: false,
      output: '',
      error: `Execution blocked: Secrets detected in code. Categories: ${preFilter.detections.filter(d => d.type === 'secret').map(d => d.category).join(', ')}`,
      duration: Date.now() - startTime,
      riskAssessment: assessment,
      auditTrail: sessionId,
      requiresApproval: false,
    };

    executionAuditLogger.logExecutionEnd(sessionId, executionId, {
      success: false,
      duration: result.duration,
      error: result.error,
    }, 'RESTRICTED');

    return result;
  }

  // STEP 5: Execute in sandbox
  const sandbox = new VMSandbox();
  try {
    const execResult = await sandbox.execute(code, {
      timeout: options.timeout ?? 5000,
      classification: assessment.recommendedClassification,
    });

    // STEP 6: Post-execution output filter
    const postFilter = privacyFilter.filter(execResult.output);

    if (postFilter.detections.length > 0) {
      executionAuditLogger.logPrivacyDetection(
        sessionId,
        executionId,
        postFilter.detections,
        postFilter.blocked ? 'blocked' : 'redacted'
      );
    }

    // Check for sandbox violations
    if (execResult.timedOut) {
      executionAuditLogger.logSandboxViolation(sessionId, executionId, {
        type: 'timeout',
        details: `Execution exceeded timeout of ${options.timeout ?? 5000}ms`,
      });
    }

    const result: SafeExecutionResult = {
      success: execResult.success,
      output: postFilter.filtered,
      error: execResult.error,
      duration: execResult.duration,
      memoryUsed: execResult.memoryUsed,
      privacyDetections: postFilter.detections.map(d => ({
        type: d.type,
        category: d.category,
        token: `[REDACTED_${d.category.toUpperCase()}]`,
        location: { start: 0, end: 0 },
      })),
      riskAssessment: assessment,
      auditTrail: sessionId,
      requiresApproval: assessment.requiresApproval,
      approvalStatus: assessment.requiresApproval ? 'approved' : undefined,
      timedOut: execResult.timedOut,
    };

    executionAuditLogger.logExecutionEnd(sessionId, executionId, {
      success: execResult.success,
      duration: execResult.duration,
      memoryUsed: execResult.memoryUsed,
      outputLength: postFilter.filtered.length,
      error: execResult.error,
    }, assessment.recommendedClassification);

    return result;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    executionAuditLogger.logError(sessionId, executionId, err);

    const result: SafeExecutionResult = {
      success: false,
      output: '',
      error: err.message,
      duration: Date.now() - startTime,
      riskAssessment: assessment,
      auditTrail: sessionId,
      requiresApproval: false,
    };

    executionAuditLogger.logExecutionEnd(sessionId, executionId, {
      success: false,
      duration: result.duration,
      error: err.message,
    }, assessment.recommendedClassification);

    return result;

  } finally {
    await sandbox.dispose();
  }
}

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${(++executionCounter).toString(36)}`;
}

// ============================================
// EXPORTS
// ============================================

export {
  CodeRiskAssessor,
  ApprovalManager,
  riskAssessor,
  approvalManager,
  RISK_PATTERNS,
};

export default safeExecute;
