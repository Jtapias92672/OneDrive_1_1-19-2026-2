/**
 * MCP Security Gateway - Evidence Binding
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.9 - Evidence Binding
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Cryptographic evidence binding for audit entries.
 *   Provides chain of custody tracking and cross-reference validation.
 *
 * @compliance
 *   - DCMA: Evidence preservation requirements
 *   - NIST SP 800-53: AU-9 Protection of Audit Information
 *   - NIST SP 800-53: AU-10 Non-repudiation
 */

import * as crypto from 'crypto';
import type { AuditLogEntry } from './audit-logger.js';

// ============================================
// TYPES
// ============================================

/**
 * Evidence binding record
 */
export interface EvidenceBinding {
  /** Binding ID */
  id: string;

  /** Created timestamp */
  createdAt: string;

  /** Evidence type */
  type: EvidenceType;

  /** Source audit entry IDs */
  sourceEntryIds: string[];

  /** Bound artifacts */
  artifacts: EvidenceArtifact[];

  /** Binding hash (all artifacts) */
  bindingHash: string;

  /** Digital signature */
  signature: string;

  /** Chain of custody */
  custody: CustodyRecord[];

  /** Cross-references to other bindings */
  crossReferences: string[];

  /** Metadata */
  metadata: Record<string, unknown>;

  /** Verification status */
  verified: boolean;
}

/**
 * Evidence types
 */
export type EvidenceType =
  | 'TOOL_EXECUTION'
  | 'APPROVAL_CHAIN'
  | 'RISK_ASSESSMENT'
  | 'SECURITY_INCIDENT'
  | 'CONFIGURATION_CHANGE'
  | 'COMPLIANCE_SNAPSHOT';

/**
 * Evidence artifact
 */
export interface EvidenceArtifact {
  /** Artifact ID */
  id: string;

  /** Artifact type */
  type: 'AUDIT_ENTRY' | 'FILE' | 'SCREENSHOT' | 'LOG' | 'REPORT';

  /** Artifact name */
  name: string;

  /** SHA-256 hash of content */
  hash: string;

  /** Size in bytes */
  size: number;

  /** MIME type */
  mimeType: string;

  /** Storage location (URI) */
  location?: string;

  /** Timestamp */
  timestamp: string;

  /** Additional attributes */
  attributes?: Record<string, string>;
}

/**
 * Chain of custody record
 */
export interface CustodyRecord {
  /** Custody event ID */
  id: string;

  /** Timestamp */
  timestamp: string;

  /** Action taken */
  action: 'CREATED' | 'ACCESSED' | 'MODIFIED' | 'TRANSFERRED' | 'SEALED' | 'RELEASED';

  /** Actor */
  actor: {
    type: 'USER' | 'SYSTEM' | 'SERVICE';
    id: string;
    name?: string;
  };

  /** Reason for action */
  reason?: string;

  /** Previous hash (before modification) */
  previousHash?: string;

  /** New hash (after modification) */
  newHash?: string;

  /** Signature of this custody record */
  signature: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Overall validity */
  valid: boolean;

  /** Hash verification passed */
  hashValid: boolean;

  /** Signature verification passed */
  signatureValid: boolean;

  /** Custody chain valid */
  custodyValid: boolean;

  /** Cross-references valid */
  crossReferencesValid: boolean;

  /** Errors found */
  errors: string[];

  /** Warnings */
  warnings: string[];
}

/**
 * Evidence binder configuration
 */
export interface EvidenceBinderConfig {
  /** Signing key */
  signingKey: string;

  /** Auto-seal after binding */
  autoSeal: boolean;

  /** Require custody tracking */
  requireCustody: boolean;

