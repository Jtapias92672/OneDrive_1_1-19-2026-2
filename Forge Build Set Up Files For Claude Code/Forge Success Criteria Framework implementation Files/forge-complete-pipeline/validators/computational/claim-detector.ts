/**
 * FORGE Enhanced Claim Detector
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.1 - Enhanced Claim Detector with Prioritized Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Enhanced claim detection using prioritized pattern matching.
 *   Detects EVM, defense, financial, and statistical calculations
 *   with deduplication and category statistics.
 */

import {
  CLAIM_PATTERNS,
  ClaimPattern,
  ClaimCategory,
  ExtractedClaim,
  parseNumber,
  getPatternsByCategory,
  getAllPatternsSorted,
  getPatternStats,
} from './claim-patterns';

// ============================================
// TYPES
// ============================================

export interface DetectedClaim {
  /** Unique identifier */
  id: string;
  
  /** Pattern that matched */
  patternId: string;
  
  /** Pattern name for display */
  patternName: string;
  
  /** Category (evm, defense, financial, etc.) */
  category: ClaimCategory;
  
  /** Priority of the pattern (higher = more specific) */
  priority: number;
  
  /** Original matched text */
  originalText: string;
  
  /** Mathematical expression to evaluate */
  expression: string;
  
  /** The result claimed in the text */
  claimedResult: number;
  
  /** Surrounding context */
  context: string;
  
  /** Formula reference (e.g., "CPI = EV / AC") */
  formula?: string;
  
  /** Additional parameters for complex calculations */
  params?: Record<string, number>;
  
  /** Position in original text */
  position: {
    start: number;
    end: number;
  };
  
  /** Source metadata */
  source?: {
    document?: string;
    lineNumber?: number;
    agentId?: string;
  };
}

export interface DetectionOptions {
  /** Categories to include (default: all) */
  categories?: ClaimCategory[];
  
  /** Minimum priority threshold (default: 0) */
  minPriority?: number;
  
  /** Maximum claims to return (default: unlimited) */
  maxClaims?: number;
  
  /** Context size around match (default: 100 chars) */
  contextSize?: number;
  
  /** Deduplicate overlapping matches (default: true) */
  deduplicate?: boolean;
  
  /** Source metadata to attach */
  source?: {
    document?: string;
    lineNumber?: number;
    agentId?: string;
  };
}

export interface DetectionResult {
  /** Detected claims sorted by priority (highest first) */
  claims: DetectedClaim[];
  
  /** Statistics about the detection */
  stats: {
    totalMatches: number;
    afterDeduplication: number;
    byCategory: Record<ClaimCategory, number>;
    processingTimeMs: number;
  };
  
  /** Patterns that were checked */
  patternsChecked: number;
}

// ============================================
// CLAIM DETECTOR CLASS
// ============================================

export class ClaimDetector {
  private patterns: ClaimPattern[];
  private defaultOptions: DetectionOptions;

  constructor(options?: Partial<DetectionOptions>) {
    this.patterns = getAllPatternsSorted();
    this.defaultOptions = {
      categories: undefined, // all
      minPriority: 0,
      maxClaims: undefined, // unlimited
      contextSize: 100,
      deduplicate: true,
      ...options,
    };
  }

