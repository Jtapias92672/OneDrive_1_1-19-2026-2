/**
 * MCP Security Gateway - Audit Log Retention
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.10 - Log Retention
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Manages audit log retention, archival, and purging.
 *   Implements 7-year retention requirement for DCMA compliance.
 *
 * @compliance
 *   - DCMA 252.204-7012: 7-year retention requirement
 *   - NIST SP 800-53: AU-11 Audit Record Retention
 *   - SOC 2: Log retention controls
 */

import * as crypto from 'crypto';
import type { AuditLogEntry } from './audit-logger.js';

// ============================================
// TYPES
// ============================================

/**
 * Retention tier configuration
 */
export interface RetentionTier {
  /** Tier name */
  name: string;

  /** Tier ID */
  id: string;

  /** Hot storage duration (days) - immediate access */
  hotDays: number;

  /** Warm storage duration (days) - slower access */
  warmDays: number;

  /** Cold storage duration (days) - archived */
  coldDays: number;

  /** Total retention (days) - must meet compliance minimum */
  totalDays: number;

  /** Compression enabled */
  compress: boolean;

  /** Encryption required */
  encrypt: boolean;
}

/**
 * Storage location types
 */
export type StorageLocation = 'HOT' | 'WARM' | 'COLD' | 'ARCHIVE' | 'PURGED';

/**
 * Archived log batch
 */
export interface ArchivedBatch {
  /** Batch ID */
  id: string;

  /** Creation timestamp */
  createdAt: string;

  /** Start of period covered */
  periodStart: string;

  /** End of period covered */
  periodEnd: string;

  /** Number of entries */
  entryCount: number;

  /** Total size (bytes) */
  sizeBytes: number;

  /** Compressed size (if applicable) */
  compressedSizeBytes?: number;

  /** SHA-256 hash of contents */
  contentHash: string;

  /** Current storage location */
  location: StorageLocation;

  /** Encryption key ID (if encrypted) */
  encryptionKeyId?: string;

  /** Storage URI */
  storageUri?: string;

  /** Retention tier used */
  retentionTier: string;

  /** Scheduled purge date */
  scheduledPurgeDate: string;

  /** Chain verification hash (first entry's previous hash) */
  chainStartHash: string;

  /** Chain verification hash (last entry's hash) */
  chainEndHash: string;
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  /** Policy ID */
  id: string;

  /** Policy name */
  name: string;

  /** Event types this policy applies to */
  eventTypes: string[];

  /** Retention tier to use */
  retentionTier: string;

  /** Override: minimum retention days */
  minRetentionDays?: number;

  /** Legal hold enabled (prevent purging) */
  legalHold: boolean;

  /** Compliance framework */
  complianceFramework?: 'DCMA' | 'HIPAA' | 'SOX' | 'GDPR' | 'PCI';
}

/**
 * Retention status for an entry
 */
export interface RetentionStatus {
  /** Entry ID */
  entryId: string;

  /** Current storage location */
  location: StorageLocation;

  /** Days until next transition */
  daysUntilTransition: number;

  /** Next storage location */
  nextLocation?: StorageLocation;

  /** Days until purge */
  daysUntilPurge: number;

  /** Applied retention policy */
  policy: string;

  /** Legal hold active */
  legalHold: boolean;

  /** Archive batch ID (if archived) */
  archiveBatchId?: string;
}

/**
 * Retention manager configuration
 */
export interface RetentionManagerConfig {
  /** Default retention tier */
  defaultTier: string;

  /** Available retention tiers */
  tiers: RetentionTier[];

  /** Retention policies */
  policies: RetentionPolicy[];

  /** Archive batch size (number of entries) */
  batchSize: number;

  /** Archive callback */
  onArchive?: (batch: ArchivedBatch, entries: AuditLogEntry[]) => Promise<string>;

  /** Retrieve archived batch callback */
  onRetrieve?: (batchId: string) => Promise<AuditLogEntry[]>;

  /** Purge callback */
  onPurge?: (batch: ArchivedBatch) => Promise<void>;

