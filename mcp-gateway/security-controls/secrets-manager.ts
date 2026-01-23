/**
 * FORGE Platform - Secrets Management
 *
 * @epic 3.6 - Security Controls
 * @description Secure secrets storage, rotation, and access control
 */

import { Secret, SecretMetadata, SecretRotation, EncryptedData, SecurityAuditEvent } from './types.js';
import { cryptoService, CryptoError } from './crypto-service.js';
import * as crypto from 'crypto';

// ============================================
// SECRETS MANAGER
// ============================================

export class SecretsManager {
  private secrets: Map<string, Secret> = new Map();
  private secretVersions: Map<string, Map<number, EncryptedData>> = new Map();
  private accessPolicies: Map<string, Set<string>> = new Map(); // secretId -> allowed subjects
  private eventEmitter: ((event: SecurityAuditEvent) => void) | null = null;
  private rotationCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startRotationCheck();
  }

  /**
   * Set event emitter for audit events
   */
  setEventEmitter(emitter: (event: SecurityAuditEvent) => void): void {
    this.eventEmitter = emitter;
  }

  // ==========================================
  // SECRET LIFECYCLE
  // ==========================================

  /**
   * Store a new secret
   */
  async storeSecret(params: StoreSecretParams): Promise<Secret> {
    const { name, type, value, metadata } = params;

    // Check for duplicate name within tenant
    for (const secret of this.secrets.values()) {
      if (secret.name === name && secret.metadata.tenantId === metadata.tenantId) {
        throw new SecretsError('DUPLICATE_NAME', `Secret with name "${name}" already exists`);
      }
    }

    const secretId = `secret_${crypto.randomUUID()}`;
    const now = new Date();

    // Encrypt the value
    const encryptedValue = cryptoService.encrypt(value, 'secret');

    // Build complete rotation config
    const rotationConfig: SecretRotation = {
      enabled: metadata.rotation?.enabled ?? false,
      intervalDays: metadata.rotation?.intervalDays ?? 0,
      notifyBeforeDays: metadata.rotation?.notifyBeforeDays ?? 7,
      lastRotatedAt: metadata.rotation?.lastRotatedAt,
      nextRotationAt: metadata.rotation?.nextRotationAt,
    };

    // Calculate expiration if rotation is enabled
    let expiresAt: string | undefined;
    if (rotationConfig.enabled && rotationConfig.intervalDays > 0) {
      const expiration = new Date(now.getTime() + rotationConfig.intervalDays * 24 * 60 * 60 * 1000);
      expiresAt = expiration.toISOString();
      rotationConfig.nextRotationAt = expiresAt;
    }

    const secret: Secret = {
      id: secretId,
      name,
      type,
      version: 1,
      encryptedValue,
      metadata: {
        ...metadata,
        rotation: rotationConfig,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
      accessCount: 0,
    };

    // Store secret and version
    this.secrets.set(secretId, secret);
    this.secretVersions.set(secretId, new Map([[1, encryptedValue]]));

    // Set up access policies
    if (metadata.accessPolicy && metadata.accessPolicy.length > 0) {
      this.accessPolicies.set(secretId, new Set(metadata.accessPolicy));
    }

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      eventType: 'secret',
      severity: 'info',
      subject: { id: metadata.owner, type: 'user', tenantId: metadata.tenantId },
      resource: { type: 'secret', id: secretId },
      action: 'secret_created',
      outcome: 'success',
      details: {
        secretName: name,
        secretType: type,
        hasExpiration: !!expiresAt,
        rotationEnabled: metadata.rotation?.enabled,
      },
      requestId: crypto.randomUUID(),
    });

    return this.sanitizeSecret(secret);
  }

  /**
   * Get a secret value
   */
  async getSecret(secretId: string, subjectId: string, version?: number): Promise<string> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new SecretsError('SECRET_NOT_FOUND', `Secret not found: ${secretId}`);
    }

    // Check access policy
    if (!this.checkAccess(secretId, subjectId)) {
      this.emitEvent({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'secret',
        severity: 'warning',
        subject: { id: subjectId, type: 'user', tenantId: secret.metadata.tenantId },
        resource: { type: 'secret', id: secretId },
        action: 'secret_access_denied',
        outcome: 'failure',
        details: { reason: 'Access policy denied' },
        requestId: crypto.randomUUID(),
      });
      throw new SecretsError('ACCESS_DENIED', 'Access to secret denied');
    }

    // Get the requested version
    const versions = this.secretVersions.get(secretId);
    const targetVersion = version ?? secret.version;
    const encryptedValue = versions?.get(targetVersion);

    if (!encryptedValue) {
      throw new SecretsError('VERSION_NOT_FOUND', `Secret version ${targetVersion} not found`);
    }

    // Decrypt
    const decryptedValue = cryptoService.decryptToString(encryptedValue);

    // Update access tracking
    secret.lastAccessedAt = new Date().toISOString();
    secret.accessCount++;

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'secret',
      severity: 'info',
      subject: { id: subjectId, type: 'user', tenantId: secret.metadata.tenantId },
      resource: { type: 'secret', id: secretId },
      action: 'secret_accessed',
      outcome: 'success',
      details: {
        secretName: secret.name,
        version: targetVersion,
        accessCount: secret.accessCount,
      },
      requestId: crypto.randomUUID(),
    });

    return decryptedValue;
  }

  /**
   * Update a secret value (creates new version)
   */
  async updateSecret(secretId: string, newValue: string, updatedBy: string): Promise<Secret> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new SecretsError('SECRET_NOT_FOUND', `Secret not found: ${secretId}`);
    }

    // Check access
    if (!this.checkAccess(secretId, updatedBy)) {
      throw new SecretsError('ACCESS_DENIED', 'Access to secret denied');
    }

    const now = new Date();
    const newVersion = secret.version + 1;

    // Encrypt new value
    const encryptedValue = cryptoService.encrypt(newValue, 'secret');

    // Store new version
    const versions = this.secretVersions.get(secretId);
    versions?.set(newVersion, encryptedValue);

    // Update secret metadata
    secret.version = newVersion;
    secret.encryptedValue = encryptedValue;
    secret.updatedAt = now.toISOString();

    // Update rotation metadata if enabled
    if (secret.metadata.rotation?.enabled) {
      secret.metadata.rotation.lastRotatedAt = now.toISOString();
      const nextRotation = new Date(now.getTime() + secret.metadata.rotation.intervalDays * 24 * 60 * 60 * 1000);
      secret.metadata.rotation.nextRotationAt = nextRotation.toISOString();
      secret.expiresAt = nextRotation.toISOString();
    }

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      eventType: 'secret',
      severity: 'info',
      subject: { id: updatedBy, type: 'user', tenantId: secret.metadata.tenantId },
      resource: { type: 'secret', id: secretId },
      action: 'secret_updated',
      outcome: 'success',
      details: {
        secretName: secret.name,
        previousVersion: newVersion - 1,
        newVersion,
      },
      requestId: crypto.randomUUID(),
    });

    return this.sanitizeSecret(secret);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string, deletedBy: string): Promise<void> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new SecretsError('SECRET_NOT_FOUND', `Secret not found: ${secretId}`);
    }

    // Check access
    if (!this.checkAccess(secretId, deletedBy)) {
      throw new SecretsError('ACCESS_DENIED', 'Access to secret denied');
    }

    // Remove secret and versions
    this.secrets.delete(secretId);
    this.secretVersions.delete(secretId);
    this.accessPolicies.delete(secretId);

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'secret',
      severity: 'warning',
      subject: { id: deletedBy, type: 'user', tenantId: secret.metadata.tenantId },
      resource: { type: 'secret', id: secretId },
      action: 'secret_deleted',
      outcome: 'success',
      details: {
        secretName: secret.name,
        versionsDeleted: secret.version,
      },
      requestId: crypto.randomUUID(),
    });
  }

  // ==========================================
  // ROTATION
  // ==========================================

  /**
   * Rotate a secret with a new value
   */
  async rotateSecret(secretId: string, newValue: string, rotatedBy: string): Promise<Secret> {
    return this.updateSecret(secretId, newValue, rotatedBy);
  }

  /**
   * Get secrets that need rotation
   */
  getSecretsNeedingRotation(): Secret[] {
    const now = new Date();
    const secrets: Secret[] = [];

    for (const secret of this.secrets.values()) {
      if (!secret.metadata.rotation?.enabled) continue;

      const nextRotation = secret.metadata.rotation.nextRotationAt;
      if (!nextRotation) continue;

      const rotationDate = new Date(nextRotation);
      const notifyDate = new Date(rotationDate.getTime() - secret.metadata.rotation.notifyBeforeDays * 24 * 60 * 60 * 1000);

      if (now >= notifyDate) {
        secrets.push(this.sanitizeSecret(secret));
      }
    }

    return secrets;
  }

  /**
   * Get expired secrets
   */
  getExpiredSecrets(): Secret[] {
    const now = new Date();
    const secrets: Secret[] = [];

    for (const secret of this.secrets.values()) {
      if (secret.expiresAt && new Date(secret.expiresAt) <= now) {
        secrets.push(this.sanitizeSecret(secret));
      }
    }

    return secrets;
  }

  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  /**
   * Grant access to a secret
   */
  grantAccess(secretId: string, subjectId: string): void {
    if (!this.accessPolicies.has(secretId)) {
      this.accessPolicies.set(secretId, new Set());
    }
    this.accessPolicies.get(secretId)!.add(subjectId);

    const secret = this.secrets.get(secretId);
    if (secret) {
      secret.metadata.accessPolicy = Array.from(this.accessPolicies.get(secretId)!);
    }
  }

  /**
   * Revoke access to a secret
   */
  revokeAccess(secretId: string, subjectId: string): void {
    this.accessPolicies.get(secretId)?.delete(subjectId);

    const secret = this.secrets.get(secretId);
    if (secret) {
      secret.metadata.accessPolicy = Array.from(this.accessPolicies.get(secretId) ?? []);
    }
  }

  /**
   * Check if subject has access
   */
  private checkAccess(secretId: string, subjectId: string): boolean {
    const secret = this.secrets.get(secretId);
    if (!secret) return false;

    // Owner always has access
    if (secret.metadata.owner === subjectId) return true;

    // Check access policy
    const allowedSubjects = this.accessPolicies.get(secretId);
    if (!allowedSubjects || allowedSubjects.size === 0) {
      // No explicit policy, only owner can access
      return false;
    }

    return allowedSubjects.has(subjectId);
  }

  // ==========================================
  // QUERIES
  // ==========================================

  /**
   * List secrets for a tenant
   */
  listSecrets(tenantId: string, subjectId: string): Secret[] {
    const secrets: Secret[] = [];

    for (const secret of this.secrets.values()) {
      if (secret.metadata.tenantId !== tenantId) continue;
      if (!this.checkAccess(secret.id, subjectId) && secret.metadata.owner !== subjectId) continue;

      secrets.push(this.sanitizeSecret(secret));
    }

    return secrets;
  }

  /**
   * Get secret by name
   */
  getSecretByName(name: string, tenantId: string): Secret | undefined {
    for (const secret of this.secrets.values()) {
      if (secret.name === name && secret.metadata.tenantId === tenantId) {
        return this.sanitizeSecret(secret);
      }
    }
    return undefined;
  }

  /**
   * Get secret metadata (without decrypting)
   */
  getSecretMetadata(secretId: string): Secret | undefined {
    const secret = this.secrets.get(secretId);
    if (!secret) return undefined;
    return this.sanitizeSecret(secret);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private sanitizeSecret(secret: Secret): Secret {
    // Return secret without the encrypted value details
    return {
      ...secret,
      encryptedValue: {
        ...secret.encryptedValue,
        ciphertext: '[REDACTED]',
      },
    };
  }

  private startRotationCheck(): void {
    // Check for rotation needs every hour
    this.rotationCheckInterval = setInterval(() => {
      const needsRotation = this.getSecretsNeedingRotation();
      if (needsRotation.length > 0) {
        console.warn('[SecretsManager] Secrets needing rotation:', needsRotation.map(s => s.name));
      }

      const expired = this.getExpiredSecrets();
      if (expired.length > 0) {
        console.error('[SecretsManager] Expired secrets:', expired.map(s => s.name));
      }
    }, 60 * 60 * 1000);
  }

  private emitEvent(event: SecurityAuditEvent): void {
    if (this.eventEmitter) {
      this.eventEmitter(event);
    }
  }

  /**
   * Stop rotation check interval
   */
  destroy(): void {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
      this.rotationCheckInterval = null;
    }
  }

  /**
   * Get statistics
   */
  getStats(): SecretsStats {
    let total = 0;
    let withRotation = 0;
    let expired = 0;
    let needsRotation = 0;
    const now = new Date();

    for (const secret of this.secrets.values()) {
      total++;

      if (secret.metadata.rotation?.enabled) {
        withRotation++;
      }

      if (secret.expiresAt && new Date(secret.expiresAt) <= now) {
        expired++;
      }

      if (secret.metadata.rotation?.nextRotationAt) {
        const rotationDate = new Date(secret.metadata.rotation.nextRotationAt);
        const notifyDate = new Date(rotationDate.getTime() - (secret.metadata.rotation.notifyBeforeDays ?? 7) * 24 * 60 * 60 * 1000);
        if (now >= notifyDate) {
          needsRotation++;
        }
      }
    }

    return { total, withRotation, expired, needsRotation };
  }
}

// ============================================
// TYPES
// ============================================

export interface StoreSecretParams {
  name: string;
  type: 'api_key' | 'password' | 'certificate' | 'token' | 'connection_string' | 'generic';
  value: string;
  metadata: Omit<SecretMetadata, 'rotation'> & { rotation?: Partial<SecretRotation> };
}

export interface SecretsStats {
  total: number;
  withRotation: number;
  expired: number;
  needsRotation: number;
}

export class SecretsError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'SecretsError';
  }
}

// Export singleton
export const secretsManager = new SecretsManager();
