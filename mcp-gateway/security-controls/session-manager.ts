/**
 * FORGE Platform - Session Management
 *
 * @epic 3.6 - Security Controls
 * @description Secure session management with rotation, binding, and timeout
 */

import * as crypto from 'crypto';
import { Session, SessionConfig, SecurityAuditEvent } from './types.js';

// ============================================
// SESSION MANAGER
// ============================================

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private subjectSessions: Map<string, Set<string>> = new Map();
  private config: SessionConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private eventEmitter: ((event: SecurityAuditEvent) => void) | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      maxDurationMs: config.maxDurationMs ?? 24 * 60 * 60 * 1000, // 24 hours
      idleTimeoutMs: config.idleTimeoutMs ?? 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: config.maxConcurrentSessions ?? 5,
      requireMfa: config.requireMfa ?? false,
      bindToIp: config.bindToIp ?? true,
      rotateOnActivity: config.rotateOnActivity ?? true,
      rotationIntervalMs: config.rotationIntervalMs ?? 15 * 60 * 1000, // 15 minutes
    };

    this.startCleanup();
  }

  /**
   * Set event emitter for audit events
   */
  setEventEmitter(emitter: (event: SecurityAuditEvent) => void): void {
    this.eventEmitter = emitter;
  }

  // ==========================================
  // SESSION LIFECYCLE
  // ==========================================

  /**
   * Create a new session
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const { subjectId, subjectType, tenantId, ipAddress, userAgent, mfaVerified } = params;

    // Check MFA requirement
    if (this.config.requireMfa && !mfaVerified) {
      throw new SessionError('MFA_REQUIRED', 'MFA verification is required');
    }

    // Check concurrent session limit
    const existingSessions = this.subjectSessions.get(subjectId);
    if (existingSessions && existingSessions.size >= this.config.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSessionId = this.findOldestSession(subjectId);
      if (oldestSessionId) {
        await this.revokeSession(oldestSessionId, 'Concurrent session limit exceeded');
      }
    }

    // Generate session ID
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      subjectId,
      subjectType,
      tenantId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.config.maxDurationMs).toISOString(),
      lastActivityAt: now.toISOString(),
      ipAddress,
      userAgent,
      mfaVerified: mfaVerified ?? false,
      attributes: params.attributes ?? {},
      revoked: false,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track subject sessions
    if (!this.subjectSessions.has(subjectId)) {
      this.subjectSessions.set(subjectId, new Set());
    }
    this.subjectSessions.get(subjectId)!.add(sessionId);

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      eventType: 'session',
      severity: 'info',
      subject: { id: subjectId, type: subjectType, tenantId },
      action: 'session_created',
      outcome: 'success',
      details: {
        sessionId,
        mfaVerified,
        expiresAt: session.expiresAt,
      },
      ipAddress,
      userAgent,
      requestId: params.requestId ?? crypto.randomUUID(),
    });

    return session;
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<SessionValidation> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (session.revoked) {
      return { valid: false, reason: 'Session has been revoked' };
    }

    const now = new Date();

    // Check expiration
    if (new Date(session.expiresAt) <= now) {
      return { valid: false, reason: 'Session has expired' };
    }

    // Check idle timeout
    const lastActivity = new Date(session.lastActivityAt);
    if (now.getTime() - lastActivity.getTime() > this.config.idleTimeoutMs) {
      return { valid: false, reason: 'Session has timed out due to inactivity' };
    }

    // Check IP binding
    if (this.config.bindToIp && ipAddress && session.ipAddress !== ipAddress) {
      this.emitEvent({
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        eventType: 'session',
        severity: 'warning',
        subject: { id: session.subjectId, type: session.subjectType, tenantId: session.tenantId },
        action: 'session_ip_mismatch',
        outcome: 'failure',
        details: {
          sessionId,
          expectedIp: session.ipAddress,
          actualIp: ipAddress,
        },
        ipAddress,
        requestId: crypto.randomUUID(),
      });
      return { valid: false, reason: 'Session IP address mismatch' };
    }

    // Update last activity
    session.lastActivityAt = now.toISOString();

    // Check if rotation is needed
    const shouldRotate = this.config.rotateOnActivity &&
      (now.getTime() - new Date(session.createdAt).getTime() > this.config.rotationIntervalMs);

    return {
      valid: true,
      session,
      shouldRotate,
    };
  }

  /**
   * Rotate a session (create new ID, keep session data)
   */
  async rotateSession(sessionId: string): Promise<Session> {
    const oldSession = this.sessions.get(sessionId);

    if (!oldSession) {
      throw new SessionError('SESSION_NOT_FOUND', 'Session not found');
    }

    if (oldSession.revoked) {
      throw new SessionError('SESSION_REVOKED', 'Cannot rotate a revoked session');
    }

    const now = new Date();
    const newSessionId = this.generateSessionId();

    // Create new session with same data
    const newSession: Session = {
      ...oldSession,
      id: newSessionId,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    };

    // Remove old session
    this.sessions.delete(sessionId);
    this.subjectSessions.get(oldSession.subjectId)?.delete(sessionId);

    // Add new session
    this.sessions.set(newSessionId, newSession);
    this.subjectSessions.get(oldSession.subjectId)?.add(newSessionId);

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      eventType: 'session',
      severity: 'info',
      subject: { id: newSession.subjectId, type: newSession.subjectType, tenantId: newSession.tenantId },
      action: 'session_rotated',
      outcome: 'success',
      details: {
        oldSessionId: sessionId,
        newSessionId,
      },
      ipAddress: newSession.ipAddress,
      requestId: crypto.randomUUID(),
    });

    return newSession;
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SessionError('SESSION_NOT_FOUND', 'Session not found');
    }

    const now = new Date();

    session.revoked = true;
    session.revokedAt = now.toISOString();
    session.revokedReason = reason;

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      eventType: 'session',
      severity: 'info',
      subject: { id: session.subjectId, type: session.subjectType, tenantId: session.tenantId },
      action: 'session_revoked',
      outcome: 'success',
      details: {
        sessionId,
        reason,
      },
      ipAddress: session.ipAddress,
      requestId: crypto.randomUUID(),
    });
  }

  /**
   * Revoke all sessions for a subject
   */
  async revokeAllSessions(subjectId: string, reason?: string): Promise<number> {
    const sessionIds = this.subjectSessions.get(subjectId);
    if (!sessionIds) return 0;

    let count = 0;
    for (const sessionId of sessionIds) {
      try {
        await this.revokeSession(sessionId, reason);
        count++;
      } catch {
        // Session may already be expired/removed
      }
    }

    return count;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a subject
   */
  getSubjectSessions(subjectId: string): Session[] {
    const sessionIds = this.subjectSessions.get(subjectId);
    if (!sessionIds) return [];

    const sessions: Session[] = [];
    for (const id of sessionIds) {
      const session = this.sessions.get(id);
      if (session && !session.revoked) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  // ==========================================
  // SESSION ATTRIBUTES
  // ==========================================

  /**
   * Set session attribute
   */
  setAttribute(sessionId: string, key: string, value: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError('SESSION_NOT_FOUND', 'Session not found');
    }
    session.attributes[key] = value;
  }

  /**
   * Get session attribute
   */
  getAttribute(sessionId: string, key: string): unknown {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return session.attributes[key];
  }

  /**
   * Remove session attribute
   */
  removeAttribute(sessionId: string, key: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      delete session.attributes[key];
    }
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  private startCleanup(): void {
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const isExpired = new Date(session.expiresAt) <= now;
      const isIdle = now.getTime() - new Date(session.lastActivityAt).getTime() > this.config.idleTimeoutMs;

      if (session.revoked || isExpired || isIdle) {
        expiredIds.push(sessionId);
      }
    }

    for (const sessionId of expiredIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        this.subjectSessions.get(session.subjectId)?.delete(sessionId);
      }
    }
  }

  private findOldestSession(subjectId: string): string | undefined {
    const sessionIds = this.subjectSessions.get(subjectId);
    if (!sessionIds || sessionIds.size === 0) return undefined;

    let oldestId: string | undefined;
    let oldestTime = Infinity;

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && !session.revoked) {
        const createdTime = new Date(session.createdAt).getTime();
        if (createdTime < oldestTime) {
          oldestTime = createdTime;
          oldestId = sessionId;
        }
      }
    }

    return oldestId;
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private emitEvent(event: SecurityAuditEvent): void {
    if (this.eventEmitter) {
      this.eventEmitter(event);
    }
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    let active = 0;
    let revoked = 0;
    let expired = 0;
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.revoked) {
        revoked++;
      } else if (new Date(session.expiresAt) <= now) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.sessions.size,
      active,
      revoked,
      expired,
      uniqueSubjects: this.subjectSessions.size,
    };
  }
}

// ============================================
// TYPES
// ============================================

export interface CreateSessionParams {
  subjectId: string;
  subjectType: 'user' | 'service' | 'agent';
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified?: boolean;
  attributes?: Record<string, unknown>;
  requestId?: string;
}

export interface SessionValidation {
  valid: boolean;
  reason?: string;
  session?: Session;
  shouldRotate?: boolean;
}

export interface SessionStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  uniqueSubjects: number;
}

export class SessionError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

// Export singleton
export const sessionManager = new SessionManager();