  /** Transition callback */
  onTransition?: (batch: ArchivedBatch, from: StorageLocation, to: StorageLocation) => Promise<void>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * DCMA compliance requires 7-year (2555 day) minimum retention
 */
const DCMA_MINIMUM_RETENTION_DAYS = 2555;

const DEFAULT_TIERS: RetentionTier[] = [
  {
    name: 'Standard',
    id: 'standard',
    hotDays: 30,
    warmDays: 90,
    coldDays: 365,
    totalDays: DCMA_MINIMUM_RETENTION_DAYS,
    compress: true,
    encrypt: true,
  },
  {
    name: 'High Security',
    id: 'high-security',
    hotDays: 90,
    warmDays: 180,
    coldDays: 730,
    totalDays: DCMA_MINIMUM_RETENTION_DAYS + 365, // 8 years
    compress: true,
    encrypt: true,
  },
  {
    name: 'Legal Hold',
    id: 'legal-hold',
    hotDays: 365,
    warmDays: 730,
    coldDays: -1, // Indefinite
    totalDays: -1, // Indefinite
    compress: true,
    encrypt: true,
  },
];

const DEFAULT_POLICIES: RetentionPolicy[] = [
  {
    id: 'security-events',
    name: 'Security Events',
    eventTypes: ['SECURITY_ALERT', 'TOOL_BLOCKED', 'ACCESS_DENIED', 'INTRUSION_DETECTED'],
    retentionTier: 'high-security',
    legalHold: false,
    complianceFramework: 'DCMA',
  },
  {
    id: 'tool-invocations',
    name: 'Tool Invocations',
    eventTypes: ['TOOL_INVOCATION', 'TOOL_RESULT'],
    retentionTier: 'standard',
    legalHold: false,
    complianceFramework: 'DCMA',
  },
  {
    id: 'approval-events',
    name: 'Approval Events',
    eventTypes: ['APPROVAL_REQUESTED', 'APPROVAL_GRANTED', 'APPROVAL_DENIED'],
    retentionTier: 'high-security',
    legalHold: false,
    complianceFramework: 'DCMA',
  },
];

// ============================================
// RETENTION MANAGER
// ============================================

/**
 * Retention Manager
 *
 * Manages audit log retention lifecycle including archival,
 * storage transitions, and compliant purging.
 */
export class RetentionManager {
  private config: RetentionManagerConfig;
  private archivedBatches: Map<string, ArchivedBatch> = new Map();
  private entryLocationMap: Map<string, { location: StorageLocation; batchId?: string }> = new Map();
  private legalHolds: Set<string> = new Set();

  constructor(config?: Partial<RetentionManagerConfig>) {
    this.config = {
      defaultTier: 'standard',
      tiers: DEFAULT_TIERS,
      policies: DEFAULT_POLICIES,
      batchSize: 1000,
      ...config,
    };

    // Validate tiers meet DCMA minimum
    for (const tier of this.config.tiers) {
      if (tier.totalDays !== -1 && tier.totalDays < DCMA_MINIMUM_RETENTION_DAYS) {
        console.warn(
          `Retention tier "${tier.name}" has ${tier.totalDays} days retention, ` +
          `which is below DCMA minimum of ${DCMA_MINIMUM_RETENTION_DAYS} days`
        );
      }
    }
  }

  /**
   * Archive entries to storage
   */
  async archiveEntries(entries: AuditLogEntry[]): Promise<ArchivedBatch> {
    if (entries.length === 0) {
      throw new Error('Cannot archive empty entry set');
    }

    const now = new Date();
    const batchId = this.generateBatchId();

    // Sort entries by timestamp
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Determine retention tier based on policies
    const tier = this.determineTier(sortedEntries);

    // Calculate content hash
    const contentHash = this.computeContentHash(sortedEntries);

    // Serialize entries
    const serialized = JSON.stringify(sortedEntries);
    const sizeBytes = Buffer.byteLength(serialized, 'utf-8');

    // Calculate scheduled purge date
    const scheduledPurgeDate = tier.totalDays === -1
      ? 'INDEFINITE'
      : new Date(now.getTime() + tier.totalDays * 24 * 60 * 60 * 1000).toISOString();

    const batch: ArchivedBatch = {
      id: batchId,
      createdAt: now.toISOString(),
      periodStart: sortedEntries[0]!.timestamp,
      periodEnd: sortedEntries[sortedEntries.length - 1]!.timestamp,
      entryCount: sortedEntries.length,
      sizeBytes,
      contentHash,
      location: 'HOT',
      retentionTier: tier.id,
      scheduledPurgeDate,
      chainStartHash: sortedEntries[0]!.previousHash || 'GENESIS',
      chainEndHash: sortedEntries[sortedEntries.length - 1]!.hash,
    };

    // Call archive callback if provided
    if (this.config.onArchive) {
      const storageUri = await this.config.onArchive(batch, sortedEntries);
      batch.storageUri = storageUri;
    }

    // Store batch metadata
    this.archivedBatches.set(batchId, batch);

    // Update entry location map
    for (const entry of sortedEntries) {
      this.entryLocationMap.set(entry.id, { location: 'HOT', batchId });
    }

    return batch;
  }

