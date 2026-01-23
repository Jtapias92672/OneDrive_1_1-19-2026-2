/**
 * MCP Gateway - Privacy Filter
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.2.2 - Implement privacy filter
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Filter sensitive information from outputs.
 *   Aligned with:
 *   - 09_DATA_PROTECTION § DP-01 (PII detection)
 *   - 09_DATA_PROTECTION § DP-09 (≥99% PII recall)
 *   - 09_DATA_PROTECTION § DP-10 (100% secret recall)
 *   - 09_DATA_PROTECTION § DP-07 (redaction <50ms)
 */

import { PrivacyRule, FilterResult, PrivacyDetection } from './types.js';

// ============================================
// STANDARD PII PATTERNS (FROM 09_DATA_PROTECTION)
// ============================================

const PII_PATTERNS: PrivacyRule[] = [
  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
    category: 'email',
    type: 'pii',
    riskScore: 0.4,
  },

  // US Phone numbers (various formats)
  {
    pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
    category: 'phone_us',
    type: 'pii',
    riskScore: 0.5,
  },

  // International phone numbers
  {
    pattern: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
    replacement: '[REDACTED_PHONE_INTL]',
    category: 'phone_international',
    type: 'pii',
    riskScore: 0.5,
  },

  // Social Security Numbers
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    category: 'ssn',
    type: 'pii',
    riskScore: 0.9,
  },

  // Credit card numbers (various formats)
  {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CC]',
    category: 'credit_card',
    type: 'pii',
    riskScore: 0.9,
  },

  // IP addresses (IPv4)
  {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[REDACTED_IP]',
    category: 'ip_address',
    type: 'pii',
    riskScore: 0.3,
  },

  // MAC addresses
  {
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    replacement: '[REDACTED_MAC]',
    category: 'mac_address',
    type: 'pii',
    riskScore: 0.3,
  },

  // Passport numbers (US format)
  {
    pattern: /\b[A-Z]\d{8}\b/g,
    replacement: '[REDACTED_PASSPORT]',
    category: 'passport',
    type: 'pii',
    riskScore: 0.8,
  },

  // Driver's license (generic pattern)
  {
    pattern: /\b[A-Z]{1,2}\d{6,8}\b/g,
    replacement: '[REDACTED_DL]',
    category: 'drivers_license',
    type: 'pii',
    riskScore: 0.7,
  },

  // Bank account numbers (generic)
  {
    pattern: /\b\d{8,17}\b/g,
    replacement: '[REDACTED_ACCOUNT]',
    category: 'bank_account',
    type: 'pii',
    riskScore: 0.6,
  },

  // Date of birth patterns
  {
    pattern: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    replacement: '[REDACTED_DOB]',
    category: 'date_of_birth',
    type: 'pii',
    riskScore: 0.5,
  },

  // Address patterns (street number + street name)
  {
    pattern: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl)\b/gi,
    replacement: '[REDACTED_ADDRESS]',
    category: 'street_address',
    type: 'pii',
    riskScore: 0.5,
  },

  // ZIP codes (US)
  {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[REDACTED_ZIP]',
    category: 'zip_code',
    type: 'pii',
    riskScore: 0.2,
  },
];

// ============================================
// SECRET PATTERNS (FROM 09_DATA_PROTECTION)
// 100% recall required - MUST BLOCK
// ============================================

