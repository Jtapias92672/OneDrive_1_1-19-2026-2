/**
 * FORGE Evidence Packs - Evidence Collector
 * 
 * @epic 08 - Evidence Packs
 * @task 2.1 - Evidence Collection
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Collects evidence from convergence sessions, validations, and outputs.
 *   Builds comprehensive audit trails for compliance and debugging.
 */

import * as crypto from 'crypto';
import {
  EvidencePack,
  PackMetadata,
  SessionEvidence,
  ContractEvidence,
  ValidationEvidence,
  IterationEvidence,
  OutputEvidence,
  ComplianceEvidence,
  AuditEntry,
  AuditEventType,
  CollectorOptions,
  DEFAULT_COLLECTOR_OPTIONS,
  ResourceUsage,
  ValidationFinding,
  QualityMetrics,
} from './types';

// ============================================
// EVIDENCE COLLECTOR
// ============================================

export class EvidenceCollector {
  private options: CollectorOptions;
  private auditTrail: AuditEntry[] = [];
  private previousHash: string | null = null;
  private startTime: number = 0;

  constructor(options: Partial<CollectorOptions> = {}) {
    this.options = { ...DEFAULT_COLLECTOR_OPTIONS, ...options };
  }

  // ==========================================
  // PACK BUILDING
  // ==========================================

  /**
   * Build a complete evidence pack from collected data
   */
  buildPack(
    session: SessionEvidence,
    contract: ContractEvidence,
    validations: ValidationEvidence[],
    iterations: IterationEvidence[],
    output: OutputEvidence,
    compliance?: ComplianceEvidence
  ): EvidencePack {
    const packId = this.generateId('pack');
    const generatedAt = new Date().toISOString();

    // Generate pack hash
    const packData = JSON.stringify({ session, contract, validations, iterations, output });
    const packHash = this.hash(packData);

    // Build metadata
    const metadata: PackMetadata = {
      generatedAt,
      generatorVersion: '1.0.0',
      sourceSystem: 'forge-convergence',
      environment: process.env.NODE_ENV || 'development',
      requestId: session.sessionId,
      tags: {
        packHash,
        contractId: contract.contractId,
        status: session.status,
      },
    };

    // Finalize audit trail
    this.addAuditEntry('output:generated', 'system', 'Evidence pack generated', {
      packId,
      finalScore: output.finalScore,
      converged: output.converged,
    });

    return {
      id: packId,
      version: '1.0.0',
      metadata,
      session,
      contract,
      validations,
      iterations,
      output,
      compliance: compliance || this.buildDefaultCompliance(),
      auditTrail: [...this.auditTrail],
    };
  }

  // ==========================================
  // SESSION EVIDENCE
  // ==========================================

  /**
   * Collect session evidence
   */
  collectSessionEvidence(
    sessionId: string,
    input: any,
    config: any,
    status: SessionEvidence['status'],
    resources: ResourceUsage,
    endTime?: number
  ): SessionEvidence {
    const now = endTime || Date.now();

    this.addAuditEntry('session:end', 'system', 'Session completed', {
      sessionId,
      status,
      durationMs: now - this.startTime,
    });

    return {
      sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(now).toISOString(),
      durationMs: now - this.startTime,
      status,
      input: {
        type: typeof input,
        size: JSON.stringify(input).length,
        hash: this.hash(JSON.stringify(input)),
        summary: this.summarize(input),
      },
      config: {
        maxIterations: config.maxIterations || 10,
        targetScore: config.targetScore || 0.95,
        timeoutMs: config.timeoutMs || 300000,
        strategyName: config.strategyName || 'adaptive',
      },
      resources,
    };
  }

  /**
   * Start session tracking
   */
  startSession(sessionId: string): void {
    this.startTime = Date.now();
    this.auditTrail = [];
    this.previousHash = null;

    this.addAuditEntry('session:start', 'system', 'Session started', { sessionId });
  }

  // ==========================================
  // CONTRACT EVIDENCE
  // ==========================================

  /**
   * Collect contract evidence
   */
  collectContractEvidence(contract: any): ContractEvidence {
    const contractStr = JSON.stringify(contract);
    
    return {
      contractId: contract.id || this.generateId('contract'),
      contractVersion: contract.version || '1.0.0',
      contractName: contract.name || 'Unnamed Contract',
      contractHash: this.hash(contractStr),
      schemaHash: this.hash(JSON.stringify(contract.schema || {})),
      validationRules: (contract.validators || []).map((v: any) => ({
        id: v.id || this.generateId('rule'),
        name: v.name || 'Unknown',
        type: v.type || 'custom',
        required: v.required ?? true,
        weight: v.weight || 1.0,
      })),
      successFormula: {
        probabilityWeight: contract.successFormula?.probabilityWeight || 1.0,
        valueWeight: contract.successFormula?.valueWeight || 1.0,
        costWeight: contract.successFormula?.costWeight || 1.0,
        threshold: contract.successFormula?.threshold || 0.95,
      },
    };
  }

  // ==========================================
  // VALIDATION EVIDENCE
  // ==========================================