  /**
   * Get retention status for an entry
   */
  getRetentionStatus(entryId: string, entryTimestamp: string, eventType: string): RetentionStatus {
    const locationInfo = this.entryLocationMap.get(entryId);
    const policy = this.getPolicyForEventType(eventType);
    const tier = this.getTier(policy.retentionTier);

    const entryDate = new Date(entryTimestamp);
    const now = new Date();
    const ageDays = Math.floor((now.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000));

    // Determine current and next location based on age
    let currentLocation: StorageLocation = locationInfo?.location || 'HOT';
    let nextLocation: StorageLocation | undefined;
    let daysUntilTransition = 0;

    if (ageDays < tier.hotDays) {
      currentLocation = 'HOT';
      nextLocation = 'WARM';
      daysUntilTransition = tier.hotDays - ageDays;
    } else if (ageDays < tier.hotDays + tier.warmDays) {
      currentLocation = 'WARM';
      nextLocation = 'COLD';
      daysUntilTransition = (tier.hotDays + tier.warmDays) - ageDays;
    } else if (tier.coldDays === -1 || ageDays < tier.hotDays + tier.warmDays + tier.coldDays) {
      currentLocation = 'COLD';
      nextLocation = 'ARCHIVE';
      daysUntilTransition = tier.coldDays === -1 ? -1 : (tier.hotDays + tier.warmDays + tier.coldDays) - ageDays;
    } else {
      currentLocation = 'ARCHIVE';
      nextLocation = 'PURGED';
      daysUntilTransition = tier.totalDays === -1 ? -1 : tier.totalDays - ageDays;
    }

    const daysUntilPurge = tier.totalDays === -1 ? -1 : Math.max(0, tier.totalDays - ageDays);
    const legalHold = this.legalHolds.has(entryId) || policy.legalHold;

    return {
      entryId,
      location: currentLocation,
      daysUntilTransition,
      nextLocation,
      daysUntilPurge,
      policy: policy.id,
      legalHold,
      archiveBatchId: locationInfo?.batchId,
    };
  }

  /**
   * Transition entries to next storage tier
   */
  async transitionEntries(): Promise<{ transitioned: number; errors: string[] }> {
    const now = new Date();
    const transitioned: ArchivedBatch[] = [];
    const errors: string[] = [];

    for (const batch of this.archivedBatches.values()) {
      if (batch.location === 'PURGED') continue;

      const tier = this.getTier(batch.retentionTier);
      const batchDate = new Date(batch.createdAt);
      const ageDays = Math.floor((now.getTime() - batchDate.getTime()) / (24 * 60 * 60 * 1000));

      let targetLocation: StorageLocation | undefined;

      if (batch.location === 'HOT' && ageDays >= tier.hotDays) {
        targetLocation = 'WARM';
      } else if (batch.location === 'WARM' && ageDays >= tier.hotDays + tier.warmDays) {
        targetLocation = 'COLD';
      } else if (batch.location === 'COLD' && tier.coldDays !== -1 && ageDays >= tier.hotDays + tier.warmDays + tier.coldDays) {
        targetLocation = 'ARCHIVE';
      }

      if (targetLocation && targetLocation !== batch.location) {
        try {
          if (this.config.onTransition) {
            await this.config.onTransition(batch, batch.location, targetLocation);
          }

          const previousLocation = batch.location;
          batch.location = targetLocation;

          // Update entry locations
          for (const [entryId, info] of this.entryLocationMap) {
            if (info.batchId === batch.id) {
              info.location = targetLocation;
            }
          }

          transitioned.push(batch);
        } catch (error) {
          errors.push(`Failed to transition batch ${batch.id}: ${error}`);
        }
      }
    }

    return { transitioned: transitioned.length, errors };
  }

