/**
 * MCP Security Gateway - Cross-Tenant Leak Detector
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.7 - Cross-Tenant Leak Detection
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Scans responses for cross-tenant data leakage.
 *   Detects and sanitizes foreign tenant data in responses.
 */

// ============================================
// TYPES
// ============================================

/**
 * Leak detection result
 */
export interface LeakScanResult {
  /** Whether the response is safe */
  safe: boolean;

  /** Original response (if safe) or sanitized response */
  response: unknown;

  /** Detected leaks */
  leaks: LeakDetection[];

  /** Scan timestamp */
  scannedAt: string;
}

/**
 * Individual leak detection
 */
export interface LeakDetection {
  /** Type of leak */
  type: 'tenant_id' | 'pii' | 'resource_id' | 'email' | 'phone';

  /** Leaked value (masked) */
  value: string;

  /** Where in response it was found */
  path: string;

  /** Tenant ID of leaked data (if known) */
  leakedTenantId?: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security alert for leak detection
 */
export interface LeakAlert {
  /** Alert type */
  type: 'CROSS_TENANT_LEAK';

  /** Allowed tenant that should have seen data */
  allowedTenant: string;

  /** Tenants whose data was leaked */
  leakedTenants: string[];

  /** Tool that produced the leak */
  tool: string;

  /** Alert severity */
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';

  /** Request ID */
  requestId?: string;

  /** User ID */
  userId?: string;
}

/**
 * Leak detector configuration
 */
export interface LeakDetectorConfig {
  /** Enable PII detection */
  detectPII?: boolean;

  /** Enable email detection */
  detectEmails?: boolean;

  /** Enable phone number detection */
  detectPhones?: boolean;

  /** Known tenant ID patterns */
  tenantIdPatterns?: RegExp[];

  /** Resource ID patterns to track */
  resourceIdPatterns?: RegExp[];

  /** Auto-sanitize leaked data */
  autoSanitize?: boolean;

  /** Alert handler */
  alertHandler?: (alert: LeakAlert) => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

/** Email pattern */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Phone pattern (international format) */
const PHONE_PATTERN = /\+?[1-9]\d{1,14}|\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4}/g;

/** UUID pattern */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Tenant ID prefixes to detect */
const TENANT_ID_PREFIXES = ['tenant_', 'org_', 'customer_', 'account_'];

// ============================================
// CROSS-TENANT LEAK DETECTOR CLASS
// ============================================

/**
 * Cross-Tenant Leak Detector
 *
 * Scans tool responses for data that belongs to other tenants.
 * Implements response sanitization to prevent data leakage.
 *
 * @example
 * ```typescript
 * const detector = new CrossTenantLeakDetector({
 *   detectPII: true,
 *   autoSanitize: true,
 * });
 *
 * const result = await detector.scanResponse(
 *   { users: [{ email: 'user@other-tenant.com', tenantId: 'other-tenant' }] },
 *   'allowed-tenant',
 *   { tool: 'user_search' }
 * );
 *
 * if (!result.safe) {
 *   console.log('Leaks detected:', result.leaks);
 *   // Use result.response (sanitized)
 * }
 * ```
 */
export class CrossTenantLeakDetector {
  private config: LeakDetectorConfig;
  private tenantResourceMap: Map<string, string> = new Map();
  private knownTenants: Set<string> = new Set();

  constructor(config: LeakDetectorConfig = {}) {
    this.config = {
      detectPII: true,
      detectEmails: true,
      detectPhones: true,
      autoSanitize: true,
      tenantIdPatterns: [UUID_PATTERN],
      resourceIdPatterns: [UUID_PATTERN],
      ...config,
    };
  }

  // ==========================================
  // RESPONSE SCANNING
  // ==========================================

