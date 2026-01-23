/**
 * FORGE Evidence Pack Builder
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.2 - Evidence Pack Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Generates compliance-ready evidence packs containing:
 *   - All detected claims with validation results
 *   - Wolfram API call records
 *   - Complete audit trail
 *   - Cost tracking
 *   
 *   Designed for DCMA/DFARS/CMMC compliance requirements.
 */

import { createHash } from 'crypto';
import {
  ValidationResult,
  ValidationReport,
  ComputationalClaim,
  ValidationTier,
  ValidationStatus,
} from './computational-validator';
import { DetectedClaim, DetectionResult } from './claim-detector';

// ============================================
// TYPES
// ============================================

export interface EvidencePackConfig {
  /** Include raw Wolfram responses */
  includeRawResponses: boolean;
  
  /** Include surrounding context for claims */
  includeContext: boolean;
  
  /** Hash algorithm for integrity */
  hashAlgorithm: 'sha256' | 'sha512';
  
  /** Compliance framework */
  complianceFramework: 'DCMA' | 'DFARS' | 'CMMC' | 'SOC2' | 'CUSTOM';
  
  /** Evidence pack version */
  version: string;
}

export interface AuditEntry {
  timestamp: string;
  action: 'CLAIM_DETECTED' | 'VALIDATION_START' | 'L1_COMPLETE' | 'WOLFRAM_CALL' | 
          'VALIDATION_COMPLETE' | 'REPAIR_SUGGESTED' | 'HUMAN_REVIEW' | 'PACK_FINALIZED';
  tier?: ValidationTier;
  claimId?: string;
  details: Record<string, unknown>;
  durationMs?: number;
}

export interface ClaimEvidence {
  /** Original claim */
  claim: {
    id: string;
    expression: string;
    statedResult: string;
    category?: string;
    formula?: string;
    context?: string;
    position?: { start: number; end: number };
  };
  
  /** Validation chain (L1 → L1.5 → L2) */
  validationChain: Array<{
    tier: ValidationTier;
    status: ValidationStatus;
    confidence: number;
    computedResult?: string;
    latencyMs: number;
    cached?: boolean;
    wolframQueryId?: string;
  }>;
  
  /** Final determination */
  finalStatus: ValidationStatus;
  finalConfidence: number;
  
  /** Repair suggestions if invalid */
  repairSuggestion?: {
    originalValue: string;
    correctValue: string;
    formula?: string;
    severity: 'critical' | 'major' | 'minor';
  };
}

export interface CostSummary {
  totalQueries: number;
  l1Queries: number;
  wolframQueries: number;
  wolframCached: number;
  estimatedCostUsd: number;
  budgetUsedPercent: number;
}

export interface EvidencePackSummary {
  totalClaims: number;
  validClaims: number;
  invalidClaims: number;
  uncertainClaims: number;
  degradedClaims: number;
  skippedClaims: number;
  
  passRate: number;
  averageConfidence: number;
  
  byCategory: Record<string, {
    total: number;
    valid: number;
    invalid: number;
  }>;
  
  byTier: Record<ValidationTier, number>;
}

export interface EvidencePack {
  /** Pack metadata */
  id: string;
  version: string;
  createdAt: string;
  finalizedAt?: string;
  status: 'building' | 'complete' | 'failed';
  
  /** Source information */
  source: {
    type: 'agent_output' | 'document' | 'api_response' | 'user_input';
    id?: string;
    hash: string;
    length: number;
    preview: string;
  };
  
  /** Compliance metadata */
  compliance: {
    framework: string;
    validatorVersion: string;
    integrityHash: string;
  };
  
  /** Summary statistics */
  summary: EvidencePackSummary;
  
  /** Cost tracking */
  cost: CostSummary;
  
  /** Detailed evidence for each claim */
  claims: ClaimEvidence[];
  
  /** Complete audit trail */
  auditTrail: AuditEntry[];
}

// ============================================
// EVIDENCE PACK BUILDER
// ============================================

export class EvidencePackBuilder {
  private config: EvidencePackConfig;
  private pack: Partial<EvidencePack>;
  private auditTrail: AuditEntry[] = [];
  private startTime: number;

  constructor(config?: Partial<EvidencePackConfig>) {
    this.config = {
      includeRawResponses: true,
      includeContext: true,
      hashAlgorithm: 'sha256',
      complianceFramework: 'DCMA',
      version: '1.0.0',
      ...config,
    };
    
    this.startTime = Date.now();
    this.pack = {
      id: this.generatePackId(),
      version: this.config.version,
      createdAt: new Date().toISOString(),
      status: 'building',
    };
  }

