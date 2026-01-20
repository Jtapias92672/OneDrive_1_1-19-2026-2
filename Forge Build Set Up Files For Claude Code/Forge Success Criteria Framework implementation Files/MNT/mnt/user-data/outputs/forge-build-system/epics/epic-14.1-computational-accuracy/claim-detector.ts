/**
 * FORGE Enhanced Claim Detector
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.1 - Defense & EVM Claim Detector Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Enhanced claim detection using prioritized pattern matching.
 *   Detects EVM, defense, financial, and statistical calculations.
 */

import {
  CLAIM_PATTERNS,
  ClaimPattern,
  ClaimCategory,
  ExtractedClaim,
  parseNumber,
  getPatternsByCategory,
  getAllPatternsSorted
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
  
  /** Type of calculation */
  calculationType: 'arithmetic' | 'compound_interest' | 'percentage' | 'ratio' | 'conversion';
  
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
  /** All detected claims */
  claims: DetectedClaim[];
  
  /** Statistics */
  stats: {
    totalMatches: number;
    byCategory: Record<ClaimCategory, number>;
    byPriority: { high: number; medium: number; low: number };
    duplicatesRemoved: number;
  };
  
  /** Processing metadata */
  metadata: {
    patternsChecked: number;
    processingTimeMs: number;
    textLength: number;
  };
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
      categories: undefined, // All categories
      minPriority: 0,
      maxClaims: undefined,
      contextSize: 100,
      deduplicate: true,
      ...options
    };
  }
  
  /**
   * Detect all computational claims in text
   */
  detect(text: string, options?: DetectionOptions): DetectionResult {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    // Filter patterns based on options
    let activePatterns = this.patterns;
    
    if (opts.categories && opts.categories.length > 0) {
      activePatterns = activePatterns.filter(p => opts.categories!.includes(p.category));
    }
    
    if (opts.minPriority && opts.minPriority > 0) {
      activePatterns = activePatterns.filter(p => p.priority >= opts.minPriority!);
    }
    
    // Run detection
    const allClaims: DetectedClaim[] = [];
    let claimIndex = 0;
    
    for (const pattern of activePatterns) {
      // Reset regex state for global patterns
      pattern.pattern.lastIndex = 0;
      
      let match: RegExpExecArray | null;
      
      while ((match = pattern.pattern.exec(text)) !== null) {
        try {
          const extracted = pattern.extractor(match, text);
          
          if (extracted && !isNaN(extracted.claimedResult)) {
            const claim: DetectedClaim = {
              id: `claim_${++claimIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              patternId: pattern.id,
              patternName: pattern.name,
              category: pattern.category,
              priority: pattern.priority,
              originalText: match[0],
              expression: extracted.expression,
              claimedResult: extracted.claimedResult,
              context: this.getContext(text, match.index, match[0].length, opts.contextSize!),
              formula: extracted.formula,
              params: extracted.params,
              calculationType: extracted.type,
              position: {
                start: match.index,
                end: match.index + match[0].length
              },
              source: opts.source
            };
            
            allClaims.push(claim);
          }
        } catch (error) {
          // Log extraction error but continue
          console.warn(`[ClaimDetector] Extraction error for pattern ${pattern.id}:`, error);
        }
      }
    }
    
    // Deduplicate overlapping matches
    let duplicatesRemoved = 0;
    let finalClaims = allClaims;
    
    if (opts.deduplicate) {
      const deduped = this.deduplicateClaims(allClaims);
      duplicatesRemoved = allClaims.length - deduped.length;
      finalClaims = deduped;
    }
    
    // Apply max claims limit
    if (opts.maxClaims && finalClaims.length > opts.maxClaims) {
      finalClaims = finalClaims.slice(0, opts.maxClaims);
    }
    
    // Calculate statistics
    const stats = this.calculateStats(finalClaims, duplicatesRemoved);
    
    return {
      claims: finalClaims,
      stats,
      metadata: {
        patternsChecked: activePatterns.length,
        processingTimeMs: Date.now() - startTime,
        textLength: text.length
      }
    };
  }
  
  /**
   * Detect claims in a specific category only
   */
  detectByCategory(text: string, category: ClaimCategory, options?: DetectionOptions): DetectionResult {
    return this.detect(text, { ...options, categories: [category] });
  }
  
  /**
   * Detect EVM claims only
   */
  detectEVM(text: string, options?: DetectionOptions): DetectionResult {
    return this.detectByCategory(text, 'evm', options);
  }
  
  /**
   * Detect defense contract claims only
   */
  detectDefense(text: string, options?: DetectionOptions): DetectionResult {
    return this.detectByCategory(text, 'defense', options);
  }
  
  /**
   * Detect financial claims only
   */
  detectFinancial(text: string, options?: DetectionOptions): DetectionResult {
    return this.detectByCategory(text, 'financial', options);
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
   * Count claims without full extraction (faster)
   */
  countClaims(text: string): number {
    let count = 0;
    
    for (const pattern of this.patterns) {
      pattern.pattern.lastIndex = 0;
      const matches = text.match(pattern.pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }
  
  // ============================================
  // PRIVATE HELPERS
  // ============================================
  
  /**
   * Get surrounding context from text
   */
  private getContext(text: string, matchIndex: number, matchLength: number, contextSize: number): string {
    const start = Math.max(0, matchIndex - contextSize);
    const end = Math.min(text.length, matchIndex + matchLength + contextSize);
    
    let context = text.slice(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  }
  
  /**
   * Remove overlapping/duplicate claims, keeping highest priority
   */
  private deduplicateClaims(claims: DetectedClaim[]): DetectedClaim[] {
    if (claims.length <= 1) return claims;
    
    // Sort by priority (highest first), then by position
    const sorted = [...claims].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.position.start - b.position.start;
    });
    
    const kept: DetectedClaim[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];
    
    for (const claim of sorted) {
      // Check if this claim overlaps with any already kept
      const overlaps = usedRanges.some(range => 
        (claim.position.start >= range.start && claim.position.start < range.end) ||
        (claim.position.end > range.start && claim.position.end <= range.end) ||
        (claim.position.start <= range.start && claim.position.end >= range.end)
      );
      
      if (!overlaps) {
        kept.push(claim);
        usedRanges.push(claim.position);
      }
    }
    
    // Sort by position for consistent output
    return kept.sort((a, b) => a.position.start - b.position.start);
  }
  
  /**
   * Calculate detection statistics
   */
  private calculateStats(
    claims: DetectedClaim[], 
    duplicatesRemoved: number
  ): DetectionResult['stats'] {
    const byCategory: Record<ClaimCategory, number> = {
      evm: 0,
      defense: 0,
      financial: 0,
      statistical: 0,
      conversion: 0,
      date: 0,
      generic: 0
    };
    
    let high = 0, medium = 0, low = 0;
    
    for (const claim of claims) {
      byCategory[claim.category]++;
      
      if (claim.priority >= 80) high++;
      else if (claim.priority >= 50) medium++;
      else low++;
    }
    
    return {
      totalMatches: claims.length,
      byCategory,
      byPriority: { high, medium, low },
      duplicatesRemoved
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Default detector instance
 */
let defaultDetector: ClaimDetector | null = null;

/**
 * Get or create the default detector
 */
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
 * Quick check for computational claims
 */
export function hasComputationalClaims(text: string): boolean {
  return getClaimDetector().hasComputationalClaims(text);
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

import { ComputationalClaim } from './computational-validator';

/**
 * Legacy-compatible claim detection function
 * @deprecated Use detectClaims() instead
 */
export function detectComputationalClaimsEnhanced(text: string): ComputationalClaim[] {
  const result = detectClaims(text);
  
  return result.claims.map(claim => ({
    id: claim.id,
    expression: claim.expression,
    statedResult: claim.claimedResult.toString(),
    context: claim.context,
    source: claim.source
  }));
}

// ============================================
// EXPORTS
// ============================================

export {
  ClaimCategory,
  ClaimPattern,
  ExtractedClaim
} from './claim-patterns';

export default ClaimDetector;
