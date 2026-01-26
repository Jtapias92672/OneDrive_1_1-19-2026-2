/**
 * MCP Security Gateway - Tenant Isolation Engine
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.6 - Tenant Isolation Engine
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Enforces tenant boundaries to prevent cross-tenant data access.
 *   Addresses Asana-style cross-tenant leak vulnerabilities.
 */

import { TenantContext, TenantNotFoundError } from './context-extractor.js';

// ============================================
// TYPES
// ============================================

/**
 * Tool call request for tenant validation
 */
export interface TenantToolRequest {
  /** Tool name */
  tool: string;

  /** Request parameters */
  params: Record<string, unknown>;

  /** User ID making the request */
  userId: string;

  /** Request ID for audit */
  requestId?: string;
}

/**
 * Resource ownership information
 */
export interface ResourceOwnership {
  /** Resource identifier */
  resourceId: string;

  /** Owner tenant ID */
  tenantId: string;

  /** Resource type */
  resourceType: string;

  /** Owner project ID (if applicable) */
  projectId?: string;
}

/**
 * Tenant isolation configuration
 */
export interface TenantIsolationConfig {
  /** Enable strict mode (block all cross-tenant) */
  strictMode?: boolean;

  /** Allow cross-tenant read for specific tools */
  crossTenantReadTools?: string[];

  /** Allow cross-tenant write for specific tools */
  crossTenantWriteTools?: string[];

  /** Resource ID patterns to check for ownership */
  resourceIdPatterns?: RegExp[];

  /** Tenant ID parameter names in requests */
  tenantIdParams?: string[];
}

/**
 * Isolation validation result
 */
export interface IsolationResult {
  /** Whether the request passed isolation checks */
  allowed: boolean;

  /** Reason if blocked */
  reason?: string;

  /** Modified params with tenant filters */
  filteredParams?: Record<string, unknown>;

  /** Detected cross-tenant references */
  crossTenantRefs?: string[];
}

/**
 * User-tenant access mapping
 */
export interface TenantAccess {
  userId: string;
  tenantId: string;
  role: 'admin' | 'member' | 'readonly';
  permissions: string[];
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_RESOURCE_ID_PATTERNS = [
  // UUID pattern
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  // Prefixed IDs (e.g., user_abc123, proj_xyz789)
  /[a-z]+_[a-zA-Z0-9]{6,}/g,
];

const DEFAULT_TENANT_ID_PARAMS = [
  'tenantId',
  'tenant_id',
  'orgId',
  'org_id',
  'organizationId',
];

// ============================================
// TENANT ISOLATION ENGINE CLASS
// ============================================

/**
 * Tenant Isolation Engine
 *
 * Enforces tenant boundaries to prevent:
 * - Cross-tenant data access
 * - Cross-tenant resource manipulation
 * - Tenant data leakage
 *
 * @example
 * ```typescript
 * const engine = new TenantIsolationEngine({ strictMode: true });
 *
 * // Register user access
 * engine.registerUserAccess({
 *   userId: 'user-123',
 *   tenantId: 'tenant-abc',
 *   role: 'member',
 *   permissions: ['read', 'write'],
 * });
 *
 * // Validate request
 * await engine.enforceTenantBoundary(
 *   { tool: 'database_query', params: { projectId: 'proj-xyz' }, userId: 'user-123' },
 *   { tenantId: 'tenant-abc', dataIsolationBoundary: 'tenant' }
 * );
 * ```
 */
export class TenantIsolationEngine {
  private config: TenantIsolationConfig;
  private userAccess: Map<string, TenantAccess[]> = new Map();
  private resourceOwnership: Map<string, ResourceOwnership> = new Map();

  constructor(config: TenantIsolationConfig = {}) {
    this.config = {
      strictMode: true,
      crossTenantReadTools: [],
      crossTenantWriteTools: [],
      resourceIdPatterns: DEFAULT_RESOURCE_ID_PATTERNS,
      tenantIdParams: DEFAULT_TENANT_ID_PARAMS,
      ...config,
    };
  }

  // ==========================================
  // BOUNDARY ENFORCEMENT
  // ==========================================

