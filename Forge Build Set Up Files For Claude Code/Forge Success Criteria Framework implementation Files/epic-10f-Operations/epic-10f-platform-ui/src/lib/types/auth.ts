/**
 * FORGE Platform UI - Auth & Admin Types
 * @epic 10e - Auth + Admin
 */

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type AuthProvider = 'email' | 'google' | 'github' | 'saml' | 'oidc';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  
  // Status
  status: UserStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  
  // Auth
  authProvider: AuthProvider;
  lastLogin?: string;
  lastActivity?: string;
  
  // RBAC
  roles: string[];
  teams: string[];
  
  // Limits
  limits?: {
    maxConcurrentRuns?: number;
    maxDailyCost?: number;
    maxIterationsPerRun?: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  
  // Permissions
  permissions: Permission[];
  
  // Scope
  scope: 'global' | 'team' | 'repo';
  
  // System role (cannot be deleted)
  isSystem: boolean;
  
  // Metadata
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: 'contracts' | 'runs' | 'evidence' | 'policies' | 'approvals' | 'users' | 'roles' | 'settings' | 'admin';
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve' | 'admin';
  scope?: string; // Optional scope restriction
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  
  // Members
  memberCount: number;
  members?: TeamMember[];
  
  // Settings
  defaultRole?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  
  // Device info
  userAgent: string;
  ipAddress: string;
  location?: string;
  
  // Timing
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  
  // Current session
  isCurrent: boolean;
}

export interface AuditLog {
  id: string;
  
  // Actor
  userId: string;
  userName: string;
  userEmail: string;
  
  // Action
  action: string;
  resource: string;
  resourceId?: string;
  
  // Details
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Context
  ipAddress: string;
  userAgent: string;
  
  // Timing
  timestamp: string;
  
  // Risk
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface ApiKey {
  id: string;
  name: string;
  
  // Key info (prefix only shown after creation)
  keyPrefix: string;
  
  // Permissions
  permissions: Permission[];
  
  // Scope
  allowedRepos?: string[];
  allowedContracts?: string[];
  
  // Limits
  rateLimit?: number;
  
  // Status
  status: 'active' | 'revoked';
  lastUsed?: string;
  usageCount: number;
  
  // Timing
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: Permission[];
  isLoading: boolean;
  error?: string;
}

export interface UserFilters {
  status?: UserStatus[];
  role?: string[];
  team?: string[];
  authProvider?: AuthProvider[];
  search?: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string[];
  resource?: string[];
  riskLevel?: ('low' | 'medium' | 'high')[];
  dateFrom?: string;
  dateTo?: string;
}

// Predefined system roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const;

// Predefined permissions
export const PERMISSIONS = {
  // Contracts
  CONTRACTS_CREATE: { resource: 'contracts', action: 'create' },
  CONTRACTS_READ: { resource: 'contracts', action: 'read' },
  CONTRACTS_UPDATE: { resource: 'contracts', action: 'update' },
  CONTRACTS_DELETE: { resource: 'contracts', action: 'delete' },
  
  // Runs
  RUNS_EXECUTE: { resource: 'runs', action: 'execute' },
  RUNS_READ: { resource: 'runs', action: 'read' },
  RUNS_ADMIN: { resource: 'runs', action: 'admin' },
  
  // Evidence
  EVIDENCE_READ: { resource: 'evidence', action: 'read' },
  EVIDENCE_EXPORT: { resource: 'evidence', action: 'read' },
  
  // Policies
  POLICIES_CREATE: { resource: 'policies', action: 'create' },
  POLICIES_READ: { resource: 'policies', action: 'read' },
  POLICIES_UPDATE: { resource: 'policies', action: 'update' },
  POLICIES_DELETE: { resource: 'policies', action: 'delete' },
  
  // Approvals
  APPROVALS_APPROVE: { resource: 'approvals', action: 'approve' },
  APPROVALS_READ: { resource: 'approvals', action: 'read' },
  
  // Users
  USERS_CREATE: { resource: 'users', action: 'create' },
  USERS_READ: { resource: 'users', action: 'read' },
  USERS_UPDATE: { resource: 'users', action: 'update' },
  USERS_DELETE: { resource: 'users', action: 'delete' },
  
  // Admin
  ADMIN_FULL: { resource: 'admin', action: 'admin' },
} as const;
