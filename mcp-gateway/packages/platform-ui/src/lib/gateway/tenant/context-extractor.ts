/**
 * MCP Security Gateway - Tenant Context Extractor
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.5 - Tenant Context Extraction
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Extracts tenant ID from various sources in MCP requests.
 *   Implements priority-based extraction for multi-tenant isolation.
 */

// ============================================
// TYPES
// ============================================

/**
 * Tool call request with potential tenant information
 */
export interface TenantRequest {
  /** Request parameters */
  params: Record<string, unknown>;

  /** Request headers */
  headers?: Record<string, string>;

  /** User ID (for default tenant lookup) */
  userId?: string;
}

/**
 * Extracted tenant context
 */
export interface TenantContext {
  /** Tenant identifier */
  tenantId: string;

  /** Project identifier (optional) */
  projectId?: string;

  /** Allowed tools for this tenant */
  allowedTools?: string[];

  /** Data isolation boundary */
  dataIsolationBoundary: 'project' | 'tenant' | 'global';

  /** Tenant metadata */
  metadata?: Record<string, unknown>;
}

/**
 * JWT claims with tenant info
 */
export interface TenantJWTClaims {
  sub: string;
  tenant_id?: string;
  org_id?: string;
  project_id?: string;
  [key: string]: unknown;
}

/**
 * User-tenant mapping
 */
export interface UserTenantMapping {
  userId: string;
  defaultTenantId: string;
  tenants: string[];
}

/**
 * Tenant extraction options
 */
export interface TenantExtractionOptions {
  /** Header name for tenant ID */
  tenantHeader?: string;

  /** Parameter name for tenant ID */
  tenantParam?: string;

  /** JWT claim name for tenant ID */
  tenantClaim?: string;

  /** Fallback tenant if none found */
  fallbackTenant?: string;

  /** Require tenant ID (throw if not found) */
  requireTenant?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TENANT_HEADER = 'x-tenant-id';
const DEFAULT_TENANT_PARAM = 'tenantId';
const DEFAULT_TENANT_CLAIM = 'tenant_id';

// ============================================
// TENANT CONTEXT EXTRACTOR CLASS
// ============================================

/**
 * Extracts tenant context from MCP requests
 *
 * Priority order:
 * 1. Explicit tenant in tool parameters
 * 2. JWT claim (from Authorization header)
 * 3. Request header (x-tenant-id)
 * 4. User's default tenant
 * 5. Fallback tenant (if configured)
 *
 * @example
 * ```typescript
 * const extractor = new TenantContextExtractor({
 *   requireTenant: true,
 * });
 *
 * const context = await extractor.extractTenantContext({
 *   params: { tenantId: 'tenant-123' },
 *   headers: { 'x-tenant-id': 'tenant-456' },
 *   userId: 'user-789',
 * });
 * // context.tenantId === 'tenant-123' (params take priority)
 * ```
 */
export class TenantContextExtractor {
  private options: TenantExtractionOptions;
  private userTenantMappings: Map<string, UserTenantMapping> = new Map();

  constructor(options: TenantExtractionOptions = {}) {
    this.options = {
      tenantHeader: DEFAULT_TENANT_HEADER,
      tenantParam: DEFAULT_TENANT_PARAM,
      tenantClaim: DEFAULT_TENANT_CLAIM,
      requireTenant: false,
      ...options,
    };
  }

  // ==========================================
  // TENANT EXTRACTION
  // ==========================================

  /**
   * Extract tenant ID from request
   *
   * @param request The tool call request
   * @returns Tenant ID
   * @throws Error if tenant required but not found
   */
  extractTenantId(request: TenantRequest): string {
    // Priority 1: Explicit tenant in tool parameters
    const paramTenant = this.extractFromParams(request.params);
    if (paramTenant) {
      return paramTenant;
    }

    // Priority 2: JWT claim
    if (request.headers?.authorization) {
      const jwtTenant = this.extractFromJWT(request.headers.authorization);
      if (jwtTenant) {
        return jwtTenant;
      }
    }

    // Priority 3: Request header
    if (request.headers) {
      const headerTenant = this.extractFromHeaders(request.headers);
      if (headerTenant) {
        return headerTenant;
      }
    }

    // Priority 4: User's default tenant
    if (request.userId) {
      const userTenant = this.getUserDefaultTenant(request.userId);
      if (userTenant) {
        return userTenant;
      }
    }

    // Priority 5: Fallback tenant
    if (this.options.fallbackTenant) {
      return this.options.fallbackTenant;
    }

    // No tenant found
    if (this.options.requireTenant) {
      throw new TenantNotFoundError(
        'Tenant ID required but not found in request'
      );
    }

    return '';
  }

  /**
   * Extract full tenant context from request
   *
   * @param request The tool call request
   * @returns Full tenant context
   */
  async extractTenantContext(request: TenantRequest): Promise<TenantContext> {
    const tenantId = this.extractTenantId(request);

    // Extract project ID if available
    const projectId = this.extractProjectId(request);

    // Get allowed tools for tenant
    const allowedTools = await this.getTenantAllowedTools(tenantId);

    // Determine data isolation boundary
    const dataIsolationBoundary = this.determineIsolationBoundary(request);

    return {
      tenantId,
      projectId,
      allowedTools,
      dataIsolationBoundary,
      metadata: this.extractTenantMetadata(request),
    };
  }