  /**
   * Collect validation evidence
   */
  collectValidationEvidence(
    validatorId: string,
    validatorName: string,
    validatorType: ValidationEvidence['validatorType'],
    result: ValidationEvidence['result'],
    score: number,
    findings: ValidationFinding[]
  ): ValidationEvidence {
    const timestamp = new Date().toISOString();

    this.addAuditEntry('validation:complete', validatorId, 'Validation completed', {
      validatorName,
      result,
      score,
      findingsCount: findings.length,
    });

    return {
      validatorId,
      validatorName,
      validatorType,
      timestamp,
      result,
      score,
      findings,
    };
  }

  // ==========================================
  // ITERATION EVIDENCE
  // ==========================================

  /**
   * Collect iteration evidence
   */
  collectIterationEvidence(
    iteration: number,
    inputSummary: string,
    outputSummary: string,
    score: number,
    previousScore: number,
    feedback: IterationEvidence['feedback'],
    tokensUsed: number,
    durationMs: number,
    converged: boolean
  ): IterationEvidence {
    const startTime = new Date(Date.now() - durationMs).toISOString();

    this.addAuditEntry('iteration:end', 'system', `Iteration ${iteration} completed`, {
      score,
      scoreDelta: score - previousScore,
      converged,
    });

    return {
      iteration,
      startTime,
      durationMs,
      inputSummary,
      outputSummary,
      score,
      scoreDelta: score - previousScore,
      feedback,
      tokensUsed,
      converged,
    };
  }

  // ==========================================
  // OUTPUT EVIDENCE
  // ==========================================

  /**
   * Collect output evidence
   */
  collectOutputEvidence(
    output: any,
    type: string,
    finalScore: number,
    converged: boolean,
    metrics: QualityMetrics
  ): OutputEvidence {
    const outputStr = JSON.stringify(output);

    return {
      type,
      size: outputStr.length,
      hash: this.hash(outputStr),
      finalScore,
      converged,
      summary: this.summarize(output),
      metrics,
      sample: this.truncate(outputStr, 500),
    };
  }

  // ==========================================
  // COMPLIANCE EVIDENCE
  // ==========================================

  /**
   * Collect compliance evidence
   */
  collectComplianceEvidence(
    frameworks: ComplianceEvidence['frameworks']
  ): ComplianceEvidence {
    // Calculate overall status
    const allPassed = frameworks.every(f => f.compliancePercent >= 100);
    const anyFailed = frameworks.some(f => f.compliancePercent < 50);
    const status = allPassed ? 'compliant' : anyFailed ? 'non-compliant' : 'partial';

    return {
      frameworks,
      status,
      attestations: [],
      exceptions: [],
    };
  }

  private buildDefaultCompliance(): ComplianceEvidence {
    return {
      frameworks: [],
      status: 'not-assessed',
      attestations: [],
      exceptions: [],
    };
  }

  // ==========================================
  // AUDIT TRAIL
  // ==========================================

  /**
   * Add an audit entry
   */
  addAuditEntry(
    eventType: AuditEventType,
    actor: string,
    action: string,
    details: Record<string, unknown> = {},
    target?: string
  ): void {
    const entry: AuditEntry = {
      id: this.generateId('audit'),
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      action,
      target,
      details,
      previousHash: this.previousHash || undefined,
      hash: '', // Will be set below
    };

    // Calculate entry hash (including previous hash for chain)
    entry.hash = this.hash(JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      details: entry.details,
      previousHash: entry.previousHash,
    }));

    this.previousHash = entry.hash;
    this.auditTrail.push(entry);

    if (this.options.verbose) {
      console.log(`[Audit] ${entry.timestamp} ${entry.eventType}: ${entry.action}`);
    }
  }

  /**
   * Get current audit trail
   */
  getAuditTrail(): AuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Verify audit trail integrity
   */
  verifyAuditTrail(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < this.auditTrail.length; i++) {
      const entry = this.auditTrail[i];

      // Verify hash chain
      if (i > 0) {
        const prevEntry = this.auditTrail[i - 1];
        if (entry.previousHash !== prevEntry.hash) {
          errors.push(`Entry ${i}: Previous hash mismatch`);
        }
      }

      // Verify entry hash
      const expectedHash = this.hash(JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        eventType: entry.eventType,
        actor: entry.actor,
        action: entry.action,
        target: entry.target,
        details: entry.details,
        previousHash: entry.previousHash,
      }));

      if (entry.hash !== expectedHash) {
        errors.push(`Entry ${i}: Hash verification failed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${Date.now()}_${random}`;
  }

  /**
   * Calculate hash
   */
  private hash(data: string): string {
    return crypto
      .createHash(this.options.hashAlgorithm)
      .update(data)
      .digest('hex');
  }

  /**
   * Summarize data for evidence
   */
  private summarize(data: any): string {
    if (typeof data === 'string') {
      return this.truncate(data, 200);
    }

    if (Array.isArray(data)) {
      return `Array with ${data.length} items`;
    }

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      return `Object with keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
    }

    return String(data).slice(0, 200);
  }

  /**
   * Truncate string
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  }

  /**
   * Redact sensitive data
   */
  redact(data: string): string {
    let result = data;
    
    for (const pattern of this.options.redactionPatterns) {
      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, '[REDACTED]');
    }

    return result;
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Update collector options
   */
  setOptions(options: Partial<CollectorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): CollectorOptions {
    return { ...this.options };
  }

  /**
   * Reset collector state
   */
  reset(): void {
    this.auditTrail = [];
    this.previousHash = null;
    this.startTime = 0;
  }
}

// ============================================
// EXPORTS
// ============================================

export default EvidenceCollector;
