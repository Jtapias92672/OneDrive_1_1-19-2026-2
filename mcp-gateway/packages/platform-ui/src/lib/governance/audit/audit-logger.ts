/**
 * Audit Logger
 * Provides immutable logging with hash chain integrity
 */

import {
  AuditEvent,
  AuditEventType,
  AuditActor,
  AuditQuery,
  AuditExport,
  AuditStats,
  LogOptions,
} from './types';
import { auditStore } from './audit-store';
import { HashChain, hashChain } from './hash-chain';

export class AuditLogger {
  constructor(
    private store = auditStore,
    private chain = hashChain
  ) {}

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    actor: AuditActor,
    action: string,
    options?: LogOptions
  ): Promise<AuditEvent> {
    // 1. Get last event hash (or genesis)
    const lastEvent = await this.store.getLastEvent();
    const previousHash = lastEvent?.eventHash || HashChain.GENESIS_HASH;

    // 2. Build event
    const event: Omit<AuditEvent, 'eventHash'> = {
      id: this.generateId(),
      eventType,
      actor,
      action,
      resource: options?.resource,
      details: options?.details || {},
      riskLevel: options?.riskLevel,
      workflowId: options?.workflowId,
      previousHash,
      createdAt: new Date(),
    };

    // 3. Compute hash
    const eventHash = await this.chain.computeHash(event, previousHash);

    // 4. Store (immutable - no updates allowed)
    const fullEvent: AuditEvent = { ...event, eventHash };
    await this.store.insert(fullEvent);

    return fullEvent;
  }

  /**
   * Query audit events
   */
  async query(query: AuditQuery): Promise<AuditEvent[]> {
    return this.store.query(query);
  }

  /**
   * Get events for a specific workflow
   */
  async getWorkflowEvents(workflowId: string): Promise<AuditEvent[]> {
    return this.store.query({ workflowId });
  }

  /**
   * Export events with integrity verification
   */
  async export(
    query: AuditQuery,
    format: 'csv' | 'json'
  ): Promise<AuditExport> {
    const events = await this.store.query(query);
    const verification = await this.chain.verify(events);

    return {
      format,
      events,
      exportedAt: new Date(),
      query,
      integrityVerified: verification.valid,
    };
  }

  /**
   * Verify the entire audit chain
   */
  async verifyIntegrity(): Promise<{ valid: boolean; brokenAt?: number; message: string }> {
    const allEvents = await this.store.getAll();
    return this.chain.verify(allEvents);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<AuditStats> {
    return this.store.getStats();
  }

  /**
   * Reset (for testing only)
   */
  reset(): void {
    this.store.reset();
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const auditLogger = new AuditLogger();