const SECRET_PATTERNS: PrivacyRule[] = [
  // AWS Access Key ID
  {
    pattern: /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: '[BLOCKED_AWS_KEY]',
    category: 'aws_access_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // AWS Secret Access Key
  {
    pattern: /\b[A-Za-z0-9/+=]{40}\b/g,
    replacement: '[BLOCKED_AWS_SECRET]',
    category: 'aws_secret_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Generic API keys
  {
    pattern: /\b(?:api[_-]?key|apikey|api_secret)[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"']?\b/gi,
    replacement: '[BLOCKED_API_KEY]',
    category: 'generic_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // OpenAI API keys
  {
    pattern: /\bsk-[a-zA-Z0-9]{20,}\b/g,
    replacement: '[BLOCKED_OPENAI_KEY]',
    category: 'openai_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Anthropic API keys
  {
    pattern: /\bsk-ant-[a-zA-Z0-9]{20,}\b/g,
    replacement: '[BLOCKED_ANTHROPIC_KEY]',
    category: 'anthropic_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // GitHub tokens
  {
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
    replacement: '[BLOCKED_GITHUB_TOKEN]',
    category: 'github_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // JWT tokens
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[BLOCKED_JWT]',
    category: 'jwt_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Private keys (PEM format)
  {
    pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
    replacement: '[BLOCKED_PRIVATE_KEY]',
    category: 'private_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Google API keys
  {
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    replacement: '[BLOCKED_GOOGLE_KEY]',
    category: 'google_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Stripe API keys
  {
    pattern: /\b(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,}\b/g,
    replacement: '[BLOCKED_STRIPE_KEY]',
    category: 'stripe_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Database connection strings
  {
    pattern: /\b(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/gi,
    replacement: '[BLOCKED_DB_CONNECTION]',
    category: 'database_connection',
    type: 'secret',
    riskScore: 1.0,
  },

  // Password patterns in config
  {
    pattern: /\b(?:password|passwd|pwd|secret)[=:]\s*['"]?([^\s'"]{8,})['"']?\b/gi,
    replacement: '[BLOCKED_PASSWORD]',
    category: 'password',
    type: 'secret',
    riskScore: 1.0,
  },

  // Bearer tokens
  {
    pattern: /\bBearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[BLOCKED_BEARER_TOKEN]',
    category: 'bearer_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Basic auth credentials
  {
    pattern: /\bBasic\s+[A-Za-z0-9+/=]{20,}\b/g,
    replacement: '[BLOCKED_BASIC_AUTH]',
    category: 'basic_auth',
    type: 'secret',
    riskScore: 1.0,
  },

  // SSH private key content
  {
    pattern: /\b(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\s+[A-Za-z0-9+/=]+/g,
    replacement: '[BLOCKED_SSH_KEY]',
    category: 'ssh_key',
    type: 'secret',
    riskScore: 1.0,
  },
];

// ============================================
// PRIVACY FILTER CLASS
// ============================================

export class PrivacyFilter {
  private rules: PrivacyRule[];
  private tokenCounter: Map<string, number> = new Map();

  constructor(additionalRules: PrivacyRule[] = []) {
    // Secrets first (higher priority), then PII
    this.rules = [...SECRET_PATTERNS, ...PII_PATTERNS, ...additionalRules];
  }

  /**
   * Filter text for PII and secrets
   * MUST achieve ≥99% PII recall, 100% secret recall
   * MUST complete in <50ms (09_DATA_PROTECTION § DP-07)
   */
  filter(text: string): FilterResult {
    const startTime = Date.now();
    let filtered = text;
    const detections: FilterResult['detections'] = [];
    let blocked = false;

    // Reset token counter for unique replacements
    this.tokenCounter.clear();

    for (const rule of this.rules) {
      // Create new RegExp to reset lastIndex
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      const matches = text.match(pattern);

      if (matches && matches.length > 0) {
        // Generate unique tokens for each match
        filtered = filtered.replace(pattern, () => {
          return this.generateUniqueToken(rule.replacement, rule.category);
        });

        detections.push({
          type: rule.type,
          category: rule.category,
          count: matches.length,
        });

        // FROM 09_DATA_PROTECTION: Secrets MUST block processing
        if (rule.type === 'secret') {
          blocked = true;
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Warn if processing took too long (> 50ms threshold)
    if (processingTimeMs > 50) {
      console.warn(`[PrivacyFilter] Processing exceeded 50ms threshold: ${processingTimeMs}ms`);
    }

    return {
      filtered,
      detections,
      blocked,
      processingTimeMs,
    };
  }

  /**
   * Generate unique token for each detection
   * e.g., [REDACTED_EMAIL_1], [REDACTED_EMAIL_2]
   */
  private generateUniqueToken(baseReplacement: string, category: string): string {
    const count = (this.tokenCounter.get(category) ?? 0) + 1;
    this.tokenCounter.set(category, count);
    return baseReplacement.replace(']', `_${count}]`);
  }

  /**
   * Add a custom privacy rule
   */
  addRule(rule: PrivacyRule): void {
    // Insert secrets at beginning, PII after secrets
    if (rule.type === 'secret') {
      this.rules.unshift(rule);
    } else {
      // Find first PII rule and insert before it
      const firstPiiIndex = this.rules.findIndex(r => r.type === 'pii');
      if (firstPiiIndex >= 0) {
        this.rules.splice(firstPiiIndex, 0, rule);
      } else {
        this.rules.push(rule);
      }
    }
  }

  /**
   * Check if text contains secrets (without full filter)
   * Fast check for pre-screening
   */
  containsSecrets(text: string): boolean {
    for (const rule of this.rules) {
      if (rule.type === 'secret') {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if text contains PII (without full filter)
   */
  containsPII(text: string): boolean {
    for (const rule of this.rules) {
      if (rule.type === 'pii') {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get privacy detections as PrivacyDetection objects
   */
  getDetailedDetections(text: string): PrivacyDetection[] {
    const detections: PrivacyDetection[] = [];
    let tokenIndex = 0;

    for (const rule of this.rules) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = pattern.exec(text)) !== null) {
        tokenIndex++;
        detections.push({
          type: rule.type,
          category: rule.category,
          token: rule.replacement.replace(']', `_${tokenIndex}]`),
          location: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return detections;
  }

  /**
   * Get statistics about rules
   */
  getRuleStats(): { pii: number; secret: number; total: number } {
    const pii = this.rules.filter(r => r.type === 'pii').length;
    const secret = this.rules.filter(r => r.type === 'secret').length;
    return { pii, secret, total: this.rules.length };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const privacyFilter = new PrivacyFilter();

// ============================================
// EXPORTS
// ============================================

export {
  PII_PATTERNS,
  SECRET_PATTERNS,
};

export default PrivacyFilter;