  /**
   * Purge expired entries
   */
  async purgeExpiredEntries(): Promise<{ purged: number; errors: string[] }> {
    const now = new Date();
    const purged: ArchivedBatch[] = [];
    const errors: string[] = [];

    for (const batch of this.archivedBatches.values()) {
      if (batch.location === 'PURGED') continue;
      if (batch.scheduledPurgeDate === 'INDEFINITE') continue;

      const purgeDate = new Date(batch.scheduledPurgeDate);
      if (now >= purgeDate) {
        // Check for legal holds on any entries in this batch
        let hasLegalHold = false;
        for (const [entryId, info] of this.entryLocationMap) {
          if (info.batchId === batch.id && this.legalHolds.has(entryId)) {
            hasLegalHold = true;
            break;
          }
        }

        if (hasLegalHold) {
          errors.push(`Batch ${batch.id} has entries under legal hold, skipping purge`);
          continue;
        }

        try {
          if (this.config.onPurge) {
            await this.config.onPurge(batch);
          }

          batch.location = 'PURGED';

          // Update entry locations
          for (const [entryId, info] of this.entryLocationMap) {
            if (info.batchId === batch.id) {
              info.location = 'PURGED';
            }
          }

          purged.push(batch);
        } catch (error) {
          errors.push(`Failed to purge batch ${batch.id}: ${error}`);
        }
      }
    }

    return { purged: purged.length, errors };
  }

  /**
   * Apply legal hold to entries
   */
  applyLegalHold(entryIds: string[], reason: string): void {
    for (const entryId of entryIds) {
      this.legalHolds.add(entryId);
    }
  }

  /**
   * Remove legal hold from entries
   */
  removeLegalHold(entryIds: string[], reason: string): void {
    for (const entryId of entryIds) {
      this.legalHolds.delete(entryId);
    }
  }

  /**
   * Check if entry is under legal hold
   */
  isUnderLegalHold(entryId: string): boolean {
    return this.legalHolds.has(entryId);
  }

  /**
   * Retrieve archived entries
   */
  async retrieveArchivedEntries(batchId: string): Promise<AuditLogEntry[]> {
    const batch = this.archivedBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    if (batch.location === 'PURGED') {
      throw new Error(`Batch ${batchId} has been purged`);
    }

    if (this.config.onRetrieve) {
      return await this.config.onRetrieve(batchId);
    }

    throw new Error('No retrieval callback configured');
  }

  /**
   * Get all archived batches
   */
  getArchivedBatches(): ArchivedBatch[] {
    return Array.from(this.archivedBatches.values());
  }

  /**
   * Get batches by location
   */
  getBatchesByLocation(location: StorageLocation): ArchivedBatch[] {
    return Array.from(this.archivedBatches.values()).filter((b) => b.location === location);
  }

