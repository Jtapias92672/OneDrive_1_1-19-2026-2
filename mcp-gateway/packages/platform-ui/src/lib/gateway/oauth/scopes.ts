/**
 * MCP Security Gateway - Permission Scopes
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.4 - OAuth Scopes & Permissions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   OAuth 2.1 permission scopes for MCP tool access control.
 *   Maps scopes to tool permissions and CARS risk levels.
 */

import { CARSRiskLevel } from '../cars/risk-levels';

// ============================================
// TYPES
// ============================================

/**
 * Scope definition
 */
export interface ScopeDefinition {
  /** Scope identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this scope allows */
  description: string;

  /** Tools this scope grants access to */
  allowedTools: string[];

  /** Maximum CARS risk level allowed */
  maxRiskLevel: CARSRiskLevel;

  /** Whether scope requires explicit consent */
  requiresConsent: boolean;

  /** Whether scope is sensitive (shown with warning) */
  sensitive: boolean;
}

/**
 * Scope request for authorization
 */
export interface ScopeRequest {
  /** Requested scopes */
  scopes: string[];

  /** User ID */
  userId: string;

  /** Client ID */
  clientId: string;

  /** Tenant context */
  tenantId?: string;
}

/**
 * Scope validation result
 */
export interface ScopeValidationResult {
  /** Whether all scopes are valid */
  valid: boolean;

  /** Granted scopes */
  granted: string[];

  /** Denied scopes with reasons */
  denied: Array<{ scope: string; reason: string }>;

  /** Effective tool permissions */
  toolPermissions: string[];

  /** Maximum risk level from granted scopes */
  maxRiskLevel: CARSRiskLevel;
}

// ============================================
// STANDARD SCOPES
// ============================================

/**
 * Standard MCP Gateway scopes
 */
export const STANDARD_SCOPES: Record<string, ScopeDefinition> = {
  // OpenID Connect scopes
  openid: {
    id: 'openid',
    name: 'OpenID',
    description: 'Access to user identity',
    allowedTools: [],
    maxRiskLevel: CARSRiskLevel.LOW,
    requiresConsent: false,
    sensitive: false,
  },

  profile: {
    id: 'profile',
    name: 'Profile',
    description: 'Access to user profile information',
    allowedTools: [],
    maxRiskLevel: CARSRiskLevel.LOW,
    requiresConsent: false,
    sensitive: false,
  },

  email: {
    id: 'email',
    name: 'Email',
    description: 'Access to user email address',
    allowedTools: [],
    maxRiskLevel: CARSRiskLevel.LOW,
    requiresConsent: false,
    sensitive: false,
  },

  offline_access: {
    id: 'offline_access',
    name: 'Offline Access',
    description: 'Maintain access when you are not present',
    allowedTools: [],
    maxRiskLevel: CARSRiskLevel.LOW,
    requiresConsent: true,
    sensitive: true,
  },

  // MCP Tool scopes - Read operations
  'mcp:tools:read': {
    id: 'mcp:tools:read',
    name: 'Read Tools',
    description: 'List and inspect available MCP tools',
    allowedTools: ['list_tools', 'describe_tool', 'tool_status'],
    maxRiskLevel: CARSRiskLevel.LOW,
    requiresConsent: false,
    sensitive: false,
  },

  'mcp:files:read': {
    id: 'mcp:files:read',
    name: 'Read Files',
    description: 'Read files from allowed directories',
    allowedTools: ['filesystem_read', 'file_search', 'file_list'],
    maxRiskLevel: CARSRiskLevel.MEDIUM,
    requiresConsent: true,
    sensitive: false,
  },

  'mcp:database:read': {
    id: 'mcp:database:read',
    name: 'Read Database',
    description: 'Execute read-only database queries',
    allowedTools: ['database_query', 'database_describe'],
    maxRiskLevel: CARSRiskLevel.MEDIUM,
    requiresConsent: true,
    sensitive: true,
  },

  // MCP Tool scopes - Write operations
  'mcp:files:write': {
    id: 'mcp:files:write',
    name: 'Write Files',
    description: 'Create and modify files in allowed directories',
    allowedTools: ['filesystem_write', 'filesystem_delete', 'file_create'],
    maxRiskLevel: CARSRiskLevel.HIGH,
    requiresConsent: true,
    sensitive: true,
  },

  'mcp:database:write': {
    id: 'mcp:database:write',
    name: 'Write Database',
    description: 'Insert, update, and delete database records',
    allowedTools: ['database_insert', 'database_update', 'database_delete'],
    maxRiskLevel: CARSRiskLevel.HIGH,
    requiresConsent: true,
    sensitive: true,
  },

  // MCP Tool scopes - Execute operations
  'mcp:shell:execute': {
    id: 'mcp:shell:execute',
    name: 'Execute Shell Commands',
    description: 'Run shell commands in sandboxed environment',
    allowedTools: ['shell_exec', 'script_run'],
    maxRiskLevel: CARSRiskLevel.CRITICAL,
    requiresConsent: true,
    sensitive: true,
  },

  'mcp:code:execute': {
    id: 'mcp:code:execute',
    name: 'Execute Code',
    description: 'Run code in sandboxed Deno environment',
    allowedTools: ['code_execute', 'deno_run'],
    maxRiskLevel: CARSRiskLevel.HIGH,
    requiresConsent: true,
    sensitive: true,
  },

  // MCP Tool scopes - Network operations
  'mcp:network:fetch': {
    id: 'mcp:network:fetch',
    name: 'Network Fetch',
    description: 'Make HTTP requests to allowed domains',
    allowedTools: ['http_request', 'web_fetch', 'api_call'],
    maxRiskLevel: CARSRiskLevel.MEDIUM,
    requiresConsent: true,
    sensitive: false,
  },

  // LLM operations
  'mcp:llm:invoke': {
    id: 'mcp:llm:invoke',
    name: 'Invoke LLM',
    description: 'Send prompts to language models',
    allowedTools: ['llm_invoke', 'llm_complete', 'llm_chat'],
    maxRiskLevel: CARSRiskLevel.MEDIUM,
    requiresConsent: true,
    sensitive: false,
  },

  // Admin scopes
  'mcp:admin': {
    id: 'mcp:admin',
    name: 'Admin Access',
    description: 'Full administrative access to MCP gateway',
    allowedTools: ['*'],
    maxRiskLevel: CARSRiskLevel.CRITICAL,
    requiresConsent: true,
    sensitive: true,
  },
};

