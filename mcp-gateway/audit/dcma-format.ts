/**
 * MCP Security Gateway - DCMA/DFARS Log Format
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.8 - DCMA/DFARS Log Format
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   DCMA 252.204-7012 and DFARS compliant log formatting.
 *   Supports CUI marking and evidence pack generation.
 *
 * @compliance
 *   - DCMA 252.204-7012: Safeguarding Covered Defense Information
 *   - DFARS 252.204-7020: NIST SP 800-171 DoD Assessment
 *   - NIST SP 800-53: AU-2, AU-3, AU-6, AU-9, AU-12
 */

import type { AuditLogEntry } from './audit-logger.js';

// ============================================
// TYPES
// ============================================

/**
 * DCMA compliance levels
 */
export type DCMAComplianceLevel = 'BASIC' | 'MEDIUM' | 'HIGH';

/**
 * CUI marking categories
 */
export type CUICategory =
  | 'CUI//SP-CTI'      // Controlled Technical Information
  | 'CUI//SP-EXPT'     // Export Controlled
  | 'CUI//SP-NNPI'     // Naval Nuclear Propulsion Information
  | 'CUI//SP-PROPIN'   // Proprietary Information
  | 'CUI//SP-PRIVAC'   // Privacy
  | 'CUI//BASIC';

/**
 * DCMA formatted audit entry
 */
export interface DCMAAuditEntry {
  /** DCMA record identifier */
  dcmaRecordId: string;

  /** Timestamp (NIST format) */
  timestamp: string;

  /** Event source system */
  sourceSystem: string;

  /** Event classification */
  classification: {
    level: 'UNCLASSIFIED' | 'CUI' | 'CONFIDENTIAL';
    cuiCategory?: CUICategory;
    handling: string[];
    dissemination: string[];
  };

  /** Event type per NIST SP 800-53 AU-2 */
  eventType: {
    category: string;
    subcategory: string;
    action: string;
  };

  /** Actor/subject information */
  subject: {
    type: 'USER' | 'PROCESS' | 'SYSTEM';
    identifier: string;
    name?: string;
    role?: string;
    clearance?: string;
  };

  /** Object/target information */
  object?: {
    type: string;
    identifier: string;
    name?: string;
    classification?: string;
  };

  /** Outcome */
  outcome: {
    status: 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
    reason?: string;
    impact?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };

  /** Context */
  context: {
    sessionId?: string;
    requestId?: string;
    ipAddress?: string;
    location?: string;
    application: string;
    version: string;
  };

  /** Evidence chain */
  evidence: {
    hash: string;
    previousHash?: string;
    signature: string;
    timestamp: string;
  };

  /** Retention metadata */
  retention: {
    category: string;
    period: string;
    dispositionDate?: string;
    legalHold: boolean;
  };
}

/**
 * Evidence pack for auditors
 */
export interface EvidencePack {
  /** Pack identifier */
  packId: string;

  /** Generation timestamp */
  generatedAt: string;

  /** Time range covered */
  timeRange: {
    start: string;
    end: string;
  };

  /** Compliance framework */
  framework: 'DCMA' | 'DFARS' | 'CMMC' | 'NIST';

  /** Summary statistics */
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    securityAlerts: number;
    approvalDecisions: number;
  };

  /** Audit entries */
  entries: DCMAAuditEntry[];

  /** Chain verification */
  chainVerification: {
    verified: boolean;
    entriesVerified: number;
    errors: string[];
  };

  /** Pack signature */
  signature: string;

  /** Metadata */
  metadata: {
    generatedBy: string;
    toolVersion: string;
    exportFormat: string;
  };
}

/**
 * DCMA formatter configuration
 */
export interface DCMAFormatterConfig {
  /** Source system name */
  sourceSystem: string;

  /** Application name */
  application: string;

  /** Application version */
  version: string;

  /** Default retention category */
  defaultRetentionCategory: string;

  /** Default retention period */
  defaultRetentionPeriod: string;