  /**
   * Set the source text being validated
   */
  setSource(text: string, type: EvidencePack['source']['type'], id?: string): this {
    this.pack.source = {
      type,
      id,
      hash: this.hashText(text),
      length: text.length,
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
    };
    
    this.addAuditEntry('CLAIM_DETECTED', {
      sourceType: type,
      sourceLength: text.length,
      sourceHash: this.pack.source.hash,
    });
    
    return this;
  }

  /**
   * Add validation results from a validation report
   */
  addValidationReport(report: ValidationReport, detectionResult?: DetectionResult): this {
    this.addAuditEntry('VALIDATION_START', {
      reportId: report.reportId,
      claimCount: report.claims.length,
    });
    
    const claimEvidences: ClaimEvidence[] = [];
    
    for (const result of report.claims) {
      const evidence = this.buildClaimEvidence(result, detectionResult);
      claimEvidences.push(evidence);
      
      // Add tier-specific audit entries
      this.addAuditEntry(
        result.tier === 'L1_LOCAL' ? 'L1_COMPLETE' : 
        result.tier === 'L1_5_WOLFRAM' ? 'WOLFRAM_CALL' : 'VALIDATION_COMPLETE',
        {
          claimId: result.claimId,
          status: result.status,
          confidence: result.confidence,
          cached: result.cached,
        },
        result.tier,
        result.claimId,
        result.latencyMs
      );
    }
    
    this.pack.claims = claimEvidences;
    this.pack.summary = this.calculateSummary(claimEvidences);
    this.pack.cost = this.calculateCost(report);
    
    return this;
  }

  /**
   * Add a repair suggestion for an invalid claim
   */
  addRepairSuggestion(
    claimId: string,
    originalValue: string,
    correctValue: string,
    severity: 'critical' | 'major' | 'minor',
    formula?: string
  ): this {
    const claim = this.pack.claims?.find(c => c.claim.id === claimId);
    if (claim) {
      claim.repairSuggestion = {
        originalValue,
        correctValue,
        formula,
        severity,
      };
      
      this.addAuditEntry('REPAIR_SUGGESTED', {
        claimId,
        originalValue,
        correctValue,
        severity,
      });
    }
    return this;
  }

  /**
   * Flag a claim for human review
   */
  flagForHumanReview(claimId: string, reason: string): this {
    this.addAuditEntry('HUMAN_REVIEW', {
      claimId,
      reason,
      flaggedAt: new Date().toISOString(),
    });
    return this;
  }

  /**
   * Finalize and return the evidence pack
   */
  finalize(): EvidencePack {
    this.addAuditEntry('PACK_FINALIZED', {
      totalDurationMs: Date.now() - this.startTime,
      claimCount: this.pack.claims?.length || 0,
    });
    
    this.pack.finalizedAt = new Date().toISOString();
    this.pack.status = 'complete';
    this.pack.auditTrail = this.auditTrail;
    
    // Calculate integrity hash over the entire pack
    this.pack.compliance = {
      framework: this.config.complianceFramework,
      validatorVersion: this.config.version,
      integrityHash: this.calculateIntegrityHash(),
    };
    
    return this.pack as EvidencePack;
  }

  /**
   * Export to JSON (compliance-ready format)
   */
  toJSON(): string {
    const pack = this.pack.status === 'complete' ? this.pack : this.finalize();
    return JSON.stringify(pack, null, 2);
  }