  /**
   * Scan response for cross-tenant data leaks
   *
   * @param response Tool response to scan
   * @param allowedTenantId Tenant that should see this data
   * @param context Additional context for the scan
   * @returns Scan result with leaks and sanitized response
   */
  async scanResponse(
    response: unknown,
    allowedTenantId: string,
    context?: { tool?: string; requestId?: string; userId?: string }
  ): Promise<LeakScanResult> {
    const leaks: LeakDetection[] = [];

    // Deep scan the response
    this.scanValue(response, '', allowedTenantId, leaks);

    if (leaks.length > 0) {
      // Alert on critical leaks
      await this.alertOnLeaks(leaks, allowedTenantId, context);

      // Sanitize if enabled
      const sanitizedResponse = this.config.autoSanitize
        ? this.sanitizeResponse(response, leaks)
        : response;

      return {
        safe: false,
        response: sanitizedResponse,
        leaks,
        scannedAt: new Date().toISOString(),
      };
    }

    return {
      safe: true,
      response,
      leaks: [],
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Recursively scan a value for leaks
   */
  private scanValue(
    value: unknown,
    path: string,
    allowedTenantId: string,
    leaks: LeakDetection[]
  ): void {
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      this.scanString(value, path, allowedTenantId, leaks);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.scanValue(item, `${path}[${index}]`, allowedTenantId, leaks);
      });
    } else if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const newPath = path ? `${path}.${key}` : key;
        this.scanValue(val, newPath, allowedTenantId, leaks);
      }
    }
  }

  /**
   * Scan a string value for leaks
   */
  private scanString(
    value: string,
    path: string,
    allowedTenantId: string,
    leaks: LeakDetection[]
  ): void {
    // Check for tenant IDs
    const tenantIds = this.extractTenantIds(value);
    for (const tenantId of tenantIds) {
      if (tenantId !== allowedTenantId && this.knownTenants.has(tenantId)) {
        leaks.push({
          type: 'tenant_id',
          value: this.maskValue(tenantId),
          path,
          leakedTenantId: tenantId,
          severity: 'critical',
        });
      }
    }

    // Check for resource IDs belonging to other tenants
    const resourceIds = this.extractResourceIds(value);
    for (const resourceId of resourceIds) {
      const ownerTenant = this.tenantResourceMap.get(resourceId);
      if (ownerTenant && ownerTenant !== allowedTenantId) {
        leaks.push({
          type: 'resource_id',
          value: this.maskValue(resourceId),
          path,
          leakedTenantId: ownerTenant,
          severity: 'high',
        });
      }
    }

    // Check for PII
    if (this.config.detectPII) {
      this.scanForPII(value, path, leaks);
    }
  }

  /**
   * Scan for PII (emails, phones)
   */
  private scanForPII(value: string, path: string, leaks: LeakDetection[]): void {
    // Check for emails
    if (this.config.detectEmails) {
      const emails = value.match(EMAIL_PATTERN);
      if (emails) {
        for (const email of emails) {
          // Check if email domain belongs to a different tenant
          const domain = email.split('@')[1] ?? '';
          if (domain && this.isForeignDomain(domain)) {
            leaks.push({
              type: 'email',
              value: this.maskEmail(email),
              path,
              severity: 'medium',
            });
          }
        }
      }
    }

    // Check for phone numbers
    if (this.config.detectPhones) {
      const phones = value.match(PHONE_PATTERN);
      if (phones) {
        for (const phone of phones) {
          leaks.push({
            type: 'phone',
            value: this.maskPhone(phone),
            path,
            severity: 'medium',
          });
        }
      }
    }
  }

  // ==========================================
  // EXTRACTION HELPERS
  // ==========================================

  /**
   * Extract tenant IDs from string
   */
  extractTenantIds(text: string): string[] {
    const tenants = new Set<string>();

    // Check for prefixed tenant IDs
    for (const prefix of TENANT_ID_PREFIXES) {
      const pattern = new RegExp(`${prefix}[a-zA-Z0-9_-]+`, 'g');
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((m) => tenants.add(m));
      }
    }

    // Check configured patterns
    for (const pattern of this.config.tenantIdPatterns ?? []) {
      const matches = text.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        matches.forEach((m) => tenants.add(m));
      }
    }

    return Array.from(tenants);
  }

  /**
   * Extract resource IDs from string
   */
  private extractResourceIds(text: string): string[] {
    const ids = new Set<string>();

    for (const pattern of this.config.resourceIdPatterns ?? []) {
      const matches = text.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        matches.forEach((id) => ids.add(id));
      }
    }

    return Array.from(ids);
  }

  /**
   * Check if domain is foreign (not in allowed list)
   */
  private isForeignDomain(domain: string): boolean {
    // This would check against a list of known internal domains
    // For now, flag common public domains as needing review
    const internalDomains = ['internal.com', 'company.local'];
    return !internalDomains.some((d) => domain.endsWith(d));
  }

  // ==========================================
  // MASKING HELPERS
  // ==========================================

  /**
   * Mask a general value
   */
  private maskValue(value: string): string {
    if (value.length <= 8) {
      return value.slice(0, 2) + '***' + value.slice(-2);
    }
    return value.slice(0, 4) + '***' + value.slice(-4);
  }

  /**
   * Mask an email address
   */
  private maskEmail(email: string): string {
    const parts = email.split('@');
    const local = parts[0] ?? '';
    const domain = parts[1] ?? '';
    const maskedLocal =
      local.length > 2 ? local.slice(0, 2) + '***' : (local[0] ?? '') + '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask a phone number
   */
  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return '***' + digits.slice(-4);
    }
    return '***';
  }

  // ==========================================
  // SANITIZATION
  // ==========================================

  /**
   * Sanitize response by removing leaked data
   */
  sanitizeResponse(response: unknown, leaks: LeakDetection[]): unknown {
    if (!leaks.length) return response;

    // Create a deep copy
    const sanitized = JSON.parse(JSON.stringify(response));

    // Remove or mask each leaked value
    for (const leak of leaks) {
      this.sanitizePath(sanitized, leak.path, leak.type);
    }

    return sanitized;
  }

  /**
   * Sanitize a specific path in the response
   */
  private sanitizePath(
    obj: unknown,
    path: string,
    type: LeakDetection['type']
  ): void {
    const parts = this.parsePath(path);
    if (parts.length === 0) return;

    let current: unknown = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === null || current === undefined) return;
      if (typeof current !== 'object') return;
      const key = parts[i];
      if (!key) return;
      current = (current as Record<string, unknown>)[key];
    }

    if (current && typeof current === 'object') {
      const lastKey = parts[parts.length - 1];
      if (!lastKey) return;
      const record = current as Record<string, unknown>;

      if (type === 'tenant_id') {
        record[lastKey] = '[REDACTED_TENANT]';
      } else if (type === 'email') {
        record[lastKey] = '[REDACTED_EMAIL]';
      } else if (type === 'phone') {
        record[lastKey] = '[REDACTED_PHONE]';
      } else {
        record[lastKey] = '[REDACTED]';
      }
    }
  }

  /**
   * Parse a path string into parts
   */
  private parsePath(path: string): string[] {
    const parts: string[] = [];
    const regex = /([^.\[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(path)) !== null) {
      const part = match[1] ?? match[2] ?? '';
      if (part) {
        parts.push(part);
      }
    }

    return parts;
  }

  // ==========================================
  // ALERTING
  // ==========================================

  /**
   * Alert security team about detected leaks
   */
  private async alertOnLeaks(
    leaks: LeakDetection[],
    allowedTenant: string,
    context?: { tool?: string; requestId?: string; userId?: string }
  ): Promise<void> {
    // Group leaks by leaked tenant
    const leakedTenants = new Set<string>();
    let maxSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';

    for (const leak of leaks) {
      if (leak.leakedTenantId) {
        leakedTenants.add(leak.leakedTenantId);
      }
      if (leak.severity === 'critical') {
        maxSeverity = 'CRITICAL';
      } else if (leak.severity === 'high' && maxSeverity !== 'CRITICAL') {
        maxSeverity = 'HIGH';
      }
    }

    if (leakedTenants.size === 0 && leaks.length > 0) {
      // PII leak without known tenant
      leakedTenants.add('unknown');
    }

    const alert: LeakAlert = {
      type: 'CROSS_TENANT_LEAK',
      allowedTenant,
      leakedTenants: Array.from(leakedTenants),
      tool: context?.tool ?? 'unknown',
      severity: maxSeverity,
      requestId: context?.requestId,
      userId: context?.userId,
    };

    // Call alert handler if configured
    if (this.config.alertHandler) {
      await this.config.alertHandler(alert);
    }

    // Always log to console for critical leaks
    if (maxSeverity === 'CRITICAL') {
      console.error('🚨 [CRITICAL LEAK]', JSON.stringify(alert, null, 2));
    }
  }

  // ==========================================
  // TENANT/RESOURCE REGISTRATION
  // ==========================================

  /**
   * Register a known tenant
   */
  registerTenant(tenantId: string): void {
    this.knownTenants.add(tenantId);
  }

  /**
   * Register resource ownership
   */
  registerResourceOwnership(resourceId: string, tenantId: string): void {
    this.tenantResourceMap.set(resourceId, tenantId);
  }

  /**
   * Bulk register resources
   */
  registerResources(
    resources: Array<{ resourceId: string; tenantId: string }>
  ): void {
    for (const { resourceId, tenantId } of resources) {
      this.tenantResourceMap.set(resourceId, tenantId);
    }
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.tenantResourceMap.clear();
    this.knownTenants.clear();
  }
}

// ============================================
// EXPORTS
// ============================================

export default CrossTenantLeakDetector;
