/**
 * FORGE Computational Accuracy Validator
 * 
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * @epic 14.1 - Computational Accuracy Layer
 * 
 * @description
 *   Multi-tier validation for computational claims in AI agent outputs.
 *   Follows FORGE's conditional invocation pattern:
 *   L1 (Local) → L1.5 (Wolfram) → L2 (Semantic) → Human Review
 * 
 * @wolfram-integration
 *   App ID: 2K3K8Q5XGA
 *   API: LLM API
 *   Invocation: Conditional (only when L1 fails)
 */

import { WolframClient, getWolframClient, WolframError } from './wolfram-client';

// ============================================
// TYPES
// ============================================

export type ValidationTier = 'L1_LOCAL' | 'L1_5_WOLFRAM' | 'L2_SEMANTIC' | 'HUMAN_REVIEW';
export type ValidationStatus = 'VALID' | 'INVALID' | 'UNCERTAIN' | 'DEGRADED' | 'SKIPPED';

export interface ComputationalClaim {
  id: string;
  expression: string;
  statedResult: string;
  context?: string;
  source?: {
    document?: string;
    lineNumber?: number;
    agentId?: string;
  };
}

export interface ValidationResult {
  claimId: string;
  tier: ValidationTier;
  status: ValidationStatus;
  confidence: number;
  statedResult: string;
  computedResult?: string;
  correctAnswer?: string;
  latencyMs: number;
  cached?: boolean;
  humanReviewRequired?: boolean;
  reason?: string;
  evidence?: {
    wolframQueryId?: string;
    wolframRaw?: string;
  };
}

export interface ValidationReport {
  reportId: string;
  timestamp: string;
  claims: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    uncertain: number;
    degraded: number;
    humanReviewRequired: number;
    wolframInvocations: number;
    cacheHits: number;
    totalLatencyMs: number;
  };
}

// ============================================
// COMPUTATIONAL CLAIM DETECTOR
// ============================================

const COMPUTATIONAL_PATTERNS = [
  // Explicit calculations
  /(\d+(?:,\d{3})*(?:\.\d+)?)\s*[+\-*/]\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*=\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g,
  
  // Percentages
  /(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:is|=|equals)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
  
  // Financial calculations (common in EVM/defense contexts)
  /(?:cost|budget|variance|SPI|CPI|EAC|ETC|BAC|BCWP|ACWP)\s*(?:is|=|:)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
  
  // Statistical claims
  /(?:average|mean|median|sum|total)\s*(?:is|=|:)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
  
  // Conversions
  /(\d+(?:\.\d+)?)\s*(?:miles?|km|feet|meters?|lbs?|kg)\s*(?:=|is|converts? to)\s*(\d+(?:\.\d+)?)/gi,
];

export function detectComputationalClaims(text: string): ComputationalClaim[] {
  const claims: ComputationalClaim[] = [];
  let claimIndex = 0;
  
  for (const pattern of COMPUTATIONAL_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      claims.push({
        id: `claim_${++claimIndex}_${Date.now()}`,
        expression: match[0],
        statedResult: match[match.length - 1], // Last captured group is typically the result
        context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      });
    }
  }
  
  return claims;
}

// ============================================
// LOCAL VALIDATOR (L1 - FREE, INSTANT)
// ============================================