  /**
   * Export to CSV (for spreadsheet analysis)
   */
  toCSV(): string {
    const claims = this.pack.claims || [];
    const headers = [
      'Claim ID',
      'Expression',
      'Stated Result',
      'Category',
      'Final Status',
      'Confidence',
      'Validation Tier',
      'Computed Result',
      'Correct Value',
      'Severity',
    ];
    
    const rows = claims.map(c => [
      c.claim.id,
      `"${c.claim.expression.replace(/"/g, '""')}"`,
      c.claim.statedResult,
      c.claim.category || '',
      c.finalStatus,
      c.finalConfidence.toFixed(2),
      c.validationChain[c.validationChain.length - 1]?.tier || '',
      c.validationChain[c.validationChain.length - 1]?.computedResult || '',
      c.repairSuggestion?.correctValue || '',
      c.repairSuggestion?.severity || '',
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private generatePackId(): string {
    return `evp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashText(text: string): string {
    return createHash(this.config.hashAlgorithm).update(text).digest('hex').substring(0, 16);
  }

  private calculateIntegrityHash(): string {
    const data = JSON.stringify({
      source: this.pack.source,
      claims: this.pack.claims,
      summary: this.pack.summary,
    });
    return createHash(this.config.hashAlgorithm).update(data).digest('hex');
  }

  private addAuditEntry(
    action: AuditEntry['action'],
    details: Record<string, unknown>,
    tier?: ValidationTier,
    claimId?: string,
    durationMs?: number
  ): void {
    this.auditTrail.push({
      timestamp: new Date().toISOString(),
      action,
      tier,
      claimId,
      details,
      durationMs,
    });
  }

  private buildClaimEvidence(result: ValidationResult, detectionResult?: DetectionResult): ClaimEvidence {
    // Find matching detected claim for additional metadata
    const detectedClaim = detectionResult?.claims.find(c => c.id === result.claimId);
    
    return {
      claim: {
        id: result.claimId,
        expression: detectedClaim?.expression || '',
        statedResult: result.statedResult,
        category: result.category || detectedClaim?.category,
        formula: result.formula || detectedClaim?.formula,
        context: this.config.includeContext ? detectedClaim?.context : undefined,
        position: detectedClaim?.position,
      },
      validationChain: [{
        tier: result.tier,
        status: result.status,
        confidence: result.confidence,
        computedResult: result.computedResult,
        latencyMs: result.latencyMs,
        cached: result.cached,
        wolframQueryId: result.evidence?.wolframQueryId,
      }],
      finalStatus: result.status,
      finalConfidence: result.confidence,
    };
  }

  private calculateSummary(claims: ClaimEvidence[]): EvidencePackSummary {
    const byCategory: Record<string, { total: number; valid: number; invalid: number }> = {};
    const byTier: Record<ValidationTier, number> = {
      L1_LOCAL: 0,
      L1_5_WOLFRAM: 0,
      L2_SEMANTIC: 0,
      HUMAN_REVIEW: 0,
    };
    
    let validCount = 0;
    let invalidCount = 0;
    let uncertainCount = 0;
    let degradedCount = 0;
    let skippedCount = 0;
    let totalConfidence = 0;
    
    for (const claim of claims) {
      // Count by status
      switch (claim.finalStatus) {
        case 'VALID': validCount++; break;
        case 'INVALID': invalidCount++; break;
        case 'UNCERTAIN': uncertainCount++; break;
        case 'DEGRADED': degradedCount++; break;
        case 'SKIPPED': skippedCount++; break;
      }
      
      totalConfidence += claim.finalConfidence;
      
      // Count by category
      const cat = claim.claim.category || 'unknown';
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, valid: 0, invalid: 0 };
      }
      byCategory[cat].total++;
      if (claim.finalStatus === 'VALID') byCategory[cat].valid++;
      if (claim.finalStatus === 'INVALID') byCategory[cat].invalid++;
      
      // Count by tier
      const lastTier = claim.validationChain[claim.validationChain.length - 1]?.tier;
      if (lastTier) byTier[lastTier]++;
    }
    
    return {
      totalClaims: claims.length,
      validClaims: validCount,
      invalidClaims: invalidCount,
      uncertainClaims: uncertainCount,
      degradedClaims: degradedCount,
      skippedClaims: skippedCount,
      passRate: claims.length > 0 ? validCount / claims.length : 0,
      averageConfidence: claims.length > 0 ? totalConfidence / claims.length : 0,
      byCategory,
      byTier,
    };
  }

  private calculateCost(report: ValidationReport): CostSummary {
    const COST_PER_WOLFRAM_QUERY = 0.01; // Estimated
    const wolframQueries = report.summary.wolframInvocations;
    const wolframCached = report.summary.cacheHits;
    
    return {
      totalQueries: report.claims.length,
      l1Queries: report.claims.filter(c => c.tier === 'L1_LOCAL').length,
      wolframQueries,
      wolframCached,
      estimatedCostUsd: wolframQueries * COST_PER_WOLFRAM_QUERY,
      budgetUsedPercent: (wolframQueries / 2000) * 100, // Based on 2000/month free tier
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create an evidence pack from a validation report
 */
export function createEvidencePack(
  text: string,
  report: ValidationReport,
  detectionResult?: DetectionResult,
  config?: Partial<EvidencePackConfig>
): EvidencePack {
  return new EvidencePackBuilder(config)
    .setSource(text, 'agent_output')
    .addValidationReport(report, detectionResult)
    .finalize();
}

/**
 * Export evidence pack to JSON file content
 */
export function exportToJSON(pack: EvidencePack): string {
  return JSON.stringify(pack, null, 2);
}

/**
 * Verify evidence pack integrity
 */
export function verifyIntegrity(pack: EvidencePack): boolean {
  const data = JSON.stringify({
    source: pack.source,
    claims: pack.claims,
    summary: pack.summary,
  });
  
  const calculatedHash = createHash('sha256').update(data).digest('hex');
  return calculatedHash === pack.compliance.integrityHash;
}

// ============================================
// EXPORTS
// ============================================

export default EvidencePackBuilder;