// ============================================
// SCOPE MANAGER
// ============================================

/**
 * Scope Manager
 *
 * Validates and manages OAuth scopes for MCP tool access.
 */
export class ScopeManager {
  private scopes: Map<string, ScopeDefinition> = new Map();
  private clientScopes: Map<string, Set<string>> = new Map();

  constructor() {
    // Load standard scopes
    for (const [id, scope] of Object.entries(STANDARD_SCOPES)) {
      this.scopes.set(id, scope);
    }
  }

  /**
   * Register a custom scope
   */
  registerScope(scope: ScopeDefinition): void {
    this.scopes.set(scope.id, scope);
  }

  /**
   * Get scope definition
   */
  getScope(scopeId: string): ScopeDefinition | undefined {
    return this.scopes.get(scopeId);
  }

  /**
   * Register allowed scopes for a client
   */
  registerClientScopes(clientId: string, scopes: string[]): void {
    this.clientScopes.set(clientId, new Set(scopes));
  }

  /**
   * Validate requested scopes
   */
  validateScopes(request: ScopeRequest): ScopeValidationResult {
    const granted: string[] = [];
    const denied: Array<{ scope: string; reason: string }> = [];
    const toolPermissions = new Set<string>();
    let maxRiskLevel = CARSRiskLevel.LOW;

    const clientAllowed = this.clientScopes.get(request.clientId);

    for (const scopeId of request.scopes) {
      const scope = this.scopes.get(scopeId);

      if (!scope) {
        denied.push({ scope: scopeId, reason: 'Unknown scope' });
        continue;
      }

      // Check if client is allowed this scope
      if (clientAllowed && !clientAllowed.has(scopeId) && !clientAllowed.has('*')) {
        denied.push({ scope: scopeId, reason: 'Client not authorized for this scope' });
        continue;
      }

      // Grant scope
      granted.push(scopeId);

      // Add tool permissions
      for (const tool of scope.allowedTools) {
        toolPermissions.add(tool);
      }

      // Track max risk level
      if (this.riskLevelValue(scope.maxRiskLevel) > this.riskLevelValue(maxRiskLevel)) {
        maxRiskLevel = scope.maxRiskLevel;
      }
    }

    return {
      valid: denied.length === 0,
      granted,
      denied,
      toolPermissions: Array.from(toolPermissions),
      maxRiskLevel,
    };
  }

  /**
   * Check if scopes allow a specific tool
   */
  canAccessTool(grantedScopes: string[], toolName: string): boolean {
    for (const scopeId of grantedScopes) {
      const scope = this.scopes.get(scopeId);
      if (!scope) continue;

      if (scope.allowedTools.includes('*') || scope.allowedTools.includes(toolName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get maximum risk level for granted scopes
   */
  getMaxRiskLevel(grantedScopes: string[]): CARSRiskLevel {
    let maxLevel = CARSRiskLevel.LOW;

    for (const scopeId of grantedScopes) {
      const scope = this.scopes.get(scopeId);
      if (!scope) continue;

      if (this.riskLevelValue(scope.maxRiskLevel) > this.riskLevelValue(maxLevel)) {
        maxLevel = scope.maxRiskLevel;
      }
    }

    return maxLevel;
  }

  /**
   * Get all scopes that require consent
   */
  getConsentRequired(scopes: string[]): ScopeDefinition[] {
    return scopes
      .map(id => this.scopes.get(id))
      .filter((s): s is ScopeDefinition => s !== undefined && s.requiresConsent);
  }

  /**
   * Get all sensitive scopes
   */
  getSensitiveScopes(scopes: string[]): ScopeDefinition[] {
    return scopes
      .map(id => this.scopes.get(id))
      .filter((s): s is ScopeDefinition => s !== undefined && s.sensitive);
  }

  /**
   * Parse scope string (space-separated)
   */
  parseScopes(scopeString: string): string[] {
    return scopeString.split(/\s+/).filter(s => s.length > 0);
  }

  /**
   * Format scopes as string
   */
  formatScopes(scopes: string[]): string {
    return scopes.join(' ');
  }

  /**
   * List all registered scopes
   */
  listScopes(): ScopeDefinition[] {
    return Array.from(this.scopes.values());
  }

  /**
   * Convert risk level to numeric value for comparison
   */
  private riskLevelValue(level: CARSRiskLevel): number {
    const values: Record<CARSRiskLevel, number> = {
      [CARSRiskLevel.MINIMAL]: 0,
      [CARSRiskLevel.LOW]: 1,
      [CARSRiskLevel.MEDIUM]: 2,
      [CARSRiskLevel.HIGH]: 3,
      [CARSRiskLevel.CRITICAL]: 4,
    };
    return values[level] ?? 0;
  }
}

// ============================================
// EXPORTS
// ============================================

export default ScopeManager;
