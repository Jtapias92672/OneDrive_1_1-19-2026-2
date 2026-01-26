/**
 * MCP Security Gateway - Input Sanitizer Core
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.10 - Input Sanitizer Core
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Core input sanitization engine for MCP tool parameters.
 *   Detects and blocks injection attacks per OWASP guidelines.
 */

import {
  InjectionPattern,
  InjectionType,
  PatternMatch,
  INJECTION_PATTERNS,
  getAllPatterns,
  getPatternsByType,
  findAllMatches,
} from './patterns.js';

// ============================================
// TYPES
// ============================================

/**
 * Sanitization context
 */
export interface SanitizationContext {
  /** Tool name being sanitized for */
  toolName: string;

  /** Parameter name being sanitized */
  paramName: string;

  /** Expected type of input */
  expectedType?: 'sql' | 'command' | 'prompt' | 'path' | 'html' | 'json' | 'text';

  /** Strictness level */
  strictness?: 'strict' | 'moderate' | 'lenient';

  /** Allow list for this context */
  allowList?: string[];

  /** Block list for this context */
  blockList?: string[];
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  /** Whether input passed sanitization */
  safe: boolean;

  /** Sanitized/escaped input */
  sanitized: unknown;

  /** Threats detected */
  threats: ThreatDetection[];

  /** Whether input was blocked */
  blocked: boolean;

  /** Reason for blocking */
  blockReason?: string;
}

/**
 * Detected threat
 */
export interface ThreatDetection {
  /** Threat type */
  type: InjectionType;

  /** Pattern that matched */
  patternId: string;

  /** Description of threat */
  description: string;

  /** Severity */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Matched text (masked) */
  matchedText: string;

  /** Parameter path where found */
  path: string;
}

/**
 * Sanitizer configuration
 */
export interface SanitizerConfig {
  /** Enable strict mode (block on any threat) */
  strictMode?: boolean;

  /** Types of injections to check */
  enabledTypes?: InjectionType[];

  /** Maximum input length */
  maxInputLength?: number;

  /** Maximum nesting depth for objects */
  maxNestingDepth?: number;

  /** Custom patterns to add */
  customPatterns?: InjectionPattern[];

  /** Global allow list */
  globalAllowList?: string[];
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_INPUT_LENGTH = 1_000_000; // 1MB
const DEFAULT_MAX_NESTING_DEPTH = 20;
const DEFAULT_ENABLED_TYPES: InjectionType[] = [
  'sql',
  'command',
  'prompt',
  'path_traversal',
  'xss',
];

// ============================================
// INPUT SANITIZER CLASS
// ============================================

/**
 * Input Sanitizer
 *
 * Scans and sanitizes tool parameters for injection attacks.
 *
 * @example
 * ```typescript
 * const sanitizer = new InputSanitizer({ strictMode: true });
 *
 * const result = sanitizer.sanitize(
 *   { query: "SELECT * FROM users WHERE id='1' OR '1'='1'" },
 *   { toolName: 'database_query', paramName: 'query', expectedType: 'sql' }
 * );
 *
 * if (result.blocked) {
 *   throw new Error(result.blockReason);
 * }
 * ```
 */
export class InputSanitizer {
  private config: SanitizerConfig;
  private patterns: InjectionPattern[];

  constructor(config: SanitizerConfig = {}) {
    this.config = {
      strictMode: true,
      enabledTypes: DEFAULT_ENABLED_TYPES,
      maxInputLength: DEFAULT_MAX_INPUT_LENGTH,
      maxNestingDepth: DEFAULT_MAX_NESTING_DEPTH,
      globalAllowList: [],
      ...config,
    };

    // Build pattern list
    this.patterns = this.buildPatternList();
  }

  // ==========================================
  // MAIN SANITIZATION
  // ==========================================