  /** Include legal hold flag */
  legalHoldEnabled: boolean;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: DCMAFormatterConfig = {
  sourceSystem: 'MCP-Security-Gateway',
  application: 'ArcFoundry MCP Gateway',
  version: '1.0.0',
  defaultRetentionCategory: 'OPERATIONAL',
  defaultRetentionPeriod: '7-YEARS', // DCMA requirement
  legalHoldEnabled: false,
};

// ============================================
// DCMA FORMATTER
// ============================================

/**
 * DCMA Format Converter
 *
 * Converts audit log entries to DCMA/DFARS compliant format.
 */
export class DCMAFormatter {
  private config: DCMAFormatterConfig;
  private recordCounter: number = 0;

  constructor(config: Partial<DCMAFormatterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Convert audit entry to DCMA format
   */
  formatEntry(entry: AuditLogEntry): DCMAAuditEntry {
    const dcmaRecordId = this.generateRecordId();

    return {
      dcmaRecordId,
      timestamp: this.formatTimestamp(entry.timestamp),
      sourceSystem: this.config.sourceSystem,

      classification: this.formatClassification(entry),
      eventType: this.mapEventType(entry),
      subject: this.formatSubject(entry),
      object: entry.target ? this.formatObject(entry) : undefined,
      outcome: this.formatOutcome(entry),
      context: this.formatContext(entry),
      evidence: this.formatEvidence(entry),
      retention: this.formatRetention(entry),
    };
  }

  /**
   * Format multiple entries
   */
  formatEntries(entries: AuditLogEntry[]): DCMAAuditEntry[] {
    return entries.map((entry) => this.formatEntry(entry));
  }

  /**
   * Generate evidence pack
   */
  generateEvidencePack(
    entries: AuditLogEntry[],
    options?: {
      framework?: 'DCMA' | 'DFARS' | 'CMMC' | 'NIST';
      startTime?: string;
      endTime?: string;
    }
  ): EvidencePack {
    const packId = this.generatePackId();
    const formattedEntries = this.formatEntries(entries);

    // Calculate summary
    const summary = this.calculateSummary(entries);

    // Verify chain
    const chainVerification = this.verifyChain(entries);

    // Generate pack signature
    const packData = JSON.stringify({
      packId,
      entries: formattedEntries,
      summary,
    });
    const signature = this.sign(packData);

    return {
      packId,
      generatedAt: new Date().toISOString(),
      timeRange: {
        start:
          options?.startTime ||
          (entries.length > 0 ? entries[0]!.timestamp : new Date().toISOString()),
        end:
          options?.endTime ||
          (entries.length > 0 ? entries[entries.length - 1]!.timestamp : new Date().toISOString()),
      },
      framework: options?.framework || 'DCMA',
      summary,
      entries: formattedEntries,
      chainVerification,
      signature,
      metadata: {
        generatedBy: this.config.sourceSystem,
        toolVersion: this.config.version,
        exportFormat: 'DCMA-COMPLIANT-JSON',
      },
    };
  }

  /**
   * Export to PDF format (returns HTML for PDF generation)
   */
  generatePDFContent(pack: EvidencePack): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>DCMA Audit Report - ${pack.packId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #333; }
    h2 { color: #666; margin-top: 30px; }
    .header { background: #f5f5f5; padding: 20px; margin-bottom: 30px; }
    .classification { color: red; font-weight: bold; text-align: center; }
    .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .summary-table th, .summary-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .summary-table th { background: #f5f5f5; }
    .entry { margin: 10px 0; padding: 10px; border: 1px solid #eee; }
    .entry-header { font-weight: bold; color: #333; }
    .verification { background: ${pack.chainVerification.verified ? '#e8f5e9' : '#ffebee'}; padding: 10px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="classification">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>

  <div class="header">
    <h1>DCMA Compliance Audit Report</h1>
    <p><strong>Pack ID:</strong> ${pack.packId}</p>
    <p><strong>Generated:</strong> ${pack.generatedAt}</p>
    <p><strong>Framework:</strong> ${pack.framework}</p>
    <p><strong>Time Range:</strong> ${pack.timeRange.start} to ${pack.timeRange.end}</p>
  </div>

  <h2>Executive Summary</h2>
  <table class="summary-table">
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Events</td><td>${pack.summary.totalEvents}</td></tr>
    <tr><td>Security Alerts</td><td>${pack.summary.securityAlerts}</td></tr>
    <tr><td>Approval Decisions</td><td>${pack.summary.approvalDecisions}</td></tr>
  </table>

  <h2>Events by Type</h2>
  <table class="summary-table">
    <tr><th>Event Type</th><th>Count</th></tr>
    ${Object.entries(pack.summary.eventsByType)
      .map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`)
      .join('\n')}
  </table>

  <h2>Events by Outcome</h2>
  <table class="summary-table">
    <tr><th>Outcome</th><th>Count</th></tr>
    ${Object.entries(pack.summary.eventsByOutcome)
      .map(([outcome, count]) => `<tr><td>${outcome}</td><td>${count}</td></tr>`)
      .join('\n')}
  </table>

  <div class="verification">
    <h2>Chain Verification</h2>
    <p><strong>Status:</strong> ${pack.chainVerification.verified ? '✓ VERIFIED' : '✗ VERIFICATION FAILED'}</p>
    <p><strong>Entries Verified:</strong> ${pack.chainVerification.entriesVerified}</p>
    ${
      pack.chainVerification.errors.length > 0
        ? `<p><strong>Errors:</strong> ${pack.chainVerification.errors.join(', ')}</p>`
        : ''
    }
  </div>

  <h2>Detailed Audit Trail</h2>
  ${pack.entries
    .slice(0, 100)
    .map(
      (entry) => `
    <div class="entry">
      <div class="entry-header">[${entry.timestamp}] ${entry.eventType.category}/${entry.eventType.action}</div>
      <p><strong>Record ID:</strong> ${entry.dcmaRecordId}</p>
      <p><strong>Subject:</strong> ${entry.subject.type} - ${entry.subject.identifier}</p>
      <p><strong>Outcome:</strong> ${entry.outcome.status}</p>
      <p><strong>Classification:</strong> ${entry.classification.level}</p>
    </div>
  `
    )
    .join('\n')}
  ${pack.entries.length > 100 ? `<p><em>... and ${pack.entries.length - 100} more entries</em></p>` : ''}

  <div class="footer">
    <p>This document was automatically generated by ${pack.metadata.generatedBy} v${pack.metadata.toolVersion}</p>
    <p>Pack Signature: ${pack.signature.substring(0, 32)}...</p>
    <p>DCMA 252.204-7012 Compliant</p>
  </div>

  <div class="classification">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate record ID
   */
  private generateRecordId(): string {
    this.recordCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.recordCounter.toString(36).padStart(6, '0');
    return `DCMA-${timestamp}-${counter}`.toUpperCase();
  }

  /**
   * Generate pack ID
   */
  private generatePackId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PACK-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Format timestamp to NIST standard
   */
  private formatTimestamp(timestamp: string): string {
    // ISO 8601 with timezone
    const date = new Date(timestamp);
    return date.toISOString();
  }

  /**
   * Format classification
   */
  private formatClassification(entry: AuditLogEntry): DCMAAuditEntry['classification'] {
    return {
      level: entry.classification || 'UNCLASSIFIED',
      cuiCategory: entry.classification === 'CUI' ? 'CUI//BASIC' : undefined,
      handling: ['FOUO'], // For Official Use Only
      dissemination: ['NO FOREIGN NATIONALS'],
    };
  }

  /**
   * Map event type to NIST categories
   */
  private mapEventType(entry: AuditLogEntry): DCMAAuditEntry['eventType'] {
    const categoryMap: Record<string, { category: string; subcategory: string }> = {
      AUTHENTICATION: { category: 'IDENTIFICATION_AUTHENTICATION', subcategory: 'LOGIN' },
      AUTHORIZATION: { category: 'ACCESS_CONTROL', subcategory: 'PERMISSION_CHECK' },
      TOOL_INVOCATION: { category: 'SYSTEM_ACTIVITY', subcategory: 'TOOL_CALL' },
      TOOL_EXECUTION: { category: 'SYSTEM_ACTIVITY', subcategory: 'EXECUTION' },
      TOOL_RESULT: { category: 'SYSTEM_ACTIVITY', subcategory: 'RESULT' },
      APPROVAL_REQUEST: { category: 'ACCESS_CONTROL', subcategory: 'APPROVAL_REQUEST' },
      APPROVAL_DECISION: { category: 'ACCESS_CONTROL', subcategory: 'APPROVAL_DECISION' },
      RISK_ASSESSMENT: { category: 'RISK_ASSESSMENT', subcategory: 'EVALUATION' },
      SECURITY_ALERT: { category: 'INCIDENT_RESPONSE', subcategory: 'ALERT' },
      ERROR: { category: 'SYSTEM_ACTIVITY', subcategory: 'ERROR' },
      CONFIGURATION_CHANGE: { category: 'CONFIGURATION_MANAGEMENT', subcategory: 'CHANGE' },
      SYSTEM_EVENT: { category: 'SYSTEM_ACTIVITY', subcategory: 'SYSTEM' },
    };

    const mapping = categoryMap[entry.eventType] || {
      category: 'SYSTEM_ACTIVITY',
      subcategory: 'OTHER',
    };

    return {
      ...mapping,
      action: entry.subtype || entry.eventType,
    };
  }

  /**
   * Format subject
   */
  private formatSubject(entry: AuditLogEntry): DCMAAuditEntry['subject'] {
    return {
      type: entry.actor.type === 'user' ? 'USER' : entry.actor.type === 'system' ? 'SYSTEM' : 'PROCESS',
      identifier: entry.actor.id,
      name: entry.actor.name,
      role: entry.actor.role,
    };
  }

  /**
   * Format object
   */
  private formatObject(entry: AuditLogEntry): DCMAAuditEntry['object'] {
    if (!entry.target) return undefined;

    return {
      type: entry.target.type.toUpperCase(),
      identifier: entry.target.id,
      name: entry.target.name,
    };
  }

  /**
   * Format outcome
   */
  private formatOutcome(entry: AuditLogEntry): DCMAAuditEntry['outcome'] {
    const impactMap: Record<string, 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      MINIMAL: 'NONE',
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL',
    };

    // Map audit outcomes to DCMA status
    let status: 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
    switch (entry.outcome) {
      case 'SUCCESS':
        status = 'SUCCESS';
        break;
      case 'FAILURE':
        status = 'FAILURE';
        break;
      case 'PARTIAL':
      case 'PENDING':
      default:
        status = 'UNKNOWN';
        break;
    }

    return {
      status,
      impact: entry.riskLevel ? impactMap[entry.riskLevel] : 'NONE',
    };
  }

  /**
   * Format context
   */
  private formatContext(entry: AuditLogEntry): DCMAAuditEntry['context'] {
    return {
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress,
      application: this.config.application,
      version: this.config.version,
    };
  }

  /**
   * Format evidence
   */
  private formatEvidence(entry: AuditLogEntry): DCMAAuditEntry['evidence'] {
    return {
      hash: entry.hash,
      previousHash: entry.previousHash,
      signature: entry.signature,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Format retention
   */
  private formatRetention(entry: AuditLogEntry): DCMAAuditEntry['retention'] {
    return {
      category: this.config.defaultRetentionCategory,
      period: this.config.defaultRetentionPeriod,
      legalHold: this.config.legalHoldEnabled,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(entries: AuditLogEntry[]): EvidencePack['summary'] {
    const eventsByType: Record<string, number> = {};
    const eventsByOutcome: Record<string, number> = {};
    let securityAlerts = 0;
    let approvalDecisions = 0;

    for (const entry of entries) {
      eventsByType[entry.eventType] = (eventsByType[entry.eventType] || 0) + 1;
      eventsByOutcome[entry.outcome] = (eventsByOutcome[entry.outcome] || 0) + 1;

      if (entry.eventType === 'SECURITY_ALERT') securityAlerts++;
      if (entry.eventType === 'APPROVAL_DECISION') approvalDecisions++;
    }

    return {
      totalEvents: entries.length,
      eventsByType,
      eventsByOutcome,
      securityAlerts,
      approvalDecisions,
    };
  }

  /**
   * Verify entry chain
   */
  private verifyChain(entries: AuditLogEntry[]): EvidencePack['chainVerification'] {
    const errors: string[] = [];
    let verified = 0;

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i]!;
      const prevEntry = entries[i - 1]!;

      if (entry.previousHash && entry.previousHash !== prevEntry.hash) {
        errors.push(`Chain break at entry ${i}`);
      } else {
        verified++;
      }
    }

    // Count first entry
    if (entries.length > 0) verified++;

    return {
      verified: errors.length === 0,
      entriesVerified: verified,
      errors,
    };
  }

  /**
   * Sign data
   */
  private sign(data: string): string {
    // In production, use proper signing key
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// ============================================
// EXPORTS
// ============================================

export default DCMAFormatter;
