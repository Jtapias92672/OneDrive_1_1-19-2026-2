/**
 * MCP Security Gateway - Audit Logger
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.7 - Audit Logger Core
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Immutable audit logging with cryptographic signatures.
 *   Supports DCMA/DFARS compliance requirements.
 *
 * @compliance
 *   - DCMA 252.204-7012: Safeguarding Covered Defense Information
 *   - DFARS 252.204-7020: NIST SP 800-171 DoD Assessment
 *   - CMMC Level 2: Audit and Accountability (AU)
 *   - SOC 2 Type II: CC7.2, CC7.3
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

/**
 * Audit event types for MCP Gateway
 */
export type AuditEventType =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'TOOL_INVOCATION'
  | 'TOOL_EXECUTION'
  | 'TOOL_RESULT'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_DECISION'
  | 'RISK_ASSESSMENT'
  | 'PRIVACY_TOKENIZATION'
  | 'RATE_LIMIT'
  | 'QUOTA_CHECK'
  | 'ERROR'
  | 'SECURITY_ALERT'
  | 'CONFIGURATION_CHANGE'
  | 'SYSTEM_EVENT';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique entry ID */
  id: string;

  /** Entry timestamp (ISO 8601 with microseconds) */
  timestamp: string;

  /** Timestamp precision (microseconds since epoch) */
  timestampUs: number;

  /** Event type */
  eventType: AuditEventType;

  /** Event subtype (e.g., 'oauth_token_issued') */
  subtype?: string;

  /** Actor information */
  actor: AuditActor;

  /** Target resource */
  target?: AuditTarget;

  /** Event outcome */
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'PENDING';

  /** Event details */
  details: Record<string, unknown>;

  /** Risk level (if assessed) */
  riskLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Tenant context */
  tenantId?: string;

  /** Session ID */
  sessionId?: string;

  /** Request ID */
  requestId?: string;

  /** IP address */
  ipAddress?: string;

  /** User agent */
  userAgent?: string;

  /** Correlation ID (for tracing) */
  correlationId?: string;

  /** Parent entry ID (for nested events) */
  parentId?: string;

  /** Tags for filtering */
  tags?: string[];

  /** Classification level */
  classification?: 'UNCLASSIFIED' | 'CUI' | 'CONFIDENTIAL';

  /** HMAC signature of entry */
  signature: string;

  /** Previous entry hash (chain) */
  previousHash?: string;

  /** Entry hash */
  hash: string;
}

/**
 * Audit actor information
 */
export interface AuditActor {
  /** Actor type */
  type: 'user' | 'service' | 'system' | 'agent';

  /** Actor ID */
  id: string;

  /** Actor name */
  name?: string;

  /** Actor email */
  email?: string;

  /** Actor role */
  role?: string;

  /** Impersonation info */
  impersonatedBy?: {
    id: string;
    name?: string;
  };
}

/**
 * Audit target information
 */
export interface AuditTarget {
  /** Target type */
  type: 'tool' | 'resource' | 'configuration' | 'user' | 'tenant';

  /** Target ID */
  id: string;

  /** Target name */
  name?: string;

  /** Additional attributes */
  attributes?: Record<string, string>;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Signing key for HMAC */
  signingKey: string;

  /** Enable hash chaining */
  enableChaining: boolean;

  /** Minimum log level */
  minLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  /** Default classification */
  defaultClassification: 'UNCLASSIFIED' | 'CUI' | 'CONFIDENTIAL';

  /** Include sensitive details */
  includeSensitiveDetails: boolean;

  /** Maximum entry age before rotation (ms) */
  maxEntryAgeMs: number;

  /** Maximum entries before rotation */
  maxEntries: number;

  /** Output handlers */
  handlers: AuditHandler[];

  /** Async flush interval (ms) */
  flushIntervalMs: number;
}

/**
 * Audit handler interface
 */
export interface AuditHandler {
  /** Handler name */
  name: string;

  /** Handle log entry */
  handle(entry: AuditLogEntry): Promise<void>;

  /** Flush pending entries */
  flush(): Promise<void>;

  /** Close handler */
  close(): Promise<void>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: AuditLoggerConfig = {
  signingKey: crypto.randomBytes(32).toString('hex'),
  enableChaining: true,
  minLevel: 'INFO',
  defaultClassification: 'UNCLASSIFIED',
  includeSensitiveDetails: false,
  maxEntryAgeMs: 86400000, // 24 hours
  maxEntries: 100000,
  handlers: [],
  flushIntervalMs: 5000,
};

// ============================================
// AUDIT LOGGER
// ============================================

/**
 * Audit Logger
 *
 * Provides immutable, cryptographically signed audit logging
 * for compliance with DCMA/DFARS requirements.
 */
export class ImmutableAuditLogger {
  private config: AuditLoggerConfig;
  private entries: AuditLogEntry[] = [];
  private lastHash: string = '';
  private entryCounter: number = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private pendingEntries: AuditLogEntry[] = [];

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start flush timer
    this.startFlushTimer();