  /**
   * Detect all computational claims in text
   */
  detect(text: string, options?: DetectionOptions): DetectionResult {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    // Filter patterns by category and priority
    let patternsToUse = this.patterns;
    
    if (opts.categories && opts.categories.length > 0) {
      patternsToUse = patternsToUse.filter(p => opts.categories!.includes(p.category));
    }
    
    if (opts.minPriority && opts.minPriority > 0) {
      patternsToUse = patternsToUse.filter(p => p.priority >= opts.minPriority!);
    }
    
    // Detect claims
    const rawClaims: DetectedClaim[] = [];
    let claimIndex = 0;
    
    for (const pattern of patternsToUse) {
      // Reset regex lastIndex for global patterns
      pattern.pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.pattern.exec(text)) !== null) {
        const extracted = pattern.extract(match);
        
        if (extracted && extracted.result !== null && !isNaN(extracted.result)) {
          const claim: DetectedClaim = {
            id: `claim-${++claimIndex}`,
            patternId: pattern.id,
            patternName: pattern.name,
            category: pattern.category,
            priority: pattern.priority,
            originalText: match[0],
            expression: extracted.expression,
            claimedResult: extracted.result,
            context: this.extractContext(text, match.index, match[0].length, opts.contextSize!),
            formula: extracted.formula || pattern.formula,
            params: extracted.params,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
            source: opts.source,
          };
          
          rawClaims.push(claim);
        }
        
        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) {
          pattern.pattern.lastIndex++;
        }
      }
    }
    
    // Deduplicate overlapping claims (keep highest priority)
    let finalClaims = rawClaims;
    if (opts.deduplicate) {
      finalClaims = this.deduplicateClaims(rawClaims);
    }
    
    // Sort by priority (highest first), then by position
    finalClaims.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.position.start - b.position.start;
    });
    
    // Apply max claims limit
    if (opts.maxClaims && opts.maxClaims > 0) {
      finalClaims = finalClaims.slice(0, opts.maxClaims);
    }
    
    // Calculate statistics
    const byCategory: Record<ClaimCategory, number> = {
      evm: 0,
      defense: 0,
      financial: 0,
      statistical: 0,
      conversion: 0,
      generic: 0,
    };
    
    for (const claim of finalClaims) {
      byCategory[claim.category]++;
    }
    
    return {
      claims: finalClaims,
      stats: {
        totalMatches: rawClaims.length,
        afterDeduplication: finalClaims.length,
        byCategory,
        processingTimeMs: Date.now() - startTime,
      },
      patternsChecked: patternsToUse.length,
    };
  }

  /**
   * Detect only EVM claims
   */
  detectEVM(text: string, options?: DetectionOptions): DetectionResult {
    return this.detect(text, { ...options, categories: ['evm'] });
  }

  /**
   * Detect only defense contract claims
   */
  detectDefense(text: string, options?: DetectionOptions): DetectionResult {
    return this.detect(text, { ...options, categories: ['defense'] });
  }

  /**
   * Detect only financial claims
   */
  detectFinancial(text: string, options?: DetectionOptions): DetectionResult {
    return this.detect(text, { ...options, categories: ['financial'] });
  }

  /**
   * Quick check if text contains any computational claims
   */
  hasComputationalClaims(text: string): boolean {
    for (const pattern of this.patterns) {
      pattern.pattern.lastIndex = 0;
      if (pattern.pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(): Record<ClaimCategory, number> {
    return getPatternStats();
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private extractContext(text: string, matchStart: number, matchLength: number, contextSize: number): string {
    const start = Math.max(0, matchStart - contextSize);
    const end = Math.min(text.length, matchStart + matchLength + contextSize);
    
    let context = text.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  }

  private deduplicateClaims(claims: DetectedClaim[]): DetectedClaim[] {
    if (claims.length <= 1) return claims;
    
    // Sort by priority (highest first) so we keep the best match
    const sorted = [...claims].sort((a, b) => b.priority - a.priority);
    const kept: DetectedClaim[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];
    
    for (const claim of sorted) {
      const overlaps = usedRanges.some(range =>
        (claim.position.start < range.end && claim.position.end > range.start)
      );
      
      if (!overlaps) {
        kept.push(claim);
        usedRanges.push(claim.position);
      }
    }
    
    return kept;
  }
}

// ============================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================

let defaultDetector: ClaimDetector | null = null;

export function getClaimDetector(): ClaimDetector {
  if (!defaultDetector) {
    defaultDetector = new ClaimDetector();
  }
  return defaultDetector;
}

/**
 * Detect claims using default detector
 */
export function detectClaims(text: string, options?: DetectionOptions): DetectionResult {
  return getClaimDetector().detect(text, options);
}

/**
 * Detect EVM claims using default detector
 */
export function detectEVMClaims(text: string, options?: DetectionOptions): DetectionResult {
  return getClaimDetector().detectEVM(text, options);
}

/**
 * Detect defense claims using default detector
 */
export function detectDefenseClaims(text: string, options?: DetectionOptions): DetectionResult {
  return getClaimDetector().detectDefense(text, options);
}

/**
 * Detect financial claims using default detector
 */
export function detectFinancialClaims(text: string, options?: DetectionOptions): DetectionResult {
  return getClaimDetector().detectFinancial(text, options);
}

/**
 * Quick check for computational claims
 */
export function hasComputationalClaims(text: string): boolean {
  return getClaimDetector().hasComputationalClaims(text);
}

// ============================================
// EXPORTS
// ============================================

export default ClaimDetector;
