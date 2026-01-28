/**
 * Unit Tests: OAuth Scopes & Permissions
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.4 - OAuth Scopes & Permissions
 *
 * Tests ScopeManager for OAuth 2.1 permission scopes.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ScopeManager,
  STANDARD_SCOPES,
  ScopeDefinition,
  ScopeRequest,
} from '../../oauth/scopes.js';
import { CARSRiskLevel } from '../../cars/risk-levels.js';

describe('OAuth Scopes (oauth/scopes.ts)', () => {
  let scopeManager: ScopeManager;

  beforeEach(() => {
    scopeManager = new ScopeManager();
  });

  describe('STANDARD_SCOPES', () => {
    it('should define openid scope', () => {
      const scope = STANDARD_SCOPES.openid;
      expect(scope).toBeDefined();
      expect(scope!.id).toBe('openid');
      expect(scope!.requiresConsent).toBe(false);
      expect(scope!.sensitive).toBe(false);
    });

    it('should define profile scope', () => {
      const scope = STANDARD_SCOPES.profile;
      expect(scope).toBeDefined();
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.LOW);
    });

    it('should define email scope', () => {
      const scope = STANDARD_SCOPES.email;
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toEqual([]);
    });

    it('should define offline_access as sensitive', () => {
      const scope = STANDARD_SCOPES.offline_access;
      expect(scope).toBeDefined();
      expect(scope!.requiresConsent).toBe(true);
      expect(scope!.sensitive).toBe(true);
    });

    it('should define mcp:tools:read scope', () => {
      const scope = STANDARD_SCOPES['mcp:tools:read'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('list_tools');
      expect(scope!.allowedTools).toContain('describe_tool');
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.LOW);
    });

    it('should define mcp:files:read scope', () => {
      const scope = STANDARD_SCOPES['mcp:files:read'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('filesystem_read');
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.MEDIUM);
      expect(scope!.requiresConsent).toBe(true);
    });

    it('should define mcp:database:read scope', () => {
      const scope = STANDARD_SCOPES['mcp:database:read'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('database_query');
      expect(scope!.sensitive).toBe(true);
    });

    it('should define mcp:files:write as high risk', () => {
      const scope = STANDARD_SCOPES['mcp:files:write'];
      expect(scope).toBeDefined();
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.HIGH);
      expect(scope!.allowedTools).toContain('filesystem_write');
      expect(scope!.allowedTools).toContain('filesystem_delete');
    });

    it('should define mcp:database:write as high risk', () => {
      const scope = STANDARD_SCOPES['mcp:database:write'];
      expect(scope).toBeDefined();
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.HIGH);
      expect(scope!.allowedTools).toContain('database_insert');
      expect(scope!.allowedTools).toContain('database_update');
      expect(scope!.allowedTools).toContain('database_delete');
    });

    it('should define mcp:shell:execute as critical risk', () => {
      const scope = STANDARD_SCOPES['mcp:shell:execute'];
      expect(scope).toBeDefined();
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.CRITICAL);
      expect(scope!.allowedTools).toContain('shell_exec');
    });

    it('should define mcp:code:execute scope', () => {
      const scope = STANDARD_SCOPES['mcp:code:execute'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('code_execute');
      expect(scope!.allowedTools).toContain('deno_run');
    });

    it('should define mcp:network:fetch scope', () => {
      const scope = STANDARD_SCOPES['mcp:network:fetch'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('http_request');
      expect(scope!.allowedTools).toContain('web_fetch');
    });

    it('should define mcp:llm:invoke scope', () => {
      const scope = STANDARD_SCOPES['mcp:llm:invoke'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('llm_invoke');
      expect(scope!.allowedTools).toContain('llm_complete');
    });

    it('should define mcp:admin scope with all tools access', () => {
      const scope = STANDARD_SCOPES['mcp:admin'];
      expect(scope).toBeDefined();
      expect(scope!.allowedTools).toContain('*');
      expect(scope!.maxRiskLevel).toBe(CARSRiskLevel.CRITICAL);
      expect(scope!.requiresConsent).toBe(true);
      expect(scope!.sensitive).toBe(true);
    });
  });

  describe('ScopeManager Constructor', () => {
    it('should load all standard scopes on initialization', () => {
      const scopes = scopeManager.listScopes();
      expect(scopes.length).toBe(Object.keys(STANDARD_SCOPES).length);
    });
  });

  describe('registerScope', () => {
    it('should register a custom scope', () => {
      const customScope: ScopeDefinition = {
        id: 'custom:scope',
        name: 'Custom Scope',
        description: 'A custom scope for testing',
        allowedTools: ['custom_tool'],
        maxRiskLevel: CARSRiskLevel.MEDIUM,
        requiresConsent: true,
        sensitive: false,
      };

      scopeManager.registerScope(customScope);
      const retrieved = scopeManager.getScope('custom:scope');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Scope');
      expect(retrieved?.allowedTools).toContain('custom_tool');
    });

    it('should override existing scope with same ID', () => {
      const updatedScope: ScopeDefinition = {
        id: 'openid',
        name: 'Updated OpenID',
        description: 'Updated description',
        allowedTools: ['new_tool'],
        maxRiskLevel: CARSRiskLevel.HIGH,
        requiresConsent: true,
        sensitive: true,
      };

      scopeManager.registerScope(updatedScope);
      const retrieved = scopeManager.getScope('openid');

      expect(retrieved?.name).toBe('Updated OpenID');
      expect(retrieved?.maxRiskLevel).toBe(CARSRiskLevel.HIGH);
    });
  });

  describe('getScope', () => {
    it('should return scope definition for valid scope', () => {
      const scope = scopeManager.getScope('openid');
      expect(scope).toBeDefined();
      expect(scope?.id).toBe('openid');
    });

    it('should return undefined for unknown scope', () => {
      const scope = scopeManager.getScope('unknown:scope');
      expect(scope).toBeUndefined();
    });
  });

  describe('registerClientScopes', () => {
    it('should register allowed scopes for a client', () => {
      scopeManager.registerClientScopes('client-123', ['openid', 'profile']);

      const request: ScopeRequest = {
        scopes: ['openid', 'profile'],
        userId: 'user-1',
        clientId: 'client-123',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
      expect(result.granted).toContain('openid');
      expect(result.granted).toContain('profile');
    });

    it('should restrict client to registered scopes', () => {
      scopeManager.registerClientScopes('client-limited', ['openid']);

      const request: ScopeRequest = {
        scopes: ['openid', 'mcp:admin'],
        userId: 'user-1',
        clientId: 'client-limited',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(false);
      expect(result.granted).toContain('openid');
      expect(result.denied.length).toBe(1);
      expect(result.denied[0]!.scope).toBe('mcp:admin');
      expect(result.denied[0]!.reason).toContain('not authorized');
    });

    it('should allow all scopes with wildcard', () => {
      scopeManager.registerClientScopes('client-admin', ['*']);

      const request: ScopeRequest = {
        scopes: ['mcp:admin', 'mcp:shell:execute'],
        userId: 'user-1',
        clientId: 'client-admin',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
      expect(result.granted).toContain('mcp:admin');
      expect(result.granted).toContain('mcp:shell:execute');
    });
  });

  describe('validateScopes', () => {
    it('should validate valid scopes without client restrictions', () => {
      const request: ScopeRequest = {
        scopes: ['openid', 'profile', 'email'],
        userId: 'user-1',
        clientId: 'unrestricted-client',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
      expect(result.granted.length).toBe(3);
      expect(result.denied.length).toBe(0);
    });

    it('should deny unknown scopes', () => {
      const request: ScopeRequest = {
        scopes: ['openid', 'unknown:scope', 'another:unknown'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(false);
      expect(result.granted).toContain('openid');
      expect(result.denied.length).toBe(2);
      expect(result.denied[0]!.reason).toBe('Unknown scope');
    });

    it('should aggregate tool permissions from granted scopes', () => {
      const request: ScopeRequest = {
        scopes: ['mcp:tools:read', 'mcp:files:read'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.toolPermissions).toContain('list_tools');
      expect(result.toolPermissions).toContain('describe_tool');
      expect(result.toolPermissions).toContain('filesystem_read');
      expect(result.toolPermissions).toContain('file_search');
    });

    it('should calculate max risk level from granted scopes', () => {
      const request: ScopeRequest = {
        scopes: ['openid', 'mcp:files:write'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.maxRiskLevel).toBe(CARSRiskLevel.HIGH);
    });

    it('should return LOW risk level for low-risk scopes only', () => {
      const request: ScopeRequest = {
        scopes: ['openid', 'profile'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.maxRiskLevel).toBe(CARSRiskLevel.LOW);
    });

    it('should return CRITICAL risk level when admin scope granted', () => {
      const request: ScopeRequest = {
        scopes: ['mcp:admin'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.maxRiskLevel).toBe(CARSRiskLevel.CRITICAL);
    });

    it('should handle empty scope request', () => {
      const request: ScopeRequest = {
        scopes: [],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
      expect(result.granted.length).toBe(0);
      expect(result.toolPermissions.length).toBe(0);
    });

    it('should include tenant context in validation', () => {
      const request: ScopeRequest = {
        scopes: ['openid'],
        userId: 'user-1',
        clientId: 'client-1',
        tenantId: 'tenant-abc',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
    });
  });

  describe('canAccessTool', () => {
    it('should return true for tool in granted scope', () => {
      const grantedScopes = ['mcp:files:read'];
      expect(scopeManager.canAccessTool(grantedScopes, 'filesystem_read')).toBe(true);
      expect(scopeManager.canAccessTool(grantedScopes, 'file_search')).toBe(true);
    });

    it('should return false for tool not in granted scopes', () => {
      const grantedScopes = ['mcp:files:read'];
      expect(scopeManager.canAccessTool(grantedScopes, 'filesystem_write')).toBe(false);
      expect(scopeManager.canAccessTool(grantedScopes, 'shell_exec')).toBe(false);
    });

    it('should return true for any tool with admin scope', () => {
      const grantedScopes = ['mcp:admin'];
      expect(scopeManager.canAccessTool(grantedScopes, 'filesystem_write')).toBe(true);
      expect(scopeManager.canAccessTool(grantedScopes, 'shell_exec')).toBe(true);
      expect(scopeManager.canAccessTool(grantedScopes, 'any_tool')).toBe(true);
    });

    it('should handle unknown scopes gracefully', () => {
      const grantedScopes = ['unknown:scope'];
      expect(scopeManager.canAccessTool(grantedScopes, 'any_tool')).toBe(false);
    });

    it('should check multiple scopes for tool access', () => {
      const grantedScopes = ['mcp:files:read', 'mcp:files:write'];
      expect(scopeManager.canAccessTool(grantedScopes, 'filesystem_read')).toBe(true);
      expect(scopeManager.canAccessTool(grantedScopes, 'filesystem_write')).toBe(true);
    });

    it('should return false for empty granted scopes', () => {
      expect(scopeManager.canAccessTool([], 'any_tool')).toBe(false);
    });
  });

  describe('getMaxRiskLevel', () => {
    it('should return LOW for basic scopes', () => {
      const level = scopeManager.getMaxRiskLevel(['openid', 'profile']);
      expect(level).toBe(CARSRiskLevel.LOW);
    });

    it('should return MEDIUM for read scopes', () => {
      const level = scopeManager.getMaxRiskLevel(['openid', 'mcp:files:read']);
      expect(level).toBe(CARSRiskLevel.MEDIUM);
    });

    it('should return HIGH for write scopes', () => {
      const level = scopeManager.getMaxRiskLevel(['mcp:files:write']);
      expect(level).toBe(CARSRiskLevel.HIGH);
    });

    it('should return CRITICAL for admin/shell scopes', () => {
      const level = scopeManager.getMaxRiskLevel(['mcp:shell:execute']);
      expect(level).toBe(CARSRiskLevel.CRITICAL);
    });

    it('should return highest level among multiple scopes', () => {
      const level = scopeManager.getMaxRiskLevel([
        'openid',
        'mcp:files:read',
        'mcp:shell:execute',
      ]);
      expect(level).toBe(CARSRiskLevel.CRITICAL);
    });

    it('should handle unknown scopes and return LOW', () => {
      const level = scopeManager.getMaxRiskLevel(['unknown:scope']);
      expect(level).toBe(CARSRiskLevel.LOW);
    });

    it('should return LOW for empty scope list', () => {
      const level = scopeManager.getMaxRiskLevel([]);
      expect(level).toBe(CARSRiskLevel.LOW);
    });
  });

  describe('getConsentRequired', () => {
    it('should return scopes that require consent', () => {
      const scopes = scopeManager.getConsentRequired([
        'openid',
        'offline_access',
        'mcp:files:write',
      ]);

      expect(scopes.length).toBe(2);
      expect(scopes.map((s) => s.id)).toContain('offline_access');
      expect(scopes.map((s) => s.id)).toContain('mcp:files:write');
    });

    it('should return empty for scopes not requiring consent', () => {
      const scopes = scopeManager.getConsentRequired(['openid', 'profile', 'email']);
      expect(scopes.length).toBe(0);
    });

    it('should filter out unknown scopes', () => {
      const scopes = scopeManager.getConsentRequired(['openid', 'unknown:scope']);
      expect(scopes.length).toBe(0);
    });
  });

  describe('getSensitiveScopes', () => {
    it('should return sensitive scopes', () => {
      const scopes = scopeManager.getSensitiveScopes([
        'openid',
        'offline_access',
        'mcp:database:read',
        'mcp:admin',
      ]);

      expect(scopes.length).toBe(3);
      expect(scopes.map((s) => s.id)).toContain('offline_access');
      expect(scopes.map((s) => s.id)).toContain('mcp:database:read');
      expect(scopes.map((s) => s.id)).toContain('mcp:admin');
    });

    it('should return empty for non-sensitive scopes', () => {
      const scopes = scopeManager.getSensitiveScopes(['openid', 'profile']);
      expect(scopes.length).toBe(0);
    });
  });

  describe('parseScopes', () => {
    it('should parse space-separated scope string', () => {
      const scopes = scopeManager.parseScopes('openid profile email');
      expect(scopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should handle multiple spaces', () => {
      const scopes = scopeManager.parseScopes('openid   profile    email');
      expect(scopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should handle tabs and mixed whitespace', () => {
      const scopes = scopeManager.parseScopes('openid\tprofile\n email');
      expect(scopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should return empty array for empty string', () => {
      const scopes = scopeManager.parseScopes('');
      expect(scopes).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      const scopes = scopeManager.parseScopes('   \t\n  ');
      expect(scopes).toEqual([]);
    });

    it('should handle single scope', () => {
      const scopes = scopeManager.parseScopes('openid');
      expect(scopes).toEqual(['openid']);
    });
  });

  describe('formatScopes', () => {
    it('should format scopes as space-separated string', () => {
      const formatted = scopeManager.formatScopes(['openid', 'profile', 'email']);
      expect(formatted).toBe('openid profile email');
    });

    it('should return empty string for empty array', () => {
      const formatted = scopeManager.formatScopes([]);
      expect(formatted).toBe('');
    });

    it('should handle single scope', () => {
      const formatted = scopeManager.formatScopes(['openid']);
      expect(formatted).toBe('openid');
    });
  });

  describe('listScopes', () => {
    it('should return all registered scopes', () => {
      const scopes = scopeManager.listScopes();
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes.find((s) => s.id === 'openid')).toBeDefined();
      expect(scopes.find((s) => s.id === 'mcp:admin')).toBeDefined();
    });

    it('should include custom registered scopes', () => {
      scopeManager.registerScope({
        id: 'custom:test',
        name: 'Custom Test',
        description: 'Test scope',
        allowedTools: [],
        maxRiskLevel: CARSRiskLevel.LOW,
        requiresConsent: false,
        sensitive: false,
      });

      const scopes = scopeManager.listScopes();
      expect(scopes.find((s) => s.id === 'custom:test')).toBeDefined();
    });
  });

  describe('Risk Level Comparison', () => {
    it('should correctly compare MINIMAL < LOW', () => {
      // Register a MINIMAL risk scope
      scopeManager.registerScope({
        id: 'minimal:scope',
        name: 'Minimal',
        description: 'Minimal risk',
        allowedTools: [],
        maxRiskLevel: CARSRiskLevel.MINIMAL,
        requiresConsent: false,
        sensitive: false,
      });

      const level = scopeManager.getMaxRiskLevel(['minimal:scope', 'openid']);
      expect(level).toBe(CARSRiskLevel.LOW);
    });

    it('should correctly compare all risk levels in order', () => {
      // Register scopes for each level
      const levels = [
        CARSRiskLevel.MINIMAL,
        CARSRiskLevel.LOW,
        CARSRiskLevel.MEDIUM,
        CARSRiskLevel.HIGH,
        CARSRiskLevel.CRITICAL,
      ];

      levels.forEach((level, index) => {
        scopeManager.registerScope({
          id: `test:level:${index}`,
          name: `Level ${index}`,
          description: `Risk level ${index}`,
          allowedTools: [],
          maxRiskLevel: level,
          requiresConsent: false,
          sensitive: false,
        });
      });

      // Getting max of all should return CRITICAL
      const maxLevel = scopeManager.getMaxRiskLevel([
        'test:level:0',
        'test:level:1',
        'test:level:2',
        'test:level:3',
        'test:level:4',
      ]);
      expect(maxLevel).toBe(CARSRiskLevel.CRITICAL);
    });
  });

  describe('Edge Cases', () => {
    it('should handle scope with empty allowed tools', () => {
      const scope = scopeManager.getScope('openid');
      expect(scope?.allowedTools).toEqual([]);
    });

    it('should handle validateScopes with duplicate scopes', () => {
      const request: ScopeRequest = {
        scopes: ['openid', 'openid', 'profile'],
        userId: 'user-1',
        clientId: 'client-1',
      };

      const result = scopeManager.validateScopes(request);
      expect(result.valid).toBe(true);
      // Duplicates are processed but result in same permissions
      expect(result.granted.filter((s) => s === 'openid').length).toBe(2);
    });

    it('should handle riskLevelValue for undefined level', () => {
      // This tests the ?? 0 fallback in riskLevelValue
      scopeManager.registerScope({
        id: 'weird:scope',
        name: 'Weird',
        description: 'Scope with undefined behavior',
        allowedTools: [],
        maxRiskLevel: 'UNKNOWN' as unknown as CARSRiskLevel,
        requiresConsent: false,
        sensitive: false,
      });

      const level = scopeManager.getMaxRiskLevel(['weird:scope']);
      // Should fallback to LOW since UNKNOWN maps to 0
      expect(level).toBe(CARSRiskLevel.LOW);
    });
  });
});
