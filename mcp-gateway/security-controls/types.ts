/**
 * FORGE Platform - Security Controls Types
 *
 * @epic 3.6 - Security Controls
 * @description Type definitions for comprehensive security controls
 */

// ============================================
// ACCESS CONTROL TYPES
// ============================================

export type Permission =
  | 'read'
  | 'write'
  | 'execute'
  | 'delete'
  | 'admin'
  | 'approve'
  | 'audit'
  | 'configure';

export type ResourceType =
  | 'tool'
  | 'server'
  | 'tenant'
  | 'session'
  | 'secret'
  | 'config'
  | 'audit'
  | 'policy';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermission[];
  inherits?: string[];
  constraints?: RoleConstraint[];
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  resource: ResourceType;
  actions: Permission[];
  conditions?: PolicyCondition[];
}

export interface RoleConstraint {
  type: 'time' | 'ip' | 'mfa' | 'tenant' | 'environment';
  value: string | string[] | TimeConstraint;
}

export interface TimeConstraint {
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
  timezone: string;
}

export interface Subject {
  id: string;
  type: 'user' | 'service' | 'agent';
  tenantId: string;
  roles: string[];
  attributes: Record<string, string | number | boolean>;
  mfaVerified?: boolean;
  sessionId?: string;
}

export interface Resource {
  type: ResourceType;
  id: string;
  tenantId: string;
  owner?: string;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  attributes?: Record<string, unknown>;
}

export interface AccessRequest {
  subject: Subject;
  resource: Resource;
  action: Permission;
  context: AccessContext;
}

export interface AccessContext {
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  environment: 'development' | 'staging' | 'production';
  additionalContext?: Record<string, unknown>;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
  obligations?: Obligation[];
  auditRequired: boolean;
}

export interface Obligation {
  type: 'log' | 'notify' | 'encrypt' | 'mask' | 'approve';
  parameters: Record<string, unknown>;
}

// ============================================
// POLICY TYPES
// ============================================

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  priority: number;
  effect: 'allow' | 'deny';
  subjects: PolicySubjectMatcher[];
  resources: PolicyResourceMatcher[];
  actions: Permission[];
  conditions?: PolicyCondition[];
  obligations?: Obligation[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicySubjectMatcher {
  type?: 'user' | 'service' | 'agent' | '*';
  roles?: string[];
  attributes?: Record<string, string | number | boolean>;
}

export interface PolicyResourceMatcher {
  type?: ResourceType | '*';
  id?: string;
  tenantId?: string;
  sensitivity?: string[];
  attributes?: Record<string, unknown>;
}

export interface PolicyCondition {
  type: 'time' | 'ip' | 'attribute' | 'risk' | 'rate' | 'custom';
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'matches';
  field: string;
  value: unknown;
}

// ============================================
// SESSION TYPES
// ============================================

export interface Session {
  id: string;
  subjectId: string;
  subjectType: 'user' | 'service' | 'agent';
  tenantId: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  attributes: Record<string, unknown>;
  revoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
}

export interface SessionConfig {
  maxDurationMs: number;
  idleTimeoutMs: number;
  maxConcurrentSessions: number;
  requireMfa: boolean;
  bindToIp: boolean;
  rotateOnActivity: boolean;
  rotationIntervalMs: number;
}

// ============================================
// CRYPTOGRAPHIC TYPES
// ============================================

export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305';
  purpose: 'data' | 'session' | 'token' | 'secret';
  version: number;
  createdAt: string;
  expiresAt?: string;
  rotatedAt?: string;
  status: 'active' | 'rotating' | 'deprecated' | 'destroyed';
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag?: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
  encryptedAt: string;
}

export interface SigningKey {
  id: string;
  algorithm: 'Ed25519' | 'ECDSA-P256' | 'RSA-PSS';
  purpose: 'token' | 'audit' | 'code' | 'api';
  publicKey: string;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'deprecated' | 'revoked';
}

export interface Signature {
  value: string;
  keyId: string;
  algorithm: string;
  timestamp: string;
}

// ============================================
// SECRETS MANAGEMENT TYPES
// ============================================

export interface Secret {
  id: string;
  name: string;
  type: 'api_key' | 'password' | 'certificate' | 'token' | 'connection_string' | 'generic';
  version: number;
  encryptedValue: EncryptedData;
  metadata: SecretMetadata;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface SecretMetadata {
  owner: string;
  tenantId: string;
  environment: string[];
  tags: string[];
  rotation: SecretRotation;
  accessPolicy: string[];
}

export interface SecretRotation {
  enabled: boolean;
  intervalDays: number;
  lastRotatedAt?: string;
  nextRotationAt?: string;
  notifyBeforeDays: number;
}

// ============================================
// THREAT DETECTION TYPES
// ============================================

export interface ThreatSignal {
  id: string;
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target?: string;
  timestamp: string;
  indicators: ThreatIndicator[];
  context: Record<string, unknown>;
  mitigated: boolean;
  mitigatedAt?: string;
  mitigationAction?: string;
}

export type ThreatType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'injection_attempt'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'suspicious_pattern'
  | 'rate_limit_abuse'
  | 'session_hijack'
  | 'token_replay'
  | 'tool_poisoning';

export interface ThreatIndicator {
  type: 'ip' | 'user' | 'pattern' | 'timing' | 'volume' | 'behavior';
  value: string;
  confidence: number;
}

export interface ThreatResponse {
  action: 'allow' | 'block' | 'challenge' | 'monitor' | 'alert';
  reason: string;
  duration?: number;
  escalate?: boolean;
}

// ============================================
// SECURITY HEADERS TYPES
// ============================================

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY' | 'SAMEORIGIN';
  'X-XSS-Protection': '1; mode=block';
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Embedder-Policy': string;
  'Cross-Origin-Resource-Policy': string;
}

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

// ============================================
// AUDIT TYPES
// ============================================

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  subject: {
    id: string;
    type: string;
    tenantId: string;
  };
  resource?: {
    type: string;
    id: string;
  };
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  correlationId?: string;
}

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'session'
  | 'access'
  | 'policy'
  | 'secret'
  | 'threat'
  | 'encryption'
  | 'configuration';
