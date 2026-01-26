/**
 * MCP Security Gateway - Output Sanitization
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.12 - Output Sanitization
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Sanitizes tool outputs before returning to clients.
 *   Removes sensitive data, PII, and potential injection payloads.
 */

// ============================================
// TYPES
// ============================================

/**
 * Output sanitization options
 */
export interface OutputSanitizationOptions {
  /** Remove PII (emails, phones, SSNs) */
  removePII?: boolean;

  /** Remove secrets (API keys, tokens) */
  removeSecrets?: boolean;

  /** Remove internal paths */
  removeInternalPaths?: boolean;

  /** Remove stack traces */
  removeStackTraces?: boolean;

  /** Maximum output size in bytes */
  maxOutputSize?: number;

  /** Truncate long strings */
  truncateLongStrings?: boolean;

  /** Maximum string length */
  maxStringLength?: number;

  /** Custom redaction patterns */
  customPatterns?: RedactionPattern[];

  /** Fields to always redact */
  redactFields?: string[];
}

/**
 * Redaction pattern
 */
export interface RedactionPattern {
  /** Pattern name */
  name: string;

  /** Regex pattern */
  pattern: RegExp;

  /** Replacement text */
  replacement: string;
}

/**
 * Sanitization result
 */
export interface OutputSanitizationResult {
  /** Sanitized output */
  output: unknown;

  /** Whether output was modified */
  modified: boolean;

  /** Redactions made */
  redactions: RedactionRecord[];

  /** Whether output was truncated */
  truncated: boolean;

  /** Original size */
  originalSize: number;

  /** Final size */
  finalSize: number;
}

/**
 * Redaction record
 */
export interface RedactionRecord {
  /** Path to redacted value */
  path: string;

  /** Type of redaction */
  type: string;

  /** Original value (masked) */
  originalPreview: string;
}

// ============================================
// PATTERNS
// ============================================

const PII_PATTERNS: RedactionPattern[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'phone',
    pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CARD_REDACTED]',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
];

const SECRET_PATTERNS: RedactionPattern[] = [
  {
    name: 'api_key',
    pattern: /(?:api[_-]?key|apikey)['":\s]*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    name: 'bearer_token',
    pattern: /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi,
    replacement: 'Bearer [TOKEN_REDACTED]',
  },
  {
    name: 'aws_key',
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g,
    replacement: '[AWS_KEY_REDACTED]',
  },
  {
    name: 'aws_secret',
    pattern: /(?:aws[_-]?secret|secret[_-]?key)['":\s]*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    replacement: '[AWS_SECRET_REDACTED]',
  },
  {
    name: 'password',
    pattern: /(?:password|passwd|pwd)['":\s]*['"]?([^'"\s]{8,})['"]?/gi,
    replacement: '[PASSWORD_REDACTED]',
  },
  {
    name: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    replacement: '[PRIVATE_KEY_REDACTED]',
  },
  {
    name: 'connection_string',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/gi,
    replacement: '[CONNECTION_STRING_REDACTED]',
  },
];

const PATH_PATTERNS: RedactionPattern[] = [
  {
    name: 'home_path',
    pattern: /\/(?:home|Users)\/[a-zA-Z0-9_-]+/g,
    replacement: '/[HOME_REDACTED]',
  },
  {
    name: 'etc_path',
    pattern: /\/etc\/(?:passwd|shadow|sudoers|ssh)/g,
    replacement: '/etc/[SENSITIVE_REDACTED]',
  },
  {
    name: 'windows_users',
    pattern: /C:\\Users\\[a-zA-Z0-9_-]+/gi,
    replacement: 'C:\\Users\\[REDACTED]',
  },
];

const STACK_TRACE_PATTERNS: RedactionPattern[] = [
  {
    name: 'node_stack',
    pattern: /at\s+.+\s+\(.+:\d+:\d+\)/g,
    replacement: 'at [STACK_REDACTED]',
  },
  {
    name: 'python_stack',
    pattern: /File\s+"[^"]+",\s+line\s+\d+/g,
    replacement: 'File "[STACK_REDACTED]"',
  },
];

const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'credential',
  'credentials',
  'private',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
  'cookie',
  'ssn',
  'creditCard',
  'credit_card',
];

// ============================================
// OUTPUT SANITIZER
// ============================================

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<OutputSanitizationOptions> = {
  removePII: true,
  removeSecrets: true,
  removeInternalPaths: true,
  removeStackTraces: false,
  maxOutputSize: 10 * 1024 * 1024, // 10 MB
  truncateLongStrings: true,
  maxStringLength: 100000, // 100KB per string
  customPatterns: [],
  redactFields: [],
};

/**
 * Output Sanitizer
 *
 * Sanitizes tool outputs to remove sensitive information.
 */
export class OutputSanitizer {
  private options: Required<OutputSanitizationOptions>;