  /** Verify cross-references */
  verifyCrossReferences: boolean;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: EvidenceBinderConfig = {
  signingKey: crypto.randomBytes(32).toString('hex'),
  autoSeal: true,
  requireCustody: true,
  verifyCrossReferences: true,
};

// ============================================
// EVIDENCE BINDER
// ============================================

/**
 * Evidence Binder
 *
 * Creates cryptographically bound evidence packages for audit compliance.
 */
export class EvidenceBinder {
  private config: EvidenceBinderConfig;
  private bindings: Map<string, EvidenceBinding> = new Map();

  constructor(config: Partial<EvidenceBinderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create evidence binding from audit entries
   */
  createBinding(
    type: EvidenceType,
    entries: AuditLogEntry[],
    options?: {
      artifacts?: Omit<EvidenceArtifact, 'id'>[];
      crossReferences?: string[];
      metadata?: Record<string, unknown>;
      actor?: CustodyRecord['actor'];
    }
  ): EvidenceBinding {
    const id = this.generateBindingId();
    const now = new Date().toISOString();

    // Create artifacts from audit entries
    const entryArtifacts: EvidenceArtifact[] = entries.map((entry) => ({
      id: `artifact_${entry.id}`,
      type: 'AUDIT_ENTRY' as const,
      name: `Audit Entry: ${entry.eventType}`,
      hash: entry.hash,
      size: JSON.stringify(entry).length,
      mimeType: 'application/json',
      timestamp: entry.timestamp,
      attributes: {
        eventType: entry.eventType,
        outcome: entry.outcome,
      },
    }));

    // Add additional artifacts
    const additionalArtifacts: EvidenceArtifact[] = (options?.artifacts || []).map((a, i) => ({
      ...a,
      id: `artifact_custom_${i}`,
    }));

    const allArtifacts = [...entryArtifacts, ...additionalArtifacts];

    // Compute binding hash
    const artifactHashes = allArtifacts.map((a) => a.hash).join('');
    const bindingHash = this.computeHash(artifactHashes);

    // Create initial custody record
    const actor = options?.actor || {
      type: 'SYSTEM' as const,
      id: 'evidence-binder',
      name: 'Evidence Binder Service',
    };

    const custodyId = this.generateCustodyId();
    const custodySignature = this.sign(
      JSON.stringify({
        id: custodyId,
        timestamp: now,
        action: 'CREATED',
        actor,
        newHash: bindingHash,
      })
    );

    const initialCustody: CustodyRecord = {
      id: custodyId,
      timestamp: now,
      action: 'CREATED',
      actor,
      newHash: bindingHash,
      signature: custodySignature,
    };

    // Create binding signature
    const bindingData = JSON.stringify({
      id,
      type,
      sourceEntryIds: entries.map((e) => e.id),
      artifacts: allArtifacts,
      bindingHash,
      crossReferences: options?.crossReferences || [],
      metadata: options?.metadata || {},
    });
    const signature = this.sign(bindingData);

    const binding: EvidenceBinding = {
      id,
      createdAt: now,
      type,
      sourceEntryIds: entries.map((e) => e.id),
      artifacts: allArtifacts,
      bindingHash,
      signature,
      custody: [initialCustody],
      crossReferences: options?.crossReferences || [],
      metadata: options?.metadata || {},
      verified: true,
    };

    // Auto-seal if configured
    if (this.config.autoSeal) {
      this.seal(binding, actor);
    }

    // Store binding
    this.bindings.set(id, binding);

    return binding;
  }

  /**
   * Add custody record
   */
  addCustody(
    bindingId: string,
    action: CustodyRecord['action'],
    actor: CustodyRecord['actor'],
    reason?: string
  ): CustodyRecord | null {
    const binding = this.bindings.get(bindingId);
    if (!binding) return null;

    const now = new Date().toISOString();
    const previousHash = binding.custody.length > 0
      ? binding.custody[binding.custody.length - 1]!.newHash
      : binding.bindingHash;

    const custodyId = this.generateCustodyId();
    const custodySignature = this.sign(
      JSON.stringify({
        id: custodyId,
        timestamp: now,
        action,
        actor,
        reason,
        previousHash,
      })
    );

    const custodyRecord: CustodyRecord = {
      id: custodyId,
      timestamp: now,
      action,
      actor,
      reason,
      previousHash,
      newHash: this.computeHash(previousHash + custodySignature),
      signature: custodySignature,
    };

    binding.custody.push(custodyRecord);

    return custodyRecord;
  }

  /**
   * Seal evidence binding
   */
  seal(binding: EvidenceBinding, actor: CustodyRecord['actor']): void {
    this.addCustody(binding.id, 'SEALED', actor, 'Evidence sealed for preservation');
  }

  /**
   * Validate evidence binding
   */
  validate(binding: EvidenceBinding): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify binding hash
    const artifactHashes = binding.artifacts.map((a) => a.hash).join('');
    const expectedHash = this.computeHash(artifactHashes);
    const hashValid = binding.bindingHash === expectedHash;

    if (!hashValid) {
      errors.push('Binding hash verification failed');
    }

    // Verify signature
    const bindingData = JSON.stringify({
      id: binding.id,
      type: binding.type,
      sourceEntryIds: binding.sourceEntryIds,
      artifacts: binding.artifacts,
      bindingHash: binding.bindingHash,
      crossReferences: binding.crossReferences,
      metadata: binding.metadata,
    });
    const expectedSignature = this.sign(bindingData);
    const signatureValid = binding.signature === expectedSignature;

    if (!signatureValid) {
      errors.push('Binding signature verification failed');
    }

    // Verify custody chain
    let custodyValid = true;
    for (let i = 1; i < binding.custody.length; i++) {
      const record = binding.custody[i]!;
      const prevRecord = binding.custody[i - 1]!;

      if (record.previousHash !== prevRecord.newHash) {
        custodyValid = false;
        errors.push(`Custody chain broken at record ${i}`);
      }
    }

    // Verify cross-references
    let crossReferencesValid = true;
    if (this.config.verifyCrossReferences) {
      for (const refId of binding.crossReferences) {
        if (!this.bindings.has(refId)) {
          crossReferencesValid = false;
          warnings.push(`Cross-reference ${refId} not found`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      hashValid,
      signatureValid,
      custodyValid,
      crossReferencesValid,
      errors,
      warnings,
    };
  }

  /**
   * Get binding by ID
   */
  getBinding(id: string): EvidenceBinding | undefined {
    return this.bindings.get(id);
  }

  /**
   * Get bindings by type
   */
  getBindingsByType(type: EvidenceType): EvidenceBinding[] {
    return Array.from(this.bindings.values()).filter((b) => b.type === type);
  }

  /**
   * Get bindings for audit entry
   */
  getBindingsForEntry(entryId: string): EvidenceBinding[] {
    return Array.from(this.bindings.values()).filter((b) =>
      b.sourceEntryIds.includes(entryId)
    );
  }

  /**
   * Export binding as JSON
   */
  exportBinding(binding: EvidenceBinding): string {
    return JSON.stringify(binding, null, 2);
  }

  /**
   * Import binding from JSON
   */
  importBinding(json: string): EvidenceBinding | null {
    try {
      const binding = JSON.parse(json) as EvidenceBinding;
      const validation = this.validate(binding);

      if (!validation.valid) {
        console.error('Binding validation failed:', validation.errors);
        return null;
      }

      this.bindings.set(binding.id, binding);
      return binding;
    } catch {
      return null;
    }
  }

  /**
   * Get all bindings
   */
  getAllBindings(): EvidenceBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Generate binding ID
   */
  private generateBindingId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `evidence_${timestamp}_${random}`;
  }

  /**
   * Generate custody ID
   */
  private generateCustodyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `custody_${timestamp}_${random}`;
  }

  /**
   * Compute SHA-256 hash
   */
  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sign data with HMAC-SHA256
   */
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.config.signingKey).update(data).digest('hex');
  }
}

// ============================================
// EXPORTS
// ============================================

export default EvidenceBinder;