    // Initialize chain with genesis block
    this.initializeChain();
  }

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    actor: AuditActor,
    outcome: AuditLogEntry['outcome'],
    details: Record<string, unknown>,
    options?: {
      subtype?: string;
      target?: AuditTarget;
      riskLevel?: AuditLogEntry['riskLevel'];
      tenantId?: string;
      sessionId?: string;
      requestId?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
      parentId?: string;
      tags?: string[];
      classification?: AuditLogEntry['classification'];
    }
  ): Promise<AuditLogEntry> {
    // Generate entry ID
    const id = this.generateEntryId();

    // Get precise timestamp
    const now = Date.now();
    const timestampUs = now * 1000 + (this.entryCounter % 1000);

    // Sanitize details if needed
    const sanitizedDetails = this.config.includeSensitiveDetails
      ? details
      : this.sanitizeDetails(details);

    // Build entry (without signature and hash)
    const entry: Omit<AuditLogEntry, 'signature' | 'hash'> = {
      id,
      timestamp: new Date(now).toISOString(),
      timestampUs,
      eventType,
      subtype: options?.subtype,
      actor,
      target: options?.target,
      outcome,
      details: sanitizedDetails,
      riskLevel: options?.riskLevel,
      tenantId: options?.tenantId,
      sessionId: options?.sessionId,
      requestId: options?.requestId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      correlationId: options?.correlationId,
      parentId: options?.parentId,
      tags: options?.tags,
      classification: options?.classification || this.config.defaultClassification,
      previousHash: this.config.enableChaining ? this.lastHash : undefined,
    };

    // Compute signature and hash
    const entryJson = JSON.stringify(entry);
    const signature = this.sign(entryJson);
    const hash = this.computeHash(entryJson + signature);

    // Create final entry
    const finalEntry: AuditLogEntry = {
      ...entry,
      signature,
      hash,
    };

    // Update chain
    this.lastHash = hash;
    this.entryCounter++;

    // Store entry
    this.entries.push(finalEntry);
    this.pendingEntries.push(finalEntry);

    // Check rotation
    this.checkRotation();

    return finalEntry;
  }

  /**
   * Log tool invocation
   */
  async logToolInvocation(
    actor: AuditActor,
    toolName: string,
    params: Record<string, unknown>,
    options?: {
      tenantId?: string;
      requestId?: string;
      riskLevel?: AuditLogEntry['riskLevel'];
      correlationId?: string;
    }
  ): Promise<AuditLogEntry> {
    return this.log(
      'TOOL_INVOCATION',
      actor,
      'PENDING',
      {
        tool: toolName,
        params: this.redactParams(params),
      },
      {
        target: { type: 'tool', id: toolName, name: toolName },
        ...options,
      }
    );
  }

  /**
   * Log tool execution result
   */
  async logToolResult(
    actor: AuditActor,
    toolName: string,
    outcome: 'SUCCESS' | 'FAILURE',
    result: unknown,
    executionTimeMs: number,
    options?: {
      tenantId?: string;
      requestId?: string;
      parentId?: string;
      error?: string;
    }
  ): Promise<AuditLogEntry> {
    return this.log(
      'TOOL_RESULT',
      actor,
      outcome,
      {
        tool: toolName,
        executionTimeMs,
        hasResult: result !== undefined && result !== null,
        error: options?.error,
      },
      {
        target: { type: 'tool', id: toolName, name: toolName },
        ...options,
      }
    );
  }

  /**
   * Log approval decision
   */
  async logApprovalDecision(
    approver: AuditActor,
    requestId: string,
    decision: 'APPROVED' | 'DENIED',
    reason?: string,
    options?: {
      tenantId?: string;
      toolName?: string;
      riskLevel?: AuditLogEntry['riskLevel'];
    }
  ): Promise<AuditLogEntry> {
    return this.log(
      'APPROVAL_DECISION',
      approver,
      decision === 'APPROVED' ? 'SUCCESS' : 'FAILURE',
      {
        requestId,
        decision,
        reason,
        toolName: options?.toolName,
      },
      {
        subtype: `approval_${decision.toLowerCase()}`,
        riskLevel: options?.riskLevel,
        tenantId: options?.tenantId,
        requestId,
      }
    );
  }

  /**
   * Log security alert
   */
  async logSecurityAlert(
    alertType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, unknown>,
    options?: {
      actor?: AuditActor;
      tenantId?: string;
      correlationId?: string;
    }
  ): Promise<AuditLogEntry> {
    const actor = options?.actor || {
      type: 'system' as const,
      id: 'security-monitor',
      name: 'Security Monitor',
    };

    return this.log(
      'SECURITY_ALERT',
      actor,
      'SUCCESS',
      {
        alertType,
        severity,
        ...details,
      },
      {
        subtype: `alert_${alertType}`,
        riskLevel: severity,
        classification: severity === 'CRITICAL' ? 'CUI' : 'UNCLASSIFIED',
        tags: ['security', 'alert', severity.toLowerCase()],
        ...options,
      }
    );
  }

  /**
   * Query audit logs
   */
  query(filter: {
    startTime?: number;
    endTime?: number;
    eventTypes?: AuditEventType[];
    actorId?: string;
    tenantId?: string;
    outcome?: AuditLogEntry['outcome'];
    riskLevel?: AuditLogEntry['riskLevel'];
    tags?: string[];
    limit?: number;
    offset?: number;
  }): AuditLogEntry[] {
    let results = [...this.entries];

    // Apply filters
    if (filter.startTime) {
      results = results.filter((e) => e.timestampUs >= filter.startTime! * 1000);
    }

    if (filter.endTime) {
      results = results.filter((e) => e.timestampUs <= filter.endTime! * 1000);
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter((e) => filter.eventTypes!.includes(e.eventType));
    }

    if (filter.actorId) {
      results = results.filter((e) => e.actor.id === filter.actorId);
    }

    if (filter.tenantId) {
      results = results.filter((e) => e.tenantId === filter.tenantId);
    }

    if (filter.outcome) {
      results = results.filter((e) => e.outcome === filter.outcome);
    }

    if (filter.riskLevel) {
      results = results.filter((e) => e.riskLevel === filter.riskLevel);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((e) => e.tags && filter.tags!.some((t) => e.tags!.includes(t)));
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Verify entry integrity
   */
  verifyEntry(entry: AuditLogEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verify signature
    const entryWithoutSigHash = { ...entry };
    delete (entryWithoutSigHash as Record<string, unknown>).signature;
    delete (entryWithoutSigHash as Record<string, unknown>).hash;

    const entryJson = JSON.stringify(entryWithoutSigHash);
    const expectedSignature = this.sign(entryJson);

    if (entry.signature !== expectedSignature) {
      errors.push('Signature verification failed');
    }

    // Verify hash
    const expectedHash = this.computeHash(entryJson + entry.signature);
    if (entry.hash !== expectedHash) {
      errors.push('Hash verification failed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verify chain integrity
   */
  verifyChain(): { valid: boolean; brokenAt?: number; errors: string[] } {
    const errors: string[] = [];

    for (let i = 1; i < this.entries.length; i++) {
      const entry = this.entries[i]!;
      const prevEntry = this.entries[i - 1]!;

      // Verify chain link
      if (this.config.enableChaining && entry.previousHash !== prevEntry.hash) {
        errors.push(`Chain broken at entry ${i}: expected ${prevEntry.hash}, got ${entry.previousHash}`);
        return { valid: false, brokenAt: i, errors };
      }

      // Verify entry integrity
      const entryVerification = this.verifyEntry(entry);
      if (!entryVerification.valid) {
        errors.push(`Entry ${i} integrity failed: ${entryVerification.errors.join(', ')}`);
        return { valid: false, brokenAt: i, errors };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Export entries as JSON Lines
   */
  exportJSONL(): string {
    return this.entries.map((e) => JSON.stringify(e)).join('\n');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByOutcome: Record<string, number>;
    chainValid: boolean;
  } {
    const entriesByType: Record<string, number> = {};
    const entriesByOutcome: Record<string, number> = {};

    for (const entry of this.entries) {
      entriesByType[entry.eventType] = (entriesByType[entry.eventType] || 0) + 1;
      entriesByOutcome[entry.outcome] = (entriesByOutcome[entry.outcome] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      entriesByType,
      entriesByOutcome,
      chainValid: this.verifyChain().valid,
    };
  }

  /**
   * Flush pending entries to handlers
   */
  async flush(): Promise<void> {
    const toFlush = [...this.pendingEntries];
    this.pendingEntries = [];

    for (const handler of this.config.handlers) {
      for (const entry of toFlush) {
        await handler.handle(entry);
      }
      await handler.flush();
    }
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();

    // Close handlers
    for (const handler of this.config.handlers) {
      await handler.close();
    }
  }

  /**
   * Initialize hash chain
   */
  private initializeChain(): void {
    if (this.config.enableChaining) {
      // Genesis hash
      this.lastHash = this.computeHash('GENESIS');
    }
  }

  /**
   * Generate entry ID
   */
  private generateEntryId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Sign data using HMAC-SHA256
   */
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.config.signingKey).update(data).digest('hex');
  }

  /**
   * Compute SHA-256 hash
   */
  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sanitize details by removing sensitive fields
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'credential',
    ];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Redact sensitive parameters
   */
  private redactParams(params: Record<string, unknown>): Record<string, unknown> {
    return this.sanitizeDetails(params);
  }

  /**
   * Check if rotation is needed
   */
  private checkRotation(): void {
    if (this.entries.length > this.config.maxEntries) {
      // In production, would archive old entries
      const toRemove = this.entries.length - this.config.maxEntries;
      this.entries.splice(0, toRemove);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushIntervalMs);
  }

  /**
   * Add handler
   */
  addHandler(handler: AuditHandler): void {
    this.config.handlers.push(handler);
  }
}

// ============================================
// EXPORTS
// ============================================

export default ImmutableAuditLogger;