  // ==========================================
  // EXTRACTION HELPERS
  // ==========================================

  /**
   * Extract tenant from request parameters
   */
  private extractFromParams(params: Record<string, unknown>): string | null {
    const paramName = this.options.tenantParam ?? DEFAULT_TENANT_PARAM;
    const value = params[paramName];

    if (typeof value === 'string' && value.length > 0) {
      return this.validateTenantId(value);
    }

    return null;
  }

  /**
   * Extract tenant from request headers
   */
  private extractFromHeaders(headers: Record<string, string>): string | null {
    const headerName = this.options.tenantHeader ?? DEFAULT_TENANT_HEADER;

    // Check both exact case and lowercase
    const value = headers[headerName] ?? headers[headerName.toLowerCase()];

    if (typeof value === 'string' && value.length > 0) {
      return this.validateTenantId(value);
    }

    return null;
  }

  /**
   * Extract tenant from JWT claims
   */
  private extractFromJWT(authHeader: string): string | null {
    // Extract JWT from Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;

    const token = match[1] ?? '';
    if (!token) return null;
    const claims = this.parseJWT(token);
    if (!claims) return null;

    const claimName = this.options.tenantClaim ?? DEFAULT_TENANT_CLAIM;
    const value = claims[claimName];

    if (typeof value === 'string' && value.length > 0) {
      return this.validateTenantId(value);
    }

    // Try org_id as fallback
    if (typeof claims.org_id === 'string' && claims.org_id.length > 0) {
      return this.validateTenantId(claims.org_id);
    }

    return null;
  }

  /**
   * Parse JWT payload (without verification)
   */
  private parseJWT(token: string): TenantJWTClaims | null {
    try {
      const parts = token.split('.');
      const payloadPart = parts[1];
      if (parts.length !== 3 || !payloadPart) return null;

      const payload = Buffer.from(payloadPart, 'base64url').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  /**
   * Validate tenant ID format
   */
  private validateTenantId(tenantId: string): string {
    // Remove whitespace
    const cleaned = tenantId.trim();

    // Basic validation - alphanumeric with hyphens and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
      throw new InvalidTenantIdError(`Invalid tenant ID format: ${tenantId}`);
    }

    // Length check
    if (cleaned.length > 128) {
      throw new InvalidTenantIdError('Tenant ID too long (max 128 characters)');
    }

    return cleaned;
  }

  // ==========================================
  // PROJECT EXTRACTION
  // ==========================================

  /**
   * Extract project ID from request
   */
  private extractProjectId(request: TenantRequest): string | undefined {
    // From params
    if (typeof request.params.projectId === 'string') {
      return request.params.projectId;
    }

    // From JWT
    if (request.headers?.authorization) {
      const claims = this.parseJWT(
        request.headers.authorization.replace(/^Bearer\s+/i, '')
      );
      if (claims?.project_id && typeof claims.project_id === 'string') {
        return claims.project_id;
      }
    }

    // From header
    if (request.headers?.['x-project-id']) {
      return request.headers['x-project-id'];
    }

    return undefined;
  }

  // ==========================================
  // USER-TENANT MAPPING
  // ==========================================

  /**
   * Get user's default tenant
   */
  getUserDefaultTenant(userId: string): string | null {
    const mapping = this.userTenantMappings.get(userId);
    return mapping?.defaultTenantId ?? null;
  }

  /**
   * Register user-tenant mapping
   */
  registerUserTenant(
    userId: string,
    tenantId: string,
    isDefault: boolean = false
  ): void {
    const existing = this.userTenantMappings.get(userId);

    if (existing) {
      if (!existing.tenants.includes(tenantId)) {
        existing.tenants.push(tenantId);
      }
      if (isDefault) {
        existing.defaultTenantId = tenantId;
      }
    } else {
      this.userTenantMappings.set(userId, {
        userId,
        defaultTenantId: tenantId,
        tenants: [tenantId],
      });
    }
  }

  /**
   * Check if user has access to tenant
   */
  userHasTenantAccess(userId: string, tenantId: string): boolean {
    const mapping = this.userTenantMappings.get(userId);
    return mapping?.tenants.includes(tenantId) ?? false;
  }

  // ==========================================
  // TENANT CONFIGURATION
  // ==========================================

  /**
   * Get allowed tools for a tenant
   */
  private async getTenantAllowedTools(
    tenantId: string
  ): Promise<string[] | undefined> {
    // In production, this would query a tenant configuration store
    // For now, return undefined (all tools allowed)
    return undefined;
  }

  /**
   * Determine data isolation boundary
   */
  private determineIsolationBoundary(
    request: TenantRequest
  ): 'project' | 'tenant' | 'global' {
    // If project ID is present, use project-level isolation
    if (request.params.projectId) {
      return 'project';
    }

    // Default to tenant-level isolation
    return 'tenant';
  }

  /**
   * Extract additional tenant metadata
   */
  private extractTenantMetadata(
    request: TenantRequest
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // Add any tenant-related params
    for (const key of ['region', 'environment', 'tier']) {
      if (request.params[key]) {
        metadata[key] = request.params[key];
      }
    }

    return metadata;
  }
}

// ============================================
// ERRORS
// ============================================

export class TenantNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

export class InvalidTenantIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantIdError';
  }
}

// ============================================
// EXPORTS
// ============================================

export default TenantContextExtractor;
