/**
 * Audit Store
 * In-memory store for audit events (append-only)
 */

import { AuditEvent, AuditQuery, AuditStats } from './types';

class AuditStore {
  private events: AuditEvent[] = [];

  /**
   * Insert a new event (immutable - no updates)
   */
  async insert(event: AuditEvent): Promise<void> {
    this.events.push({ ...event });
  }

  /**
   * Get the last event (for hash chain)
   */
  async getLastEvent(): Promise<AuditEvent | null> {
    if (this.events.length === 0) return null;
    return { ...this.events[this.events.length - 1] };
  }

  /**
   * Get event by ID
   */
  async getById(id: string): Promise<AuditEvent | null> {
    const event = this.events.find((e) => e.id === id);
    return event ? { ...event } : null;
  }

  /**
   * Query events with filters
   */
  async query(query: AuditQuery): Promise<AuditEvent[]> {
    let result = [...this.events];

    if (query.startDate) {
      result = result.filter((e) => e.createdAt >= query.startDate!);
    }

    if (query.endDate) {
      result = result.filter((e) => e.createdAt <= query.endDate!);
    }

    if (query.actorId) {
      result = result.filter((e) => e.actor.id === query.actorId);
    }

    if (query.actorType) {
      result = result.filter((e) => e.actor.type === query.actorType);
    }

    if (query.eventType) {
      result = result.filter((e) => e.eventType === query.eventType);
    }

    if (query.workflowId) {
      result = result.filter((e) => e.workflowId === query.workflowId);
    }

    if (query.riskLevel) {
      result = result.filter((e) => e.riskLevel === query.riskLevel);
    }

    // Sort by createdAt ascending for hash chain order
    result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? result.length;

    return result.slice(offset, offset + limit).map((e) => ({ ...e }));
  }

  /**
   * Get all events in order (for verification)
   */
  async getAll(): Promise<AuditEvent[]> {
    return [...this.events]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((e) => ({ ...e }));
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<AuditStats> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsByType: Record<string, number> = {};
    const eventsByRiskLevel: Record<string, number> = {};
    let recentEvents = 0;

    for (const event of this.events) {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      // Count by risk level
      if (event.riskLevel) {
        eventsByRiskLevel[event.riskLevel] =
          (eventsByRiskLevel[event.riskLevel] || 0) + 1;
      }

      // Count recent
      if (event.createdAt >= oneDayAgo) {
        recentEvents++;
      }
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByRiskLevel,
      recentEvents,
    };
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    this.events = [];
  }
}

export const auditStore = new AuditStore();
