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
  patternId?: string;
  category?: string;
  formula?: string;
  priority?: number;
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
  patternId?: string;
  category?: string;
  formula?: string;
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
    skipped: number;
    wolframInvocations: number;
    cacheHits: number;
    totalLatencyMs: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely evaluate a mathematical expression
 */
function safeEval(expression: string): number | null {
  try {
    // Clean the expression
    const cleaned = expression
      .replace(/,/g, '')      // Remove commas
      .replace(/[$%]/g, '')   // Remove currency/percent
      .replace(/×/g, '*')     // Replace × with *
      .replace(/÷/g, '/')     // Replace ÷ with /
      .replace(/\s+/g, '');   // Remove whitespace

    // Only allow safe characters
    if (!/^[\d+\-*/().eE\s]+$/.test(cleaned)) {
      return null;
    }

    // Use Function constructor for safe evaluation
    const result = new Function(`return (${cleaned})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract numeric value from a result string
 */
function extractNumericResult(result: string): number | null {
  const cleaned = result.replace(/,/g, '').replace(/[$%]/g, '').trim();
  const match = cleaned.match(/(-?[\d.]+(?:e[+-]?\d+)?)/i);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) return num;
  }
  return null;
}

/**
 * Check if two numbers match within tolerance
 */
function numericMatch(computed: number, stated: number, tolerancePercent: number = 0.5): boolean {
  if (computed === stated) return true;
  if (stated === 0) return Math.abs(computed) < 0.0001;
  const percentDiff = Math.abs((computed - stated) / stated) * 100;
  return percentDiff <= tolerancePercent;
}

/**
 * Detect computational claims in text
 */
export function detectComputationalClaims(text: string): ComputationalClaim[] {
  const claims: ComputationalClaim[] = [];
  
  // Pattern: expression = result
  const patterns = [
    // Basic arithmetic: 100 + 50 = 150
    /(\d[\d,]*(?:\.\d+)?\s*[+\-*/×÷]\s*\d[\d,]*(?:\.\d+)?(?:\s*[+\-*/×÷]\s*\d[\d,]*(?:\.\d+)?)*)\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    
    // Fraction: 750,000 / 800,000 = 0.9375
    /(\$?[\d,]+(?:\.\d+)?\s*\/\s*\$?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    
    // Percentage: 15% of 1000 = 150
    /(\d+(?:\.\d+)?%\s+of\s+\$?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    
    // EVM: CPI = 750000 / 800000 = 0.9375
    /((?:CPI|SPI|EAC|ETC|VAC|CV|SV|TCPI)\s*=\s*[\d,./\s$]+)\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    
    // Compound interest patterns
    /(\$?[\d,]+(?:\.\d+)?\s+(?:at|@)\s+\d+(?:\.\d+)?%.*?(?:for|over)\s+\d+\s+(?:years?|months?))\s*(?:=|→|is|equals)\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
  ];
  
  let claimIndex = 0;
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      claims.push({
        id: `claim-${++claimIndex}`,
        expression: match[1].trim(),
        statedResult: match[2].replace(/,/g, ''),
        context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + match[0].length + 50)),
      });
    }
  }
  
  return claims;
}

// ============================================
// COMPUTATIONAL VALIDATOR CLASS
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
      const exprToEval = expressionMatch ? expressionMatch[1] : claim.expression;
      const localResult = safeEval(exprToEval);
      
      if (localResult !== null && numericMatch(localResult, statedValue)) {
        return {
          claimId: claim.id,
          tier: 'L1_LOCAL',
          status: 'VALID',
          confidence: 1.0,
          statedResult: claim.statedResult,
          computedResult: localResult.toString(),
          latencyMs: Date.now() - startTime,
          patternId: claim.patternId,
          category: claim.category,
          formula: claim.formula,
        };
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
          patternId: claim.patternId,
          category: claim.category,
          formula: claim.formula,
          evidence: {
            wolframQueryId: wolframResult.queryId,
            wolframRaw: wolframResult.rawResponse,
          },
        };
      }
      
      // Wolfram returned something but we couldn't parse it
      return {
        claimId: claim.id,
        tier: 'L1_5_WOLFRAM',
        status: 'UNCERTAIN',
        confidence: 0.5,
        statedResult: claim.statedResult,
        latencyMs: Date.now() - startTime,
        humanReviewRequired: true,
        reason: 'Could not parse Wolfram result',
        evidence: {
          wolframQueryId: wolframResult.queryId,
          wolframRaw: wolframResult.rawResponse,
        },
      };
    } catch (error: any) {
      // Wolfram API error - degrade gracefully
      return {
        claimId: claim.id,
        tier: 'L1_5_WOLFRAM',
        status: 'DEGRADED',
        confidence: 0.3,
        statedResult: claim.statedResult,
        latencyMs: Date.now() - startTime,
        humanReviewRequired: true,
        reason: `Wolfram API error: ${error.message || error.code || 'Unknown error'}`,
      };
    }
  }
  
  /**
   * Validate multiple claims and generate a report
   */
  async validateClaims(claims: ComputationalClaim[]): Promise<ValidationReport> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const results: ValidationResult[] = [];
    
    for (const claim of claims) {
      const result = await this.validateClaim(claim);
      results.push(result);
    }
    
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'VALID').length,
      invalid: results.filter(r => r.status === 'INVALID').length,
      uncertain: results.filter(r => r.status === 'UNCERTAIN').length,
      degraded: results.filter(r => r.status === 'DEGRADED').length,
      skipped: results.filter(r => r.status === 'SKIPPED').length,
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
