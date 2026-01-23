/**
 * FORGE Platform - Threat Detection
 *
 * @epic 3.6 - Security Controls
 * @description Real-time threat detection and response
 */

import * as crypto from 'crypto';
import { ThreatSignal, ThreatType, ThreatIndicator, ThreatResponse, SecurityAuditEvent } from './types.js';

// ============================================
// THREAT DETECTOR
// ============================================

export class ThreatDetector {
  private signals: Map<string, ThreatSignal> = new Map();
  private ipReputation: Map<string, IPReputation> = new Map();
  private userBehavior: Map<string, UserBehaviorProfile> = new Map();
  private eventEmitter: ((event: SecurityAuditEvent) => void) | null = null;
  private config: ThreatDetectorConfig;

  constructor(config: Partial<ThreatDetectorConfig> = {}) {
    this.config = {
      bruteForceThreshold: config.bruteForceThreshold ?? 5,
      bruteForceWindowMs: config.bruteForceWindowMs ?? 5 * 60 * 1000,
      rateLimitThreshold: config.rateLimitThreshold ?? 100,
      rateLimitWindowMs: config.rateLimitWindowMs ?? 60 * 1000,
      suspiciousPatterns: config.suspiciousPatterns ?? DEFAULT_SUSPICIOUS_PATTERNS,
      blockDurationMs: config.blockDurationMs ?? 15 * 60 * 1000,
      enableAutoBlock: config.enableAutoBlock ?? true,
    };
  }

  /**
   * Set event emitter for audit events
   */
  setEventEmitter(emitter: (event: SecurityAuditEvent) => void): void {
    this.eventEmitter = emitter;
  }

  // ==========================================
  // THREAT ANALYSIS
  // ==========================================

