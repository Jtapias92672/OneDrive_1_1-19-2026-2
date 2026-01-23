/**
 * FORGE Platform - Security Controls Module
 *
 * @epic 3.6 - Security Controls
 * @description Comprehensive security controls for MCP Gateway
 *
 * Components:
 * - Access Control (RBAC/ABAC)
 * - Session Management
 * - Cryptographic Services
 * - Secrets Management
 * - Threat Detection
 * - Security Headers
 */

// Types
export * from './types.js';

// Access Control
export {
  AccessControlEngine,
  accessControl,
} from './access-control.js';

// Session Management
export {
  SessionManager,
  sessionManager,
  SessionError,
  type CreateSessionParams,
  type SessionValidation,
  type SessionStats,
} from './session-manager.js';

// Cryptographic Services
export {
  CryptoService,
  cryptoService,
  CryptoError,
} from './crypto-service.js';

// Secrets Management
export {
  SecretsManager,
  secretsManager,
  SecretsError,
  type StoreSecretParams,
  type SecretsStats,
} from './secrets-manager.js';

// Threat Detection
export {
  ThreatDetector,
  threatDetector,
  type ThreatDetectorConfig,
  type SecurityRequest,
  type ThreatStats,
} from './threat-detector.js';

// Security Headers
export {
  SecurityHeadersManager,
  securityHeaders,
  createSecurityHeadersMiddleware,
  type SecurityHeadersConfig,
  type CSPConfig,
  type HSTSConfig,
  type CORSValidation,
} from './security-headers.js';

// ============================================
// UNIFIED SECURITY CONTEXT
// ============================================

import { AccessControlEngine } from './access-control.js';
import { SessionManager } from './session-manager.js';
import { CryptoService } from './crypto-service.js';
import { SecretsManager } from './secrets-manager.js';
import { ThreatDetector } from './threat-detector.js';
import { SecurityHeadersManager } from './security-headers.js';
import { SecurityAuditEvent, AccessRequest, AccessDecision, Session } from './types.js';

/**
 * Unified Security Context
 *
 * Provides a single entry point for all security operations
 */
export class SecurityContext {
  public readonly accessControl: AccessControlEngine;
  public readonly sessions: SessionManager;
  public readonly crypto: CryptoService;
  public readonly secrets: SecretsManager;
  public readonly threats: ThreatDetector;
  public readonly headers: SecurityHeadersManager;

  private auditLog: SecurityAuditEvent[] = [];
  private maxAuditEntries = 10000;

  constructor(config: SecurityContextConfig = {}) {
    this.accessControl = new AccessControlEngine();
    this.sessions = new SessionManager(config.session);
    this.crypto = new CryptoService();
    this.secrets = new SecretsManager();
    this.threats = new ThreatDetector(config.threatDetection);
    this.headers = new SecurityHeadersManager(config.headers);

    // Wire up audit event collection
    const auditEmitter = (event: SecurityAuditEvent) => this.recordAuditEvent(event);
    this.sessions.setEventEmitter(auditEmitter);
    this.secrets.setEventEmitter(auditEmitter);
    this.threats.setEventEmitter(auditEmitter);
  }

  /**
   * Authenticate and authorize a request
   */
  async authenticateAndAuthorize(params: AuthParams): Promise<AuthResult> {
    const { sessionId, ipAddress, accessRequest } = params;

    // Validate session
    const sessionValidation = await this.sessions.validateSession(sessionId, ipAddress);
    if (!sessionValidation.valid) {
      return {
        authenticated: false,
        authorized: false,
        reason: sessionValidation.reason ?? 'Session validation failed',
      };
    }

    // Check for threats
    const threatResponse = this.threats.analyzeRequest({
      ipAddress,
      userId: sessionValidation.session?.subjectId,
      sessionId,
      path: accessRequest.context.additionalContext?.path as string ?? '/unknown',
      method: accessRequest.context.additionalContext?.method as string ?? 'GET',
    });

    if (threatResponse.action === 'block') {
      return {
        authenticated: true,
        authorized: false,
        reason: threatResponse.reason,
        threatDetected: true,
      };
    }

    // Evaluate access control
    const accessDecision = this.accessControl.evaluate(accessRequest);

    // Rotate session if needed
    let newSession: Session | undefined;
    if (sessionValidation.shouldRotate && sessionValidation.session) {
      newSession = await this.sessions.rotateSession(sessionId);
    }

    return {
      authenticated: true,
      authorized: accessDecision.allowed,
      reason: accessDecision.reason,
      session: newSession ?? sessionValidation.session,
      accessDecision,
      threatResponse: threatResponse.action !== 'allow' ? threatResponse : undefined,
    };
  }

  /**
   * Record an audit event
   */
  private recordAuditEvent(event: SecurityAuditEvent): void {
    this.auditLog.push(event);

    // Trim if too many entries
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filter?: AuditFilter): SecurityAuditEvent[] {
    let events = [...this.auditLog];

    if (filter?.eventType) {
      events = events.filter(e => e.eventType === filter.eventType);
    }

    if (filter?.severity) {
      events = events.filter(e => e.severity === filter.severity);
    }

    if (filter?.subjectId) {
      events = events.filter(e => e.subject.id === filter.subjectId);
    }

    if (filter?.startTime) {
      events = events.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      events = events.filter(e => e.timestamp <= filter.endTime!);
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  /**
   * Get security statistics
   */
  getStats(): SecurityStats {
    return {
      sessions: this.sessions.getStats(),
      secrets: this.secrets.getStats(),
      threats: this.threats.getStats(),
      auditEvents: this.auditLog.length,
      activeKeys: this.crypto.getActiveKeys(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.sessions.destroy();
    this.secrets.destroy();
  }
}

// ============================================
// TYPES
// ============================================

export interface SecurityContextConfig {
  session?: Partial<import('./types.js').SessionConfig>;
  threatDetection?: Partial<import('./threat-detector.js').ThreatDetectorConfig>;
  headers?: Partial<import('./security-headers.js').SecurityHeadersConfig>;
}

export interface AuthParams {
  sessionId: string;
  ipAddress: string;
  accessRequest: AccessRequest;
}

export interface AuthResult {
  authenticated: boolean;
  authorized: boolean;
  reason: string;
  session?: Session;
  accessDecision?: AccessDecision;
  threatResponse?: import('./types.js').ThreatResponse;
  threatDetected?: boolean;
}

export interface AuditFilter {
  eventType?: string;
  severity?: string;
  subjectId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface SecurityStats {
  sessions: import('./session-manager.js').SessionStats;
  secrets: import('./secrets-manager.js').SecretsStats;
  threats: import('./threat-detector.js').ThreatStats;
  auditEvents: number;
  activeKeys: {
    encryption: import('./types.js').EncryptionKey[];
    signing: import('./types.js').SigningKey[];
  };
}

// Export default context
export const securityContext = new SecurityContext();
