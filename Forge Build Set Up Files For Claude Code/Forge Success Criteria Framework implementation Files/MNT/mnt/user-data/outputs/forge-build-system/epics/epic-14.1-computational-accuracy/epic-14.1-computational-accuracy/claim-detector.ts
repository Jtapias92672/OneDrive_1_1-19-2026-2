/**
 * FORGE Platform - Computational Claim Detector
 * @epic 14.1 - Computational Accuracy Layer
 * 
 * Detects and extracts computational claims from AI agent outputs
 * with context awareness, multi-line support, and variable tracking.
 */

import { ClaimPattern, claimPatterns, getPatternsByCategory } from './claim-patterns';

// ============================================================================
// Types
// ============================================================================

export interface DetectedClaim {
  id: string;
  expression: string;
  expectedValue: number | string;
  actualValue?: number | string;
  context: string;
  lineNumber: number;
  startIndex: number;
  endIndex: number;
  pattern: ClaimPattern;
  category: string;
  variables: Map<string, number>;
  unit?: string;
  confidence: number;
  rawMatch: string;
}

export interface ClaimDetectorConfig {
  patterns?: ClaimPattern[];
  contextWindow?: number;
  multiLineEnabled?: boolean;
  variableTracking?: boolean;
  unitAware?: boolean;
  minConfidence?: number;
  maxClaims?: number;
  priorityCategories?: string[];
}

export interface DetectionResult {
  claims: DetectedClaim[];
  stats: {
    totalDetected: number;
    byCategory: Record<string, number>;
    avgConfidence: number;
    detectionTimeMs: number;
  };
}

interface VariableAssignment {
  name: string;
  value: number;
  lineNumber: number;
}

// ============================================================================
// Claim Detector Class
// ============================================================================

export class ClaimDetector {
  private config: Required<ClaimDetectorConfig>;
  private patterns: ClaimPattern[];
  private variableStore: Map<string, number> = new Map();