  /**
   * Analyze a request for threats
   */
  analyzeRequest(request: SecurityRequest): ThreatResponse {
    const indicators: ThreatIndicator[] = [];

    // Check IP reputation
    const ipThreat = this.checkIPReputation(request.ipAddress);
    if (ipThreat) {
      indicators.push(ipThreat);
    }

    // Check for brute force
    const bruteForceThreat = this.checkBruteForce(request);
    if (bruteForceThreat) {
      indicators.push(bruteForceThreat);
    }

    // Check for rate limit abuse
    const rateThreat = this.checkRateLimit(request);
    if (rateThreat) {
      indicators.push(rateThreat);
    }

    // Check for suspicious patterns
    const patternThreats = this.checkSuspiciousPatterns(request);
    indicators.push(...patternThreats);

    // Check for session anomalies
    const sessionThreat = this.checkSessionAnomaly(request);
    if (sessionThreat) {
      indicators.push(sessionThreat);
    }

    // Check user behavior
    const behaviorThreat = this.checkUserBehavior(request);
    if (behaviorThreat) {
      indicators.push(behaviorThreat);
    }

    // Determine response based on indicators
    return this.determineResponse(request, indicators);
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(ipAddress: string, userId?: string): void {
    // Update IP reputation
    const reputation = this.getOrCreateIPReputation(ipAddress);
    reputation.failedAuthAttempts.push(Date.now());

    // Clean old attempts
    const cutoff = Date.now() - this.config.bruteForceWindowMs;
    reputation.failedAuthAttempts = reputation.failedAuthAttempts.filter(t => t > cutoff);

    // Check for brute force
    if (reputation.failedAuthAttempts.length >= this.config.bruteForceThreshold) {
      this.createSignal({
        type: 'brute_force',
        severity: 'high',
        source: ipAddress,
        target: userId,
        indicators: [{
          type: 'ip',
          value: ipAddress,
          confidence: 0.9,
        }],
        context: {
          failedAttempts: reputation.failedAuthAttempts.length,
          windowMs: this.config.bruteForceWindowMs,
        },
      });

      if (this.config.enableAutoBlock) {
        this.blockIP(ipAddress, 'Brute force attack detected');
      }
    }

    // Update user behavior if known
    if (userId) {
      const behavior = this.getOrCreateBehaviorProfile(userId);
      behavior.failedLogins++;
      behavior.lastFailedLogin = Date.now();
    }
  }

  /**
   * Record successful authentication
   */
  recordAuthSuccess(ipAddress: string, userId: string): void {
    const reputation = this.getOrCreateIPReputation(ipAddress);
    reputation.successfulAuths++;
    reputation.lastSuccessfulAuth = Date.now();

    const behavior = this.getOrCreateBehaviorProfile(userId);
    behavior.lastLogin = Date.now();

    // Track new IP for user
    if (!behavior.knownIPs.includes(ipAddress)) {
      behavior.knownIPs.push(ipAddress);

      // Alert on new IP if suspicious
      if (behavior.knownIPs.length > 1) {
        this.createSignal({
          type: 'suspicious_pattern',
          severity: 'low',
          source: userId,
          indicators: [{
            type: 'ip',
            value: ipAddress,
            confidence: 0.5,
          }],
          context: {
            reason: 'Login from new IP address',
            previousIPs: behavior.knownIPs.slice(0, -1),
          },
        });
      }
    }
  }

  // ==========================================
  // THREAT CHECKS
  // ==========================================

  private checkIPReputation(ipAddress: string): ThreatIndicator | null {
    const reputation = this.ipReputation.get(ipAddress);
    if (!reputation) return null;

    if (reputation.blocked) {
      return {
        type: 'ip',
        value: ipAddress,
        confidence: 1.0,
      };
    }

    // Calculate risk score based on history
    const failureRate = reputation.failedAuthAttempts.length / (reputation.successfulAuths || 1);
    if (failureRate > 3) {
      return {
        type: 'ip',
        value: ipAddress,
        confidence: Math.min(0.9, failureRate / 10),
      };
    }

    return null;
  }

  private checkBruteForce(request: SecurityRequest): ThreatIndicator | null {
    const reputation = this.ipReputation.get(request.ipAddress);
    if (!reputation) return null;

    const cutoff = Date.now() - this.config.bruteForceWindowMs;
    const recentFailures = reputation.failedAuthAttempts.filter(t => t > cutoff).length;

    if (recentFailures >= this.config.bruteForceThreshold - 2) {
      return {
        type: 'ip',
        value: request.ipAddress,
        confidence: Math.min(0.95, recentFailures / this.config.bruteForceThreshold),
      };
    }

    return null;
  }

  private checkRateLimit(request: SecurityRequest): ThreatIndicator | null {
    const reputation = this.getOrCreateIPReputation(request.ipAddress);
    reputation.requestTimestamps.push(Date.now());

    const cutoff = Date.now() - this.config.rateLimitWindowMs;
    reputation.requestTimestamps = reputation.requestTimestamps.filter(t => t > cutoff);

    if (reputation.requestTimestamps.length > this.config.rateLimitThreshold) {
      return {
        type: 'volume',
        value: `${reputation.requestTimestamps.length} requests in ${this.config.rateLimitWindowMs}ms`,
        confidence: 0.8,
      };
    }

    return null;
  }

  private checkSuspiciousPatterns(request: SecurityRequest): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    // Check request body for suspicious patterns
    const content = JSON.stringify(request.body ?? '') + JSON.stringify(request.headers ?? '');

    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.regex.test(content)) {
        indicators.push({
          type: 'pattern',
          value: pattern.name,
          confidence: pattern.confidence,
        });
      }
    }

    return indicators;
  }

  private checkSessionAnomaly(request: SecurityRequest): ThreatIndicator | null {
    if (!request.sessionId || !request.userId) return null;

    const behavior = this.userBehavior.get(request.userId);
    if (!behavior) return null;

    // Check for session from unusual IP
    if (!behavior.knownIPs.includes(request.ipAddress) && behavior.knownIPs.length > 0) {
      return {
        type: 'behavior',
        value: 'Session from unknown IP',
        confidence: 0.6,
      };
    }

    return null;
  }

  private checkUserBehavior(request: SecurityRequest): ThreatIndicator | null {
    if (!request.userId) return null;

    const behavior = this.userBehavior.get(request.userId);
    if (!behavior) return null;

    // Check for unusual activity timing
    const hour = new Date().getHours();
    const isUnusualHour = behavior.activeHours.length > 0 && !behavior.activeHours.includes(hour);

    if (isUnusualHour && behavior.activeHours.length >= 5) {
      return {
        type: 'timing',
        value: `Activity at unusual hour: ${hour}`,
        confidence: 0.4,
      };
    }

    return null;
  }

  // ==========================================
  // RESPONSE DETERMINATION
  // ==========================================

  private determineResponse(request: SecurityRequest, indicators: ThreatIndicator[]): ThreatResponse {
    if (indicators.length === 0) {
      return { action: 'allow', reason: 'No threats detected' };
    }

    // Calculate aggregate confidence
    const maxConfidence = Math.max(...indicators.map(i => i.confidence));
    const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;

    // Check if IP is blocked
    const reputation = this.ipReputation.get(request.ipAddress);
    if (reputation?.blocked) {
      const blockedUntil = reputation.blockedUntil ?? 0;
      if (Date.now() < blockedUntil) {
        return {
          action: 'block',
          reason: `IP blocked: ${reputation.blockReason}`,
          duration: blockedUntil - Date.now(),
        };
      } else {
        // Unblock expired
        reputation.blocked = false;
        reputation.blockedUntil = undefined;
        reputation.blockReason = undefined;
      }
    }

    // Determine action based on confidence
    if (maxConfidence >= 0.9) {
      return {
        action: 'block',
        reason: `High confidence threat: ${indicators.find(i => i.confidence >= 0.9)?.type}`,
        escalate: true,
      };
    }

    if (maxConfidence >= 0.7 || avgConfidence >= 0.6) {
      return {
        action: 'challenge',
        reason: `Suspicious activity: ${indicators.map(i => i.type).join(', ')}`,
      };
    }

    if (maxConfidence >= 0.4) {
      return {
        action: 'monitor',
        reason: `Low confidence indicators: ${indicators.length}`,
      };
    }

    // Create signal for tracking
    if (indicators.length > 0) {
      this.createSignal({
        type: 'suspicious_pattern',
        severity: 'low',
        source: request.ipAddress,
        target: request.userId,
        indicators,
        context: {
          requestPath: request.path,
          method: request.method,
        },
      });
    }

    return {
      action: 'allow',
      reason: 'Low risk indicators, allowing with monitoring',
    };
  }

  // ==========================================
  // SIGNAL MANAGEMENT
  // ==========================================

  private createSignal(params: Omit<ThreatSignal, 'id' | 'timestamp' | 'mitigated'>): ThreatSignal {
    const signal: ThreatSignal = {
      id: `threat_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      mitigated: false,
      ...params,
    };

    this.signals.set(signal.id, signal);

    // Emit audit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: signal.timestamp,
      eventType: 'threat',
      severity: signal.severity === 'critical' ? 'critical' : signal.severity === 'high' ? 'error' : 'warning',
      subject: { id: signal.source, type: 'unknown', tenantId: 'system' },
      resource: signal.target ? { type: 'unknown', id: signal.target } : undefined,
      action: `threat_detected_${signal.type}`,
      outcome: 'blocked',
      details: {
        threatType: signal.type,
        indicators: signal.indicators,
        context: signal.context,
      },
      ipAddress: signal.source,
      requestId: crypto.randomUUID(),
    });

    return signal;
  }

  /**
   * Get active threat signals
   */
  getActiveSignals(): ThreatSignal[] {
    return Array.from(this.signals.values()).filter(s => !s.mitigated);
  }

  /**
   * Mitigate a threat signal
   */
  mitigateSignal(signalId: string, action: string): void {
    const signal = this.signals.get(signalId);
    if (signal) {
      signal.mitigated = true;
      signal.mitigatedAt = new Date().toISOString();
      signal.mitigationAction = action;
    }
  }

  // ==========================================
  // IP MANAGEMENT
  // ==========================================

  /**
   * Block an IP address
   */
  blockIP(ipAddress: string, reason: string, durationMs?: number): void {
    const reputation = this.getOrCreateIPReputation(ipAddress);
    reputation.blocked = true;
    reputation.blockReason = reason;
    reputation.blockedUntil = Date.now() + (durationMs ?? this.config.blockDurationMs);

    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'threat',
      severity: 'warning',
      subject: { id: ipAddress, type: 'ip', tenantId: 'system' },
      action: 'ip_blocked',
      outcome: 'success',
      details: { reason, durationMs: durationMs ?? this.config.blockDurationMs },
      ipAddress,
      requestId: crypto.randomUUID(),
    });
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ipAddress: string): void {
    const reputation = this.ipReputation.get(ipAddress);
    if (reputation) {
      reputation.blocked = false;
      reputation.blockedUntil = undefined;
      reputation.blockReason = undefined;
    }
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    const reputation = this.ipReputation.get(ipAddress);
    if (!reputation?.blocked) return false;

    if (reputation.blockedUntil && Date.now() > reputation.blockedUntil) {
      reputation.blocked = false;
      return false;
    }

    return true;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private getOrCreateIPReputation(ipAddress: string): IPReputation {
    let reputation = this.ipReputation.get(ipAddress);
    if (!reputation) {
      reputation = {
        ipAddress,
        failedAuthAttempts: [],
        successfulAuths: 0,
        requestTimestamps: [],
        blocked: false,
      };
      this.ipReputation.set(ipAddress, reputation);
    }
    return reputation;
  }

  private getOrCreateBehaviorProfile(userId: string): UserBehaviorProfile {
    let profile = this.userBehavior.get(userId);
    if (!profile) {
      profile = {
        userId,
        knownIPs: [],
        activeHours: [],
        failedLogins: 0,
      };
      this.userBehavior.set(userId, profile);
    }
    return profile;
  }

  private emitEvent(event: SecurityAuditEvent): void {
    if (this.eventEmitter) {
      this.eventEmitter(event);
    }
  }

  /**
   * Get statistics
   */
  getStats(): ThreatStats {
    let activeSignals = 0;
    let mitigatedSignals = 0;
    let blockedIPs = 0;
    const signalsByType: Record<string, number> = {};

    for (const signal of this.signals.values()) {
      if (signal.mitigated) {
        mitigatedSignals++;
      } else {
        activeSignals++;
      }
      signalsByType[signal.type] = (signalsByType[signal.type] ?? 0) + 1;
    }

    for (const reputation of this.ipReputation.values()) {
      if (reputation.blocked) {
        blockedIPs++;
      }
    }

    return {
      totalSignals: this.signals.size,
      activeSignals,
      mitigatedSignals,
      blockedIPs,
      trackedIPs: this.ipReputation.size,
      trackedUsers: this.userBehavior.size,
      signalsByType,
    };
  }
}

// ============================================
// DEFAULT PATTERNS
// ============================================

const DEFAULT_SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  { name: 'sql_injection', regex: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i, confidence: 0.8 },
  { name: 'xss_script', regex: /<script[^>]*>|javascript:|on\w+\s*=/i, confidence: 0.8 },
  { name: 'path_traversal', regex: /\.\.[\/\\]|%2e%2e[\/\\%]/i, confidence: 0.9 },
  { name: 'command_injection', regex: /[;&|`$()]|\b(eval|exec|system|popen)\b/i, confidence: 0.7 },
  { name: 'ldap_injection', regex: /[()\\*|&]/i, confidence: 0.5 },
];

// ============================================
// TYPES
// ============================================

export interface ThreatDetectorConfig {
  bruteForceThreshold: number;
  bruteForceWindowMs: number;
  rateLimitThreshold: number;
  rateLimitWindowMs: number;
  suspiciousPatterns: SuspiciousPattern[];
  blockDurationMs: number;
  enableAutoBlock: boolean;
}

export interface SuspiciousPattern {
  name: string;
  regex: RegExp;
  confidence: number;
}

export interface SecurityRequest {
  ipAddress: string;
  userId?: string;
  sessionId?: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface IPReputation {
  ipAddress: string;
  failedAuthAttempts: number[];
  successfulAuths: number;
  lastSuccessfulAuth?: number;
  requestTimestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
  blockReason?: string;
}

interface UserBehaviorProfile {
  userId: string;
  knownIPs: string[];
  activeHours: number[];
  lastLogin?: number;
  lastFailedLogin?: number;
  failedLogins: number;
}

export interface ThreatStats {
  totalSignals: number;
  activeSignals: number;
  mitigatedSignals: number;
  blockedIPs: number;
  trackedIPs: number;
  trackedUsers: number;
  signalsByType: Record<string, number>;
}

// Export singleton
export const threatDetector = new ThreatDetector();