  /**
   * Sanitize input value
   *
   * @param input Value to sanitize
   * @param context Sanitization context
   * @returns Sanitization result
   */
  sanitize(input: unknown, context: SanitizationContext): SanitizationResult {
    const threats: ThreatDetection[] = [];

    // Check input size
    const serialized = JSON.stringify(input);
    if (serialized.length > (this.config.maxInputLength ?? DEFAULT_MAX_INPUT_LENGTH)) {
      return {
        safe: false,
        sanitized: input,
        threats: [],
        blocked: true,
        blockReason: 'Input exceeds maximum size limit',
      };
    }

    // Deep scan the input
    try {
      this.scanValue(input, context.paramName, context, threats, 0);
    } catch (error) {
      return {
        safe: false,
        sanitized: input,
        threats: [],
        blocked: true,
        blockReason: (error as Error).message,
      };
    }

    // Check if we should block
    const shouldBlock = this.shouldBlock(threats, context);

    if (shouldBlock) {
      return {
        safe: false,
        sanitized: input,
        threats,
        blocked: true,
        blockReason: this.getBlockReason(threats),
      };
    }

    // If not blocking, optionally escape/sanitize
    const sanitized = threats.length > 0
      ? this.escapeInput(input, context)
      : input;

    return {
      safe: threats.length === 0,
      sanitized,
      threats,
      blocked: false,
    };
  }

  /**
   * Quick check if input contains threats
   */
  detectThreats(input: unknown, context: SanitizationContext): ThreatDetection[] {
    const threats: ThreatDetection[] = [];
    this.scanValue(input, context.paramName, context, threats, 0);
    return threats;
  }

  /**
   * Sanitize a record of parameters
   */
  sanitizeParams(
    params: Record<string, unknown>,
    toolName: string
  ): SanitizationResult {
    const allThreats: ThreatDetection[] = [];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      const result = this.sanitize(value, {
        toolName,
        paramName: key,
      });

      if (result.blocked) {
        return result;
      }

      sanitized[key] = result.sanitized;
      allThreats.push(...result.threats);
    }

    return {
      safe: allThreats.length === 0,
      sanitized,
      threats: allThreats,
      blocked: false,
    };
  }

  // ==========================================
  // SCANNING
  // ==========================================