  constructor(options: OutputSanitizationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Sanitize output
   */
  sanitize(output: unknown): OutputSanitizationResult {
    const redactions: RedactionRecord[] = [];
    const originalSize = this.estimateSize(output);

    // Deep clone to avoid mutating original
    let sanitized = JSON.parse(JSON.stringify(output));

    // Apply sanitization
    sanitized = this.sanitizeValue(sanitized, '', redactions);

    // Check size limits
    let truncated = false;
    const finalSize = this.estimateSize(sanitized);

    if (finalSize > this.options.maxOutputSize) {
      sanitized = this.truncateOutput(sanitized, this.options.maxOutputSize);
      truncated = true;
    }

    return {
      output: sanitized,
      modified: redactions.length > 0 || truncated,
      redactions,
      truncated,
      originalSize,
      finalSize: this.estimateSize(sanitized),
    };
  }

  /**
   * Sanitize a value recursively
   */
  private sanitizeValue(value: unknown, path: string, redactions: RedactionRecord[]): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value, path, redactions);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.sanitizeValue(item, `${path}[${index}]`, redactions)
      );
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const fieldPath = path ? `${path}.${key}` : key;

        // Check if field should be completely redacted
        if (this.shouldRedactField(key)) {
          result[key] = '[REDACTED]';
          redactions.push({
            path: fieldPath,
            type: 'sensitive_field',
            originalPreview: this.maskPreview(val),
          });
        } else {
          result[key] = this.sanitizeValue(val, fieldPath, redactions);
        }
      }

      return result;
    }

    return value;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string, path: string, redactions: RedactionRecord[]): string {
    let result = value;

    // Apply pattern-based redactions
    const patterns = this.getActivePatterns();

    for (const pattern of patterns) {
      const matches = result.match(pattern.pattern);
      if (matches) {
        result = result.replace(pattern.pattern, pattern.replacement);
        for (const match of matches) {
          redactions.push({
            path,
            type: pattern.name,
            originalPreview: this.maskPreview(match),
          });
        }
      }
      // Reset regex state
      pattern.pattern.lastIndex = 0;
    }

    // Truncate long strings
    if (this.options.truncateLongStrings && result.length > this.options.maxStringLength) {
      result = result.slice(0, this.options.maxStringLength) + '... [TRUNCATED]';
      redactions.push({
        path,
        type: 'truncation',
        originalPreview: `${value.length} chars`,
      });
    }

    return result;
  }

  /**
   * Get active patterns based on options
   */
  private getActivePatterns(): RedactionPattern[] {
    const patterns: RedactionPattern[] = [];

    if (this.options.removePII) {
      patterns.push(...PII_PATTERNS);
    }

    if (this.options.removeSecrets) {
      patterns.push(...SECRET_PATTERNS);
    }

    if (this.options.removeInternalPaths) {
      patterns.push(...PATH_PATTERNS);
    }

    if (this.options.removeStackTraces) {
      patterns.push(...STACK_TRACE_PATTERNS);
    }

    patterns.push(...this.options.customPatterns);

    return patterns;
  }

  /**
   * Check if a field should be redacted by name
   */
  private shouldRedactField(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase();

    // Check configured redact fields
    if (this.options.redactFields.some(f => lowerName.includes(f.toLowerCase()))) {
      return true;
    }

    // Check default sensitive fields
    return SENSITIVE_FIELDS.some(f => lowerName.includes(f.toLowerCase()));
  }

  /**
   * Create masked preview of value
   */
  private maskPreview(value: unknown): string {
    const str = String(value);
    if (str.length <= 8) {
      return '***';
    }
    return str.slice(0, 3) + '***' + str.slice(-3);
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }

  /**
   * Truncate output to fit size limit
   */
  private truncateOutput(value: unknown, maxSize: number): unknown {
    const str = JSON.stringify(value);
    if (str.length <= maxSize) {
      return value;
    }

    // Try to return a valid JSON subset
    const truncated = str.slice(0, maxSize - 50);
    try {
      // Try to find a valid JSON boundary
      const lastBrace = Math.max(truncated.lastIndexOf('}'), truncated.lastIndexOf(']'));
      if (lastBrace > maxSize / 2) {
        return JSON.parse(truncated.slice(0, lastBrace + 1));
      }
    } catch {
      // Ignore parse errors
    }

    // Return truncation notice
    return {
      _truncated: true,
      _message: 'Output exceeded size limit and was truncated',
      _originalSize: str.length,
      _maxSize: maxSize,
    };
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<OutputSanitizationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Add custom redaction pattern
   */
  addPattern(pattern: RedactionPattern): void {
    this.options.customPatterns.push(pattern);
  }

  /**
   * Add field to always redact
   */
  addRedactField(fieldName: string): void {
    this.options.redactFields.push(fieldName);
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

let defaultSanitizer: OutputSanitizer | null = null;

/**
 * Get default output sanitizer
 */
export function getDefaultOutputSanitizer(): OutputSanitizer {
  if (!defaultSanitizer) {
    defaultSanitizer = new OutputSanitizer();
  }
  return defaultSanitizer;
}

/**
 * Sanitize output with default options
 */
export function sanitizeOutput(output: unknown): OutputSanitizationResult {
  return getDefaultOutputSanitizer().sanitize(output);
}

/**
 * Quick check if output contains sensitive data
 */
export function containsSensitiveData(output: unknown): boolean {
  const result = getDefaultOutputSanitizer().sanitize(output);
  return result.modified;
}

// ============================================
// EXPORTS
// ============================================

export default OutputSanitizer;