  /**
   * Enforce tenant boundary for a request
   *
   * @param request Tool call request
   * @param tenantContext Extracted tenant context
   * @throws TenantAccessDeniedError if access denied
   * @throws CrossTenantViolationError if cross-tenant access detected
   */
  async enforceTenantBoundary(
    request: TenantToolRequest,
    tenantContext: TenantContext
  ): Promise<void> {
    const { tenantId } = tenantContext;

    if (!tenantId) {
      throw new TenantNotFoundError('Tenant ID required for isolation');
    }

    // 1. Validate user has access to tenant
    const hasAccess = await this.checkTenantAccess(request.userId, tenantId);
    if (!hasAccess) {
      throw new TenantAccessDeniedError(
        `User ${request.userId} cannot access tenant ${tenantId}`
      );
    }

    // 2. Check tool is allowed for tenant
    if (tenantContext.allowedTools) {
      if (!tenantContext.allowedTools.includes(request.tool)) {
        throw new TenantAccessDeniedError(
          `Tool ${request.tool} not allowed for tenant ${tenantId}`
        );
      }
    }

    // 3. Scan for cross-tenant references in params
    await this.scanForCrossTenantReferences(request.params, tenantId);

    // 4. Validate resource ownership if resourceId present
    const resourceId = this.extractResourceId(request.params);
    if (resourceId) {
      const owner = await this.getResourceTenant(resourceId);
      if (owner && owner !== tenantId) {
        throw new CrossTenantViolationError(
          `Resource ${resourceId} belongs to different tenant`
        );
      }
    }
  }

  /**
   * Validate request and return filtered params
   *
   * @param request Tool call request
   * @param tenantContext Extracted tenant context
   * @returns Isolation result with filtered params
   */
  async validateRequest(
    request: TenantToolRequest,
    tenantContext: TenantContext
  ): Promise<IsolationResult> {
    const { tenantId } = tenantContext;

    try {
      // Check user access
      const hasAccess = await this.checkTenantAccess(request.userId, tenantId);
      if (!hasAccess) {
        return {
          allowed: false,
          reason: `User ${request.userId} cannot access tenant ${tenantId}`,
        };
      }

      // Scan for cross-tenant refs
      const crossTenantRefs = await this.findCrossTenantReferences(
        request.params,
        tenantId
      );

      if (crossTenantRefs.length > 0 && this.config.strictMode) {
        return {
          allowed: false,
          reason: 'Cross-tenant references detected',
          crossTenantRefs,
        };
      }

      // Add tenant filter to params
      const filteredParams = this.addTenantFilter(request.params, tenantId);

      return {
        allowed: true,
        filteredParams,
        crossTenantRefs: crossTenantRefs.length > 0 ? crossTenantRefs : undefined,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: (error as Error).message,
      };
    }
  }

  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  /**
   * Check if user has access to tenant
   */
  async checkTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const userAccessList = this.userAccess.get(userId);
    if (!userAccessList) return false;

    return userAccessList.some((access) => access.tenantId === tenantId);
  }

  /**
   * Get user's role in tenant
   */
  getUserTenantRole(
    userId: string,
    tenantId: string
  ): 'admin' | 'member' | 'readonly' | null {
    const userAccessList = this.userAccess.get(userId);
    if (!userAccessList) return null;

    const access = userAccessList.find((a) => a.tenantId === tenantId);
    return access?.role ?? null;
  }

  /**
   * Register user access to tenant
   */
  registerUserAccess(access: TenantAccess): void {
    const existing = this.userAccess.get(access.userId) ?? [];

    // Remove existing access to same tenant
    const filtered = existing.filter((a) => a.tenantId !== access.tenantId);

    // Add new access
    filtered.push(access);
    this.userAccess.set(access.userId, filtered);
  }

  /**
   * Revoke user access to tenant
   */
  revokeUserAccess(userId: string, tenantId: string): boolean {
    const existing = this.userAccess.get(userId);
    if (!existing) return false;

    const filtered = existing.filter((a) => a.tenantId !== tenantId);
    if (filtered.length === existing.length) return false;

    if (filtered.length === 0) {
      this.userAccess.delete(userId);
    } else {
      this.userAccess.set(userId, filtered);
    }

    return true;
  }