function safeEval(expression: string): number | null {
  try {
    // Sanitize: only allow numbers and basic operators
    const sanitized = expression
      .replace(/[,$%]/g, '')
      .replace(/\s+/g, '')
      .replace(/x/gi, '*')
      .replace(/÷/g, '/');
    
    // Check for safe characters only
    if (!/^[\d+\-*/().^e\s]+$/i.test(sanitized)) {
      return null;
    }
    
    // Replace ^ with ** for exponentiation
    const jsExpression = sanitized.replace(/\^/g, '**');
    
    // Use Function constructor for safer eval
    const result = new Function(`return ${jsExpression}`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

function extractNumericResult(text: string): number | null {
  const cleaned = text.replace(/[,$%]/g, '').trim();
  const match = cleaned.match(/-?[\d.]+(?:e[+-]?\d+)?/i);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }
  return null;
}

function numericMatch(a: number, b: number, tolerancePercent: number = 0.5): boolean {
  if (a === b) return true;
  if (b === 0) return Math.abs(a) < 0.001;
  const diff = Math.abs((a - b) / b) * 100;
  return diff <= tolerancePercent;
}

// ============================================
// MAIN VALIDATOR CLASS
// ============================================

export class ComputationalValidator {
  private wolframClient: WolframClient;
  private validationMode: 'always' | 'conditional' | 'manual';
  
  constructor(options?: { wolframClient?: WolframClient; mode?: 'always' | 'conditional' | 'manual' }) {
    this.wolframClient = options?.wolframClient ?? getWolframClient();
    this.validationMode = options?.mode ?? 'conditional';
  }
  
  /**
   * Validate a single computational claim
   * Uses tiered approach: L1 (local) → L1.5 (Wolfram) → flag for review
   */
  async validateClaim(claim: ComputationalClaim): Promise<ValidationResult> {
    const startTime = Date.now();
    
    // ─────────────────────────────────────────
    // TIER L1: Local Deterministic Check (FREE)
    // ─────────────────────────────────────────
    const statedValue = extractNumericResult(claim.statedResult);
    
    if (statedValue !== null) {
      // Try to extract and evaluate the expression
      const expressionMatch = claim.expression.match(/(.+?)\s*=\s*.+$/);
      if (expressionMatch) {
        const localResult = safeEval(expressionMatch[1]);
        
        if (localResult !== null && numericMatch(localResult, statedValue)) {
          return {
            claimId: claim.id,
            tier: 'L1_LOCAL',
            status: 'VALID',
            confidence: 1.0,
            statedResult: claim.statedResult,
            computedResult: localResult.toString(),
            latencyMs: Date.now() - startTime,
          };
        }
      }
    }
    
    // ─────────────────────────────────────────
    // TIER L1.5: Wolfram Alpha (CONDITIONAL)
    // ─────────────────────────────────────────
    if (this.validationMode === 'manual') {
      return {
        claimId: claim.id,
        tier: 'HUMAN_REVIEW',
        status: 'SKIPPED',
        confidence: 0,
        statedResult: claim.statedResult,
        latencyMs: Date.now() - startTime,
        humanReviewRequired: true,
        reason: 'Manual mode - Wolfram invocation skipped',
      };
    }
    
    // Check Wolfram budget
    if (!this.wolframClient.hasBudget()) {
      return {
        claimId: claim.id,
        tier: 'L1_5_WOLFRAM',
        status: 'DEGRADED',
        confidence: 0.3,
        statedResult: claim.statedResult,
        latencyMs: Date.now() - startTime,
        humanReviewRequired: true,
        reason: 'Wolfram API budget exhausted',
      };
    }
    
    try {
      // Build query for Wolfram
      const query = this.buildWolframQuery(claim);
      const wolframResult = await this.wolframClient.query(query);
      
      const computedValue = wolframResult.numericValue;
      
      if (computedValue !== null && statedValue !== null) {
        const isValid = numericMatch(computedValue, statedValue, 0.1);
        
        return {
          claimId: claim.id,
          tier: 'L1_5_WOLFRAM',
          status: isValid ? 'VALID' : 'INVALID',
          confidence: 0.99,
          statedResult: claim.statedResult,
          computedResult: computedValue.toString(),
          correctAnswer: isValid ? undefined : computedValue.toString(),
          latencyMs: Date.now() - startTime,
          cached: wolframResult.cached,
          evidence: {
            wolframQueryId: wolframResult.queryId,
            wolframRaw: wolframResult.raw,
          },
        };
      }
      
      // Wolfram returned non-numeric result
      return {
        claimId: claim.id,
        tier: 'L1_5_WOLFRAM',
        status: 'UNCERTAIN',
        confidence: 0.5,
        statedResult: claim.statedResult,
        computedResult: wolframResult.result,
        latencyMs: Date.now() - startTime,
        cached: wolframResult.cached,
        humanReviewRequired: true,
        reason: 'Wolfram returned non-numeric result',
        evidence: {
          wolframQueryId: wolframResult.queryId,
          wolframRaw: wolframResult.raw,
        },
      };
      
    } catch (error) {
      const wolframError = error as WolframError;
      
      return {
        claimId: claim.id,
        tier: 'L1_5_WOLFRAM',
        status: 'DEGRADED',
        confidence: 0.3,
        statedResult: claim.statedResult,
        latencyMs: Date.now() - startTime,
        humanReviewRequired: true,
        reason: `Wolfram error: ${wolframError.message || 'Unknown error'}`,
      };
    }
  }
  
  /**
   * Validate multiple claims and generate report
   */
  async validateClaims(claims: ComputationalClaim[]): Promise<ValidationReport> {
    const reportId = `vr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const results: ValidationResult[] = [];
    
    for (const claim of claims) {
      const result = await this.validateClaim(claim);
      results.push(result);
    }
    
    // Generate summary
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'VALID').length,
      invalid: results.filter(r => r.status === 'INVALID').length,
      uncertain: results.filter(r => r.status === 'UNCERTAIN').length,
      degraded: results.filter(r => r.status === 'DEGRADED').length,
      humanReviewRequired: results.filter(r => r.humanReviewRequired).length,
      wolframInvocations: results.filter(r => r.tier === 'L1_5_WOLFRAM' && !r.cached).length,
      cacheHits: results.filter(r => r.cached).length,
      totalLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
    };
    
    return {
      reportId,
      timestamp: new Date().toISOString(),
      claims: results,
      summary,
    };
  }
  
  /**
   * Validate text by detecting and validating all computational claims
   */
  async validateText(text: string): Promise<ValidationReport> {
    const claims = detectComputationalClaims(text);
    return this.validateClaims(claims);
  }
  
  /**
   * Get Wolfram usage statistics
   */
  getWolframUsage() {
    return this.wolframClient.getUsageStats();
  }
  
  // ============================================
  // PRIVATE HELPERS
  // ============================================
  
  private buildWolframQuery(claim: ComputationalClaim): string {
    // Extract the mathematical expression from the claim
    const expressionMatch = claim.expression.match(/(.+?)\s*=\s*.+$/);
    if (expressionMatch) {
      return expressionMatch[1].replace(/,/g, '').trim();
    }
    
    // Handle percentage calculations
    const percentMatch = claim.expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
    if (percentMatch) {
      return `${percentMatch[1]}% of ${percentMatch[2].replace(/,/g, '')}`;
    }
    
    // Default: send the whole expression
    return claim.expression.replace(/,/g, '');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let defaultValidator: ComputationalValidator | null = null;

export function getComputationalValidator(): ComputationalValidator {
  if (!defaultValidator) {
    defaultValidator = new ComputationalValidator();
  }
  return defaultValidator;
}

// ============================================
// EXPORTS
// ============================================

export default ComputationalValidator;
