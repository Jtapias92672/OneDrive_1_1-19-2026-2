/**
 * MCP Security Gateway - CARS Context
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.2 - Implement CARS context types
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Context types for CARS risk assessment.
 *   Provides user, project, and environment context for risk decisions.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * User role type
 */
export type UserRole = 'viewer' | 'developer' | 'admin' | 'service';

/**
 * Valid user roles
 */
export const VALID_USER_ROLES: UserRole[] = ['viewer', 'developer', 'admin', 'service'];

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Valid environments
 */
export const VALID_ENVIRONMENTS: Environment[] = ['development', 'staging', 'production'];

/**
 * Full CARS context type
 */
export interface CARSContext {
  /** User identifier (UUID) */
  userId: string;

  /** Project identifier (UUID) */
  projectId: string;

  /** Deployment environment */
  environment: Environment;

  /** User's role in the system */
  userRole: UserRole;

  /** Tenant identifier for multi-tenant isolation */
  tenantId?: string;

  /** Session identifier for request correlation */
  sessionId?: string;

  /** Source of the request */
  source: string;

  /** Request timestamp */
  timestamp?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Minimal CARS context type
 */
export interface MinimalCARSContext {
  userId: string;
  projectId: string;
  environment: Environment;
  userRole: UserRole;
}

// ============================================
// CONTEXT FACTORY
// ============================================

/**
 * Create a CARS context with defaults
 */
export function createCARSContext(
  partial: Partial<CARSContext> & Pick<CARSContext, 'userId' | 'projectId'>
): CARSContext {
  return {
    userId: partial.userId,
    projectId: partial.projectId,
    environment: partial.environment ?? 'development',
    userRole: partial.userRole ?? 'developer',
    tenantId: partial.tenantId,
    sessionId: partial.sessionId ?? generateSessionId(),
    source: partial.source ?? 'unknown',
    timestamp: partial.timestamp ?? new Date().toISOString(),
    metadata: partial.metadata,
  };
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `sess_${timestamp}_${random}`;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate a CARS context
 * Returns the validated context or throws an error
 */
export function validateCARSContext(context: unknown): CARSContext {
  const result = safeParseCARSContext(context);
  if (!result.success) {
    throw new Error(result.error || 'Invalid CARS context');
  }
  return result.data!;
}

/**
 * Safely validate a CARS context
 * Returns the result without throwing
 */
export function safeParseCARSContext(
  context: unknown
): ValidationResult<CARSContext> {
  if (!context || typeof context !== 'object') {
    return { success: false, error: 'Context must be an object' };
  }

  const ctx = context as Record<string, unknown>;

  // Validate required fields
  if (typeof ctx.userId !== 'string' || !ctx.userId) {
    return { success: false, error: 'userId is required and must be a string' };
  }
  if (typeof ctx.projectId !== 'string' || !ctx.projectId) {
    return { success: false, error: 'projectId is required and must be a string' };
  }
  if (!VALID_ENVIRONMENTS.includes(ctx.environment as Environment)) {
    return { success: false, error: `environment must be one of: ${VALID_ENVIRONMENTS.join(', ')}` };
  }
  if (!VALID_USER_ROLES.includes(ctx.userRole as UserRole)) {
    return { success: false, error: `userRole must be one of: ${VALID_USER_ROLES.join(', ')}` };
  }

  return {
    success: true,
    data: {
      userId: ctx.userId as string,
      projectId: ctx.projectId as string,
      environment: ctx.environment as Environment,
      userRole: ctx.userRole as UserRole,
      tenantId: ctx.tenantId as string | undefined,
      sessionId: ctx.sessionId as string | undefined,
      source: (ctx.source as string) || 'unknown',
      timestamp: ctx.timestamp as string | undefined,
      metadata: ctx.metadata as Record<string, unknown> | undefined,
    },
  };
}

/**
 * Check if a context is valid
 */
export function isValidCARSContext(context: unknown): context is CARSContext {
  return safeParseCARSContext(context).success;
}

// ============================================
// CONTEXT RISK FACTORS
// ============================================

/**
 * Risk multipliers based on context factors
 */
export const CONTEXT_RISK_FACTORS = {
  /** Production environment increases risk */
  environment: {
    development: 0,
    staging: 0.5,
    production: 1.0,
  } as Record<Environment, number>,

  /** Viewer role has lower risk ceiling */
  userRole: {
    viewer: -0.5,
    developer: 0,
    admin: 0.5,
    service: 1.0,
  } as Record<UserRole, number>,
};

/**
 * Calculate context-based risk modifier
 */
export function calculateContextRiskModifier(context: CARSContext): number {
  let modifier = 0;

  // Environment factor
  modifier += CONTEXT_RISK_FACTORS.environment[context.environment];

  // Role factor
  modifier += CONTEXT_RISK_FACTORS.userRole[context.userRole];

  return modifier;
}

/**
 * Check if context allows high-risk operations
 */
export function canPerformHighRiskOperations(context: CARSContext): boolean {
  // Only admins in non-production or admins explicitly authorized
  if (context.userRole === 'admin') {
    return true;
  }

  // Service accounts can perform high-risk ops in any environment
  if (context.userRole === 'service') {
    return true;
  }

  // Developers only in development
  if (context.userRole === 'developer' && context.environment === 'development') {
    return true;
  }

  return false;
}

/**
 * Check if context requires additional approval
 */
export function requiresAdditionalApproval(context: CARSContext): boolean {
  // Production always requires additional approval for developers
  if (context.environment === 'production' && context.userRole === 'developer') {
    return true;
  }

  // Staging requires approval for viewers
  if (context.environment === 'staging' && context.userRole === 'viewer') {
    return true;
  }

  return false;
}

// ============================================
// EXPORTS
// ============================================

export default CARSContext;