  /**
   * Get retention statistics
   */
  getStatistics(): {
    totalBatches: number;
    totalEntries: number;
    totalSizeBytes: number;
    byLocation: Record<StorageLocation, { batches: number; entries: number; sizeBytes: number }>;
    legalHolds: number;
  } {
    const stats = {
      totalBatches: 0,
      totalEntries: 0,
      totalSizeBytes: 0,
      byLocation: {} as Record<StorageLocation, { batches: number; entries: number; sizeBytes: number }>,
      legalHolds: this.legalHolds.size,
    };

    const locations: StorageLocation[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE', 'PURGED'];
    for (const loc of locations) {
      stats.byLocation[loc] = { batches: 0, entries: 0, sizeBytes: 0 };
    }

    for (const batch of this.archivedBatches.values()) {
      stats.totalBatches++;
      stats.totalEntries += batch.entryCount;
      stats.totalSizeBytes += batch.sizeBytes;

      const locStats = stats.byLocation[batch.location]!;
      locStats.batches++;
      locStats.entries += batch.entryCount;
      locStats.sizeBytes += batch.sizeBytes;
    }

    return stats;
  }

  /**
   * Verify retention compliance
   */
  verifyCompliance(): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check all tiers meet DCMA minimum
    for (const tier of this.config.tiers) {
      if (tier.totalDays !== -1 && tier.totalDays < DCMA_MINIMUM_RETENTION_DAYS) {
        issues.push(
          `Tier "${tier.name}" retention of ${tier.totalDays} days is below DCMA minimum of ${DCMA_MINIMUM_RETENTION_DAYS} days`
        );
      }
    }

    // Check all policies have valid tiers
    for (const policy of this.config.policies) {
      const tier = this.config.tiers.find((t) => t.id === policy.retentionTier);
      if (!tier) {
        issues.push(`Policy "${policy.name}" references unknown tier "${policy.retentionTier}"`);
      }
    }

    // Check for batches approaching purge
    const now = new Date();
    for (const batch of this.archivedBatches.values()) {
      if (batch.scheduledPurgeDate !== 'INDEFINITE') {
        const purgeDate = new Date(batch.scheduledPurgeDate);
        const daysUntilPurge = Math.floor((purgeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysUntilPurge <= 30 && daysUntilPurge > 0) {
          recommendations.push(
            `Batch ${batch.id} will be purged in ${daysUntilPurge} days - ensure compliance requirements are met`
          );
        }
      }
    }

    // Check encryption is enabled for all tiers
    for (const tier of this.config.tiers) {
      if (!tier.encrypt) {
        recommendations.push(`Tier "${tier.name}" does not have encryption enabled - recommended for DCMA compliance`);
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Add retention policy
   */
  addPolicy(policy: RetentionPolicy): void {
    this.config.policies = this.config.policies.filter((p) => p.id !== policy.id);
    this.config.policies.push(policy);
  }

  /**
   * Add retention tier
   */
  addTier(tier: RetentionTier): void {
    this.config.tiers = this.config.tiers.filter((t) => t.id !== tier.id);
    this.config.tiers.push(tier);
  }

  /**
   * Get tier by ID
   */
  private getTier(tierId: string): RetentionTier {
    const tier = this.config.tiers.find((t) => t.id === tierId);
    if (!tier) {
      return this.config.tiers.find((t) => t.id === this.config.defaultTier)!;
    }
    return tier;
  }

  /**
   * Get policy for event type
   */
  private getPolicyForEventType(eventType: string): RetentionPolicy {
    const policy = this.config.policies.find((p) => p.eventTypes.includes(eventType));
    if (!policy) {
      // Return default policy
      return {
        id: 'default',
        name: 'Default',
        eventTypes: [],
        retentionTier: this.config.defaultTier,
        legalHold: false,
      };
    }
    return policy;
  }

  /**
   * Determine retention tier for entries
   */
  private determineTier(entries: AuditLogEntry[]): RetentionTier {
    // Use the most restrictive tier among all entries
    let mostRestrictiveTier: RetentionTier | null = null;

    for (const entry of entries) {
      const policy = this.getPolicyForEventType(entry.eventType);
      const tier = this.getTier(policy.retentionTier);

      if (!mostRestrictiveTier || this.isMoreRestrictive(tier, mostRestrictiveTier)) {
        mostRestrictiveTier = tier;
      }
    }

    return mostRestrictiveTier || this.getTier(this.config.defaultTier);
  }

  /**
   * Compare tier restrictiveness
   */
  private isMoreRestrictive(a: RetentionTier, b: RetentionTier): boolean {
    // Indefinite retention is most restrictive
    if (a.totalDays === -1) return true;
    if (b.totalDays === -1) return false;

    // Longer retention is more restrictive
    return a.totalDays > b.totalDays;
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `batch_${timestamp}_${random}`;
  }

  /**
   * Compute content hash
   */
  private computeContentHash(entries: AuditLogEntry[]): string {
    const content = JSON.stringify(entries);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// ============================================
// EXPORTS
// ============================================

export default RetentionManager;