  constructor(config: ClaimDetectorConfig = {}) {
    this.config = {
      patterns: config.patterns ?? claimPatterns,
      contextWindow: config.contextWindow ?? 100,
      multiLineEnabled: config.multiLineEnabled ?? true,
      variableTracking: config.variableTracking ?? true,
      unitAware: config.unitAware ?? true,
      minConfidence: config.minConfidence ?? 0.5,
      maxClaims: config.maxClaims ?? 100,
      priorityCategories: config.priorityCategories ?? ['evm', 'defense', 'financial'],
    };
    
    // Sort patterns by priority (higher first)
    this.patterns = [...this.config.patterns].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Detect all computational claims in text
   */
  async detect(text: string): Promise<DetectionResult> {
    const startTime = Date.now();
    const claims: DetectedClaim[] = [];
    
    // Reset variable store for new detection
    this.variableStore.clear();
    
    // Pre-process: extract variable assignments
    if (this.config.variableTracking) {
      this.extractVariableAssignments(text);
    }
    
    // Normalize text for detection
    const normalizedText = this.normalizeText(text);
    const lines = text.split('\n');
    
    // Detect claims using each pattern
    for (const pattern of this.patterns) {
      if (claims.length >= this.config.maxClaims) break;
      
      const matches = this.findPatternMatches(normalizedText, pattern, lines);
      
      for (const match of matches) {
        if (match.confidence >= this.config.minConfidence) {
          // Avoid duplicate claims
          if (!this.isDuplicate(claims, match)) {
            claims.push(match);
          }
        }
      }
    }
    
    // Sort by position in text
    claims.sort((a, b) => a.startIndex - b.startIndex);
    
    // Compute stats
    const stats = this.computeStats(claims, startTime);
    
    return { claims, stats };
  }

  /**
   * Detect claims with streaming results
   */
  async *detectStream(text: string): AsyncGenerator<DetectedClaim> {
    const result = await this.detect(text);
    for (const claim of result.claims) {
      yield claim;
    }
  }

  /**
   * Extract variable assignments from text
   */
  private extractVariableAssignments(text: string): void {
    // Pattern: Variable = Value
    const assignmentPattern = /\b([A-Z]{2,}|[A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$?([\d,]+(?:\.\d+)?)/g;
    
    let match;
    while ((match = assignmentPattern.exec(text)) !== null) {
      const name = match[1].toUpperCase();
      const value = parseFloat(match[2].replace(/,/g, ''));
      
      if (!isNaN(value)) {
        this.variableStore.set(name, value);
      }
    }
    
    // Also extract from "X is Y" patterns
    const isPattern = /\b([A-Z]{2,})\s+is\s+\$?([\d,]+(?:\.\d+)?)/gi;
    while ((match = isPattern.exec(text)) !== null) {
      const name = match[1].toUpperCase();
      const value = parseFloat(match[2].replace(/,/g, ''));
      
      if (!isNaN(value)) {
        this.variableStore.set(name, value);
      }
    }
  }

  /**
   * Find matches for a specific pattern
   */
  private findPatternMatches(
    text: string, 
    pattern: ClaimPattern,
    lines: string[]
  ): DetectedClaim[] {
    const matches: DetectedClaim[] = [];
    const regex = new RegExp(pattern.pattern, 'gi');
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const claim = this.createClaim(match, pattern, text, lines);
      if (claim) {
        matches.push(claim);
      }
    }
    
    return matches;
  }

  /**
   * Create a DetectedClaim from a regex match
   */
  private createClaim(
    match: RegExpExecArray,
    pattern: ClaimPattern,
    text: string,
    lines: string[]
  ): DetectedClaim | null {
    try {
      // Extract expression and expected value
      const { expression, expectedValue } = this.parseMatch(match, pattern);
      
      if (!expression || expectedValue === undefined) {
        return null;
      }
      
      // Get line number
      const lineNumber = this.getLineNumber(text, match.index, lines);
      
      // Extract context
      const context = this.extractContext(text, match.index, match[0].length);
      
      // Extract unit if present
      const unit = this.extractUnit(match[0]);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(match, pattern);
      
      return {
        id: this.generateClaimId(),
        expression,
        expectedValue,
        context,
        lineNumber,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        pattern,
        category: pattern.category,
        variables: new Map(this.variableStore),
        unit,
        confidence,
        rawMatch: match[0],
      };
    } catch (error) {
      // Log but don't throw - continue processing other matches
      console.warn('Failed to create claim from match:', error);
      return null;
    }
  }

  /**
   * Parse expression and expected value from match
   */
  private parseMatch(
    match: RegExpExecArray,
    pattern: ClaimPattern
  ): { expression: string; expectedValue: number | string } {
    // Standard format: X / Y = Z or X op Y = Z
    const groups = match.groups || {};
    
    // Try to extract from named groups first
    if (groups.expression && groups.result) {
      return {
        expression: groups.expression.trim(),
        expectedValue: this.parseValue(groups.result),
      };
    }
    
    // Fallback: parse from full match
    const parts = match[0].split('=');
    if (parts.length === 2) {
      return {
        expression: parts[0].trim(),
        expectedValue: this.parseValue(parts[1]),
      };
    }
    
    // Try pattern-specific parsing
    if (pattern.extract) {
      return pattern.extract(match);
    }
    
    return { expression: match[0], expectedValue: match[0] };
  }

  /**
   * Parse a value string to number
   */
  private parseValue(str: string): number {
    if (!str) return NaN;
    
    // Remove common formatting
    const cleaned = str
      .replace(/[$%,]/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    return parseFloat(cleaned);
  }

  /**
   * Get line number for an index
   */
  private getLineNumber(text: string, index: number, lines: string[]): number {
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline
      if (charCount > index) {
        return i + 1;
      }
    }
    return lines.length;
  }

  /**
   * Extract context window around match
   */
  private extractContext(text: string, index: number, length: number): string {
    const start = Math.max(0, index - this.config.contextWindow);
    const end = Math.min(text.length, index + length + this.config.contextWindow);
    
    let context = text.slice(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract unit from match text
   */
  private extractUnit(text: string): string | undefined {
    const unitPatterns = [
      { pattern: /\$/, unit: 'USD' },
      { pattern: /%/, unit: 'percent' },
      { pattern: /hours?/i, unit: 'hours' },
      { pattern: /days?/i, unit: 'days' },
      { pattern: /years?/i, unit: 'years' },
      { pattern: /km|kilometers?/i, unit: 'km' },
      { pattern: /mi|miles?/i, unit: 'miles' },
    ];
    
    for (const { pattern, unit } of unitPatterns) {
      if (pattern.test(text)) {
        return unit;
      }
    }
    
    return undefined;
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(match: RegExpExecArray, pattern: ClaimPattern): number {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for specific patterns
    if (pattern.priority >= 90) confidence += 0.2;
    else if (pattern.priority >= 70) confidence += 0.1;
    
    // Higher confidence for explicit equals sign
    if (match[0].includes('=')) confidence += 0.1;
    
    // Higher confidence for numeric results
    if (/=\s*[\d,.]+/.test(match[0])) confidence += 0.05;
    
    // Lower confidence for very short matches
    if (match[0].length < 10) confidence -= 0.1;
    
    return Math.min(1.0, Math.max(0, confidence));
  }

  /**
   * Check if claim is duplicate of existing
   */
  private isDuplicate(claims: DetectedClaim[], newClaim: DetectedClaim): boolean {
    return claims.some(existing => 
      // Same position
      existing.startIndex === newClaim.startIndex ||
      // Same expression (normalized)
      this.normalizeExpression(existing.expression) === 
        this.normalizeExpression(newClaim.expression)
    );
  }

  /**
   * Normalize expression for comparison
   */
  private normalizeExpression(expr: string): string {
    return expr
      .replace(/\s+/g, '')
      .replace(/,/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .toLowerCase();
  }

  /**
   * Normalize text for detection
   */
  private normalizeText(text: string): string {
    if (this.config.multiLineEnabled) {
      // Preserve structure but normalize whitespace
      return text.replace(/[ \t]+/g, ' ');
    }
    return text.replace(/\s+/g, ' ');
  }

  /**
   * Generate unique claim ID
   */
  private generateClaimId(): string {
    return `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Compute detection statistics
   */
  private computeStats(
    claims: DetectedClaim[],
    startTime: number
  ): DetectionResult['stats'] {
    const byCategory: Record<string, number> = {};
    
    for (const claim of claims) {
      byCategory[claim.category] = (byCategory[claim.category] || 0) + 1;
    }
    
    const avgConfidence = claims.length > 0
      ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length
      : 0;
    
    return {
      totalDetected: claims.length,
      byCategory,
      avgConfidence,
      detectionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get current variable store
   */
  getVariables(): Map<string, number> {
    return new Map(this.variableStore);
  }

  /**
   * Add or update a variable
   */
  setVariable(name: string, value: number): void {
    this.variableStore.set(name.toUpperCase(), value);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a detector optimized for EVM calculations
 */
export function createEVMDetector(): ClaimDetector {
  return new ClaimDetector({
    patterns: getPatternsByCategory('evm'),
    priorityCategories: ['evm'],
    minConfidence: 0.6,
  });
}

/**
 * Create a detector optimized for defense contractor calculations
 */
export function createDefenseDetector(): ClaimDetector {
  return new ClaimDetector({
    patterns: [
      ...getPatternsByCategory('evm'),
      ...getPatternsByCategory('defense'),
    ],
    priorityCategories: ['evm', 'defense'],
    minConfidence: 0.6,
  });
}

/**
 * Create a detector for financial calculations
 */
export function createFinancialDetector(): ClaimDetector {
  return new ClaimDetector({
    patterns: [
      ...getPatternsByCategory('financial'),
      ...getPatternsByCategory('statistical'),
    ],
    priorityCategories: ['financial'],
    minConfidence: 0.5,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick detection without creating a detector instance
 */
export async function detectComputationalClaims(
  text: string,
  options?: ClaimDetectorConfig
): Promise<DetectionResult> {
  const detector = new ClaimDetector(options);
  return detector.detect(text);
}

/**
 * Check if text likely contains computational claims
 */
export function hasComputationalClaims(text: string): boolean {
  // Quick check patterns
  const quickPatterns = [
    /\d+\s*[+\-*/÷×]\s*\d+\s*=\s*\d+/,  // Basic arithmetic
    /\b[A-Z]{2,}\s*=\s*\d+/,              // Variable assignment
    /\d+\s*\/\s*\d+\s*=\s*\d+/,           // Division
    /\(\s*\d+.*\)\s*=\s*\d+/,             // Parenthetical
  ];
  
  return quickPatterns.some(p => p.test(text));
}

// ============================================================================
// Exports
// ============================================================================

export default ClaimDetector;