  // ==========================================
  // CROSS-TENANT DETECTION
  // ==========================================

  /**
   * Scan parameters for cross-tenant references
   *
   * @throws CrossTenantViolationError if cross-tenant access detected
   */
  private async scanForCrossTenantReferences(
    params: Record<string, unknown>,
    allowedTenantId: string
  ): Promise<void> {
    const paramsStr = JSON.stringify(params);

    // Check for explicit tenant IDs in params
    for (const paramName of this.config.tenantIdParams ?? []) {
      const value = this.getNestedValue(params, paramName);
      if (typeof value === 'string' && value !== allowedTenantId) {
        throw new CrossTenantViolationError(
          `Cross-tenant access attempted via ${paramName}: ${value}`
        );
      }
    }

    // Extract resource IDs and check ownership
    const resourceIds = this.extractAllResourceIds(paramsStr);
    for (const resourceId of resourceIds) {
      const owner = await this.getResourceTenant(resourceId);
      if (owner && owner !== allowedTenantId) {
        throw new CrossTenantViolationError(
          `Cross-tenant resource reference detected: ${resourceId}`
        );
      }
    }
  }

  /**
   * Find cross-tenant references without throwing
   */
  private async findCrossTenantReferences(
    params: Record<string, unknown>,
    allowedTenantId: string
  ): Promise<string[]> {
    const violations: string[] = [];
    const paramsStr = JSON.stringify(params);

    // Check explicit tenant IDs
    for (const paramName of this.config.tenantIdParams ?? []) {
      const value = this.getNestedValue(params, paramName);
      if (typeof value === 'string' && value !== allowedTenantId) {
        violations.push(`${paramName}:${value}`);
      }
    }

    // Check resource IDs
    const resourceIds = this.extractAllResourceIds(paramsStr);
    for (const resourceId of resourceIds) {
      const owner = await this.getResourceTenant(resourceId);
      if (owner && owner !== allowedTenantId) {
        violations.push(`resource:${resourceId}`);
      }
    }

    return violations;
  }

  /**
   * Extract all resource IDs from string
   */
  private extractAllResourceIds(text: string): string[] {
    const ids = new Set<string>();

    for (const pattern of this.config.resourceIdPatterns ?? []) {
      const matches = text.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        matches.forEach((id) => ids.add(id));
      }
    }

    return Array.from(ids);
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  // ==========================================
  // RESOURCE OWNERSHIP
  // ==========================================

  /**
   * Get tenant that owns a resource
   */
  async getResourceTenant(resourceId: string): Promise<string | null> {
    const ownership = this.resourceOwnership.get(resourceId);
    return ownership?.tenantId ?? null;
  }

  /**
   * Register resource ownership
   */
  registerResourceOwnership(ownership: ResourceOwnership): void {
    this.resourceOwnership.set(ownership.resourceId, ownership);
  }

  /**
   * Extract primary resource ID from params
   */
  private extractResourceId(params: Record<string, unknown>): string | null {
    // Common resource ID field names
    const fields = ['resourceId', 'id', 'fileId', 'documentId', 'recordId'];

    for (const field of fields) {
      const value = params[field];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  }

  // ==========================================
  // TENANT FILTERING
  // ==========================================

  /**
   * Add tenant filter to parameters
   */
  addTenantFilter(
    params: Record<string, unknown>,
    tenantId: string
  ): Record<string, unknown> {
    return {
      ...params,
      _tenantFilter: tenantId,
      _isolatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if cross-tenant access is allowed for tool
   */
  isCrossTenantAllowed(tool: string, operation: 'read' | 'write'): boolean {
    if (this.config.strictMode) return false;

    if (operation === 'read') {
      return this.config.crossTenantReadTools?.includes(tool) ?? false;
    }

    return this.config.crossTenantWriteTools?.includes(tool) ?? false;
  }
}

// ============================================
// ERRORS
// ============================================

export class TenantAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantAccessDeniedError';
  }
}

export class CrossTenantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrossTenantViolationError';
  }
}

// ============================================
// EXPORTS
// ============================================

export default TenantIsolationEngine;