  /**
   * Recursively scan a value for threats
   */
  private scanValue(
    value: unknown,
    path: string,
    context: SanitizationContext,
    threats: ThreatDetection[],
    depth: number
  ): void {
    // Check nesting depth
    if (depth > (this.config.maxNestingDepth ?? DEFAULT_MAX_NESTING_DEPTH)) {
      throw new Error('Input exceeds maximum nesting depth');
    }

    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      this.scanString(value, path, context, threats);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.scanValue(item, `${path}[${index}]`, context, threats, depth + 1);
      });
    } else if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        this.scanValue(val, `${path}.${key}`, context, threats, depth + 1);
      }
    }
  }

  /**
   * Scan a string for injection patterns
   */
  private scanString(
    value: string,
    path: string,
    context: SanitizationContext,
    threats: ThreatDetection[]
  ): void {
    // Check allow list
    if (this.isAllowed(value, context)) {
      return;
    }

    // Check block list
    if (context.blockList?.some(blocked => value.toLowerCase().includes(blocked.toLowerCase()))) {
      threats.push({
        type: 'prompt', // Generic blocked pattern
        patternId: 'block_list',
        description: 'Input matches block list',
        severity: 'high',
        matchedText: this.maskText(value),
        path,
      });
      return;
    }

    // Get patterns for expected type or all enabled types
    const patternsToCheck = context.expectedType
      ? this.getPatternsForType(context.expectedType)
      : this.patterns;

    // Find all matches
    const matches = findAllMatches(value, patternsToCheck);

    for (const match of matches) {
      threats.push({
        type: match.pattern.type,
        patternId: match.pattern.id,
        description: match.pattern.description,
        severity: match.pattern.severity,
        matchedText: this.maskText(match.matchedText),
        path,
      });
    }
  }

  /**
   * Get patterns for expected input type
   */
  private getPatternsForType(expectedType: string): InjectionPattern[] {
    switch (expectedType) {
      case 'sql':
        return getPatternsByType('sql');
      case 'command':
        return getPatternsByType('command');
      case 'prompt':
        return getPatternsByType('prompt');
      case 'path':
        return getPatternsByType('path_traversal');
      case 'html':
        return getPatternsByType('xss');
      default:
        return this.patterns;
    }
  }

  // ==========================================
  // ESCAPING
  // ==========================================

  /**
   * Escape input based on context
   */
  escapeInput(input: unknown, context: SanitizationContext): unknown {
    if (typeof input === 'string') {
      return this.escapeString(input, context);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.escapeInput(item, context));
    }

    if (typeof input === 'object' && input !== null) {
      const escaped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        escaped[this.escapeString(key, context)] = this.escapeInput(value, context);
      }
      return escaped;
    }

    return input;
  }

  /**
   * Escape a string based on context
   */
  private escapeString(value: string, context: SanitizationContext): string {
    let escaped = value;

    switch (context.expectedType) {
      case 'sql':
        escaped = this.escapeSql(value);
        break;
      case 'html':
        escaped = this.escapeHtml(value);
        break;
      case 'command':
        escaped = this.escapeShell(value);
        break;
      default:
        // Generic escaping
        escaped = this.escapeGeneric(value);
    }

    return escaped;
  }

  /**
   * Escape SQL special characters
   */
  private escapeSql(value: string): string {
    return value
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\x00/g, '\\0');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Escape shell special characters
   */
  private escapeShell(value: string): string {
    return value.replace(/[;&|`$(){}[\]<>]/g, '\\$&');
  }

  /**
   * Generic escaping
   */
  private escapeGeneric(value: string): string {
    return value
      .replace(/\x00/g, '') // Remove null bytes
      .normalize('NFC'); // Normalize unicode
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Check if value is in allow list
   */
  private isAllowed(value: string, context: SanitizationContext): boolean {
    const allAllowList = [
      ...(this.config.globalAllowList ?? []),
      ...(context.allowList ?? []),
    ];

    return allAllowList.some(
      allowed => value.toLowerCase() === allowed.toLowerCase()
    );
  }

  /**
   * Determine if we should block based on threats
   */
  private shouldBlock(
    threats: ThreatDetection[],
    context: SanitizationContext
  ): boolean {
    if (threats.length === 0) return false;

    const strictness = context.strictness ?? (this.config.strictMode ? 'strict' : 'moderate');

    switch (strictness) {
      case 'strict':
        // Block on any threat
        return threats.length > 0;

      case 'moderate':
        // Block on high/critical threats
        return threats.some(t => t.severity === 'critical' || t.severity === 'high');

      case 'lenient':
        // Only block on critical threats
        return threats.some(t => t.severity === 'critical');

      default:
        return threats.length > 0;
    }
  }

  /**
   * Get blocking reason
   */
  private getBlockReason(threats: ThreatDetection[]): string {
    const critical = threats.filter(t => t.severity === 'critical');
    const firstCritical = critical[0];
    if (firstCritical) {
      return `Critical injection detected: ${firstCritical.description}`;
    }

    const high = threats.filter(t => t.severity === 'high');
    const firstHigh = high[0];
    if (firstHigh) {
      return `High-severity injection detected: ${firstHigh.description}`;
    }

    return `Injection patterns detected: ${threats.length} threat(s)`;
  }

  /**
   * Mask matched text for logging
   */
  private maskText(text: string): string {
    if (text.length <= 10) {
      return text.slice(0, 2) + '***';
    }
    return text.slice(0, 5) + '...' + text.slice(-3);
  }

  /**
   * Build pattern list from config
   */
  private buildPatternList(): InjectionPattern[] {
    const enabledTypes = this.config.enabledTypes ?? DEFAULT_ENABLED_TYPES;
    let patterns: InjectionPattern[] = [];

    for (const type of enabledTypes) {
      patterns = patterns.concat(INJECTION_PATTERNS[type] ?? []);
    }

    // Add custom patterns
    if (this.config.customPatterns) {
      patterns = patterns.concat(this.config.customPatterns);
    }

    return patterns;
  }
}

// ============================================
// ERRORS
// ============================================

export class InjectionDetectedError extends Error {
  readonly threats: ThreatDetection[];

  constructor(message: string, threats: ThreatDetection[]) {
    super(message);
    this.name = 'InjectionDetectedError';
    this.threats = threats;
  }
}

// ============================================
// EXPORTS
// ============================================

export default InputSanitizer;
