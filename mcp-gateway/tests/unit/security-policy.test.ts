/**
 * Unit Tests: Sandbox Security Policy Engine
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.13 - Sandbox Security Policy
 *
 * Tests SecurityPolicyEngine for capability-based access control.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  SecurityPolicyEngine,
  MINIMAL_POLICY,
  STANDARD_POLICY,
  SecurityPolicy,
  PolicyViolation,
} from '../../sandbox/security-policy.js';

describe('Sandbox Security Policy (sandbox/security-policy.ts)', () => {
  let engine: SecurityPolicyEngine;

  beforeEach(() => {
    engine = new SecurityPolicyEngine();
  });

  describe('MINIMAL_POLICY', () => {
    it('should have enforce mode', () => {
      expect(MINIMAL_POLICY.mode).toBe('enforce');
    });

    it('should deny SYS_ADMIN capability', () => {
      const grant = MINIMAL_POLICY.capabilities.find(
        (c) => c.capability === 'CAP_SYS_ADMIN'
      );
      expect(grant).toBeDefined();
      expect(grant!.action).toBe('deny');
    });

    it('should allow basic MCP tool capabilities', () => {
      const readGrant = MINIMAL_POLICY.capabilities.find(
        (c) => c.capability === 'mcp:tool:read'
      );
      expect(readGrant?.action).toBe('allow');
    });

    it('should have deny default action for syscalls', () => {
      expect(MINIMAL_POLICY.syscalls.defaultAction).toBe('deny');
    });

    it('should allow basic syscalls', () => {
      expect(MINIMAL_POLICY.syscalls.allowed.some((s) => s.syscall === 'read')).toBe(true);
      expect(MINIMAL_POLICY.syscalls.allowed.some((s) => s.syscall === 'mmap')).toBe(true);
    });

    it('should deny dangerous syscalls with kill action', () => {
      const execveDeny = MINIMAL_POLICY.syscalls.denied.find((s) => s.syscall === 'execve');
      expect(execveDeny?.action).toBe('kill');
    });

    it('should disable network access', () => {
      expect(MINIMAL_POLICY.network.enabled).toBe(false);
    });

    it('should disable filesystem access', () => {
      expect(MINIMAL_POLICY.filesystem.enabled).toBe(false);
    });

    it('should have strict memory limits', () => {
      expect(MINIMAL_POLICY.resources.memory.limitBytes).toBe(64 * 1024 * 1024);
    });

    it('should allow only 1 process', () => {
      expect(MINIMAL_POLICY.resources.pids.max).toBe(1);
    });

    it('should clear inherited environment', () => {
      expect(MINIMAL_POLICY.environment.clearInherited).toBe(true);
    });

    it('should enable audit logging', () => {
      expect(MINIMAL_POLICY.audit.enabled).toBe(true);
    });
  });

  describe('STANDARD_POLICY', () => {
    it('should have enforce mode', () => {
      expect(STANDARD_POLICY.mode).toBe('enforce');
    });

    it('should allow network binding', () => {
      const grant = STANDARD_POLICY.capabilities.find(
        (c) => c.capability === 'CAP_NET_BIND_SERVICE'
      );
      expect(grant?.action).toBe('allow');
    });

    it('should allow HTTP networking', () => {
      const grant = STANDARD_POLICY.capabilities.find(
        (c) => c.capability === 'mcp:network:http'
      );
      expect(grant?.action).toBe('allow');
    });

    it('should have allow default action for syscalls', () => {
      expect(STANDARD_POLICY.syscalls.defaultAction).toBe('allow');
    });

    it('should enable network with HTTPS egress', () => {
      expect(STANDARD_POLICY.network.enabled).toBe(true);
      const httpsRule = STANDARD_POLICY.network.egress.find((r) => r.id === 'https');
      expect(httpsRule?.action).toBe('allow');
      expect(httpsRule?.ports?.start).toBe(443);
    });

    it('should enable filesystem with readonly root', () => {
      expect(STANDARD_POLICY.filesystem.enabled).toBe(true);
      expect(STANDARD_POLICY.filesystem.rootMode).toBe('readonly');
    });

    it('should have generous memory limits', () => {
      expect(STANDARD_POLICY.resources.memory.limitBytes).toBe(512 * 1024 * 1024);
    });

    it('should allow multiple processes', () => {
      expect(STANDARD_POLICY.resources.pids.max).toBe(100);
    });

    it('should block sensitive env vars', () => {
      expect(STANDARD_POLICY.environment.blocked).toContain('AWS_*');
      expect(STANDARD_POLICY.environment.blocked).toContain('SECRET_*');
    });
  });

  describe('Constructor', () => {
    it('should create with standard policy as default', () => {
      const e = new SecurityPolicyEngine();
      const defaultPolicy = e.getDefaultPolicy();
      expect(defaultPolicy).toBeDefined();
      expect(defaultPolicy!.name).toBe('Standard Sandbox');
    });

    it('should create with minimal policy when specified', () => {
      const e = new SecurityPolicyEngine({ defaultPolicy: 'minimal' });
      const defaultPolicy = e.getDefaultPolicy();
      expect(defaultPolicy!.name).toBe('Minimal Sandbox');
    });

    it('should call violation callback when provided', () => {
      const violations: PolicyViolation[] = [];
      const e = new SecurityPolicyEngine({
        onViolation: (v) => violations.push(v),
      });

      const defaultPolicy = e.getDefaultPolicy();
      // Trigger a violation by denying a capability
      e.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_ADMIN');

      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('createPolicy', () => {
    it('should create a policy with ID and hash', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Test Policy',
      });

      expect(policy.id).toMatch(/^policy_/);
      expect(policy.hash).toBeDefined();
      expect(policy.hash.length).toBe(64); // SHA-256 hex
      expect(policy.createdAt).toBeDefined();
      expect(policy.updatedAt).toBeDefined();
    });
  });

  describe('registerPolicy', () => {
    it('should register a valid policy', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Custom Policy',
      });

      engine.registerPolicy(policy);
      expect(engine.getPolicy(policy.id)).toBeDefined();
    });

    it('should reject policy with invalid hash', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Tampered Policy',
      });

      // Tamper with the policy
      policy.hash = 'invalid_hash';

      expect(() => engine.registerPolicy(policy)).toThrow('integrity check failed');
    });
  });

  describe('getPolicy', () => {
    it('should return policy by ID', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const retrieved = engine.getPolicy(defaultPolicy!.id);
      expect(retrieved).toBe(defaultPolicy);
    });

    it('should return undefined for unknown ID', () => {
      expect(engine.getPolicy('unknown-id')).toBeUndefined();
    });
  });

  describe('setDefaultPolicy', () => {
    it('should set default policy', () => {
      const minimalPolicy = engine.createPolicy(MINIMAL_POLICY);
      engine.registerPolicy(minimalPolicy);
      engine.setDefaultPolicy(minimalPolicy.id);

      expect(engine.getDefaultPolicy()!.id).toBe(minimalPolicy.id);
    });

    it('should throw for unknown policy ID', () => {
      expect(() => engine.setDefaultPolicy('unknown-id')).toThrow('not found');
    });
  });

  describe('evaluateCapability', () => {
    it('should allow granted capability', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateCapability(defaultPolicy!.id, 'mcp:tool:read');

      expect(result.allowed).toBe(true);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it('should deny ungrantedcapability', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_ADMIN');

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should return error for unknown policy', () => {
      const result = engine.evaluateCapability('unknown-policy', 'mcp:tool:read');

      expect(result.allowed).toBe(false);
      expect(result.violations[0]!.description).toContain('not found');
    });

    it('should include evaluation time', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateCapability(defaultPolicy!.id, 'mcp:tool:read');

      expect(result.evaluationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should respect risk level condition', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Conditional Policy',
        capabilities: [
          {
            type: 'mcp',
            capability: 'mcp:fs:write',
            action: 'allow',
            condition: {
              riskLevel: ['LOW', 'MINIMAL'],
            },
          },
        ],
      });
      engine.registerPolicy(policy);

      // Should allow with LOW risk
      const lowResult = engine.evaluateCapability(policy.id, 'mcp:fs:write', {
        riskLevel: 'LOW',
      });
      expect(lowResult.allowed).toBe(true);

      // Should deny with HIGH risk
      const highResult = engine.evaluateCapability(policy.id, 'mcp:fs:write', {
        riskLevel: 'HIGH',
      });
      expect(highResult.allowed).toBe(false);
    });

    it('should respect tenant tier condition', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Tenant Policy',
        capabilities: [
          {
            type: 'mcp',
            capability: 'mcp:network:http',
            action: 'allow',
            condition: {
              tenantTier: ['premium', 'enterprise'],
            },
          },
        ],
      });
      engine.registerPolicy(policy);

      const premiumResult = engine.evaluateCapability(policy.id, 'mcp:network:http', {
        tenantTier: 'premium',
      });
      expect(premiumResult.allowed).toBe(true);

      const freeResult = engine.evaluateCapability(policy.id, 'mcp:network:http', {
        tenantTier: 'free',
      });
      expect(freeResult.allowed).toBe(false);
    });

    it('should allow in permissive mode even when denied', () => {
      const policy = engine.createPolicy({
        ...MINIMAL_POLICY,
        name: 'Permissive Policy',
        mode: 'permissive',
      });
      engine.registerPolicy(policy);

      const result = engine.evaluateCapability(policy.id, 'CAP_SYS_ADMIN');
      expect(result.allowed).toBe(true);
    });
  });

  describe('evaluateNetwork', () => {
    it('should allow HTTPS on standard policy', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateNetwork(defaultPolicy!.id, 'api.example.com', 443, 'tcp');

      expect(result.allowed).toBe(true);
      expect(result.matchedRules).toContain('https');
    });

    it('should deny non-standard ports', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateNetwork(defaultPolicy!.id, 'api.example.com', 8080, 'tcp');

      expect(result.allowed).toBe(false);
    });

    it('should deny when network disabled', () => {
      const policy = engine.createPolicy(MINIMAL_POLICY);
      engine.registerPolicy(policy);

      const result = engine.evaluateNetwork(policy.id, 'any.host.com', 443, 'tcp');

      expect(result.allowed).toBe(false);
      expect(result.matchedRules).toContain('network.enabled=false');
    });

    it('should return error for unknown policy', () => {
      const result = engine.evaluateNetwork('unknown', 'host.com', 443, 'tcp');
      expect(result.allowed).toBe(false);
    });

    it('should match wildcard destinations', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      // Standard policy allows * destination for HTTPS
      const result = engine.evaluateNetwork(defaultPolicy!.id, 'any.domain.com', 443, 'tcp');
      expect(result.allowed).toBe(true);
    });
  });

  describe('evaluateFilesystem', () => {
    it('should allow /tmp reads on standard policy', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateFilesystem(defaultPolicy!.id, '/tmp/file.txt', 'read');

      expect(result.allowed).toBe(true);
    });

    it('should deny /etc/shadow access', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateFilesystem(defaultPolicy!.id, '/etc/shadow', 'read');

      expect(result.allowed).toBe(false);
    });

    it('should deny execution in noExec paths', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateFilesystem(defaultPolicy!.id, '/tmp/script.sh', 'execute');

      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.description.includes('noexec'))).toBe(true);
    });

    it('should deny when filesystem disabled', () => {
      const policy = engine.createPolicy(MINIMAL_POLICY);
      engine.registerPolicy(policy);

      const result = engine.evaluateFilesystem(policy.id, '/any/path', 'read');

      expect(result.allowed).toBe(false);
      expect(result.matchedRules).toContain('filesystem.enabled=false');
    });

    it('should return error for unknown policy', () => {
      const result = engine.evaluateFilesystem('unknown', '/path', 'read');
      expect(result.allowed).toBe(false);
    });
  });

  describe('evaluateResources', () => {
    it('should allow resources within limits', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateResources(defaultPolicy!.id, {
        cpuMs: 1000,
        memoryBytes: 100 * 1024 * 1024,
        pids: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should deny CPU limit exceeded', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateResources(defaultPolicy!.id, {
        cpuMs: 100000, // Exceeds maxExecutionMs
      });

      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.type === 'resource_limit')).toBe(true);
      expect(result.matchedRules).toContain('cpu.maxExecutionMs');
    });

    it('should deny memory limit exceeded', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateResources(defaultPolicy!.id, {
        memoryBytes: 1024 * 1024 * 1024, // 1GB
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedRules).toContain('memory.limitBytes');
    });

    it('should deny PID limit exceeded', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const result = engine.evaluateResources(defaultPolicy!.id, {
        pids: 200,
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedRules).toContain('pids.max');
    });

    it('should return error for unknown policy', () => {
      const result = engine.evaluateResources('unknown', { cpuMs: 100 });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Violations Management', () => {
    it('should record violations', () => {
      const defaultPolicy = engine.getDefaultPolicy();

      // Generate some violations
      engine.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_ADMIN');
      engine.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_PTRACE');

      const violations = engine.getViolations();
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should limit violation history', () => {
      const defaultPolicy = engine.getDefaultPolicy();

      // Generate many violations
      for (let i = 0; i < 50; i++) {
        engine.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_ADMIN');
      }

      const violations = engine.getViolations(10);
      expect(violations.length).toBe(10);
    });

    it('should clear violations', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      engine.evaluateCapability(defaultPolicy!.id, 'CAP_SYS_ADMIN');

      engine.clearViolations();

      expect(engine.getViolations().length).toBe(0);
    });
  });

  describe('Policy Export/Import', () => {
    it('should export policy as JSON', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const json = engine.exportPolicy(defaultPolicy!.id);

      expect(json).not.toBeNull();
      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe(defaultPolicy!.id);
    });

    it('should return null for unknown policy', () => {
      expect(engine.exportPolicy('unknown')).toBeNull();
    });

    it('should import valid policy', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const json = engine.exportPolicy(defaultPolicy!.id);

      // Create new engine and import
      const newEngine = new SecurityPolicyEngine();
      const imported = newEngine.importPolicy(json!);

      expect(imported).not.toBeNull();
      expect(imported!.name).toBe(defaultPolicy!.name);
    });

    it('should reject tampered policy on import', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      const json = engine.exportPolicy(defaultPolicy!.id);
      const parsed = JSON.parse(json!);

      // Tamper with policy
      parsed.name = 'Tampered';

      const result = engine.importPolicy(JSON.stringify(parsed));
      expect(result).toBeNull();
    });

    it('should reject invalid JSON', () => {
      expect(engine.importPolicy('invalid json')).toBeNull();
    });
  });

  describe('Glob Matching', () => {
    it('should match exact paths', () => {
      const policy = engine.createPolicy({
        ...STANDARD_POLICY,
        filesystem: {
          ...STANDARD_POLICY.filesystem,
          pathAcls: [
            { path: '/exact/path', operations: ['read'], action: 'allow', priority: 1 },
          ],
        },
      });
      engine.registerPolicy(policy);

      const result = engine.evaluateFilesystem(policy.id, '/exact/path', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should match glob patterns with *', () => {
      const policy = engine.createPolicy({
        ...STANDARD_POLICY,
        filesystem: {
          ...STANDARD_POLICY.filesystem,
          pathAcls: [
            { path: '/data/*.txt', operations: ['read'], action: 'allow', priority: 1 },
          ],
        },
      });
      engine.registerPolicy(policy);

      const result = engine.evaluateFilesystem(policy.id, '/data/file.txt', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should match glob patterns with **', () => {
      const defaultPolicy = engine.getDefaultPolicy();
      // Standard policy has /** for read
      const result = engine.evaluateFilesystem(defaultPolicy!.id, '/any/deep/path/file.txt', 'read');
      expect(result.allowed).toBe(true);
    });
  });
});
