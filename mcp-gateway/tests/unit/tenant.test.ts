/**
 * Unit Tests: Tenant Isolation Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.5-3.6.8 - Tenant Isolation
 *
 * Tests context extraction, isolation enforcement, and leak detection
 */

import {
  TenantContextExtractor,
  TenantIsolationEngine,
  CrossTenantLeakDetector,
  CrossTenantViolationError,
} from '../../tenant/index.js';

// ============================================
// TENANT CONTEXT EXTRACTOR TESTS (Task 3.6.5)
// ============================================

describe('TenantContextExtractor', () => {
  let extractor: TenantContextExtractor;

  beforeEach(() => {
    extractor = new TenantContextExtractor({
      tenantHeader: 'x-tenant-id',
      tenantClaim: 'tenant_id',
      tenantParam: 'tenantId',
      fallbackTenant: 'default-tenant',
    });
  });

  describe('extractTenantId', () => {
    it('should extract tenant from params (highest priority)', () => {
      const tenantId = extractor.extractTenantId({
        params: { tenantId: 'param-tenant' },
        headers: { 'x-tenant-id': 'header-tenant' },
      });
      expect(tenantId).toBe('param-tenant');
    });

    it('should extract tenant from header', () => {
      const tenantId = extractor.extractTenantId({
        params: {},
        headers: { 'x-tenant-id': 'header-tenant' },
      });
      expect(tenantId).toBe('header-tenant');
    });

    it('should use fallback when no tenant found', () => {
      const tenantId = extractor.extractTenantId({
        params: {},
        headers: {},
      });
      expect(tenantId).toBe('default-tenant');
    });

    it('should use registered user default tenant', () => {
      extractor.registerUserTenant('user-123', 'user-default-tenant', true);

      const tenantId = extractor.extractTenantId({
        params: {},
        headers: {},
        userId: 'user-123',
      });
      expect(tenantId).toBe('user-default-tenant');
    });
  });

  describe('extractTenantContext', () => {
    it('should build full tenant context', async () => {
      const context = await extractor.extractTenantContext({
        params: {},
        headers: { 'x-tenant-id': 'test-tenant' },
        userId: 'user-123',
      });

      expect(context.tenantId).toBe('test-tenant');
    });
  });

  describe('registerUserTenant', () => {
    it('should register user tenant mapping', () => {
      extractor.registerUserTenant('user-123', 'tenant-a');
      extractor.registerUserTenant('user-123', 'tenant-b', true); // default

      // Check that user has access to both tenants
      expect(extractor.userHasTenantAccess('user-123', 'tenant-a')).toBe(true);
      expect(extractor.userHasTenantAccess('user-123', 'tenant-b')).toBe(true);
    });
  });
});

// ============================================
// TENANT ISOLATION ENGINE TESTS (Task 3.6.6)
// ============================================

describe('TenantIsolationEngine', () => {
  let engine: TenantIsolationEngine;

  beforeEach(() => {
    engine = new TenantIsolationEngine({
      strictMode: true,
      crossTenantReadTools: ['audit_log', 'system_status'],
    });
  });

  describe('enforceTenantBoundary', () => {
    it('should allow same-tenant access', async () => {
      // Register user access first
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      await expect(
        engine.enforceTenantBoundary(
          {
            tool: 'database_query',
            params: { tenantId: 'tenant-a' },
            userId: 'user-1',
          },
          { tenantId: 'tenant-a', dataIsolationBoundary: 'tenant' }
        )
      ).resolves.not.toThrow();
    });

    it('should block cross-tenant access', async () => {
      // Register user access first
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      await expect(
        engine.enforceTenantBoundary(
          {
            tool: 'database_query',
            params: { tenantId: 'tenant-b' }, // Different tenant
            userId: 'user-1',
          },
          { tenantId: 'tenant-a', dataIsolationBoundary: 'tenant' }
        )
      ).rejects.toThrow(CrossTenantViolationError);
    });

    it('should allow whitelisted cross-tenant tools', async () => {
      // Register user access first
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      // Cross-tenant read tools are allowed in non-strict mode
      const nonStrictEngine = new TenantIsolationEngine({
        strictMode: false,
        crossTenantReadTools: ['audit_log', 'system_status'],
      });
      nonStrictEngine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      const allowed = nonStrictEngine.isCrossTenantAllowed('audit_log', 'read');
      expect(allowed).toBe(true);
    });
  });

  describe('validateRequest', () => {
    it('should validate request and return result', async () => {
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      const result = await engine.validateRequest(
        {
          tool: 'database_query',
          params: { tenantId: 'tenant-a' },
          userId: 'user-1',
        },
        { tenantId: 'tenant-a', dataIsolationBoundary: 'tenant' }
      );

      expect(result.allowed).toBe(true);
    });

    it('should detect violations', async () => {
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read', 'write'],
      });

      const result = await engine.validateRequest(
        {
          tool: 'database_query',
          params: { tenantId: 'tenant-b' },
          userId: 'user-1',
        },
        { tenantId: 'tenant-a', dataIsolationBoundary: 'tenant' }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('registerUserAccess', () => {
    it('should allow multi-tenant access for registered users', async () => {
      // Register access to multiple tenants
      engine.registerUserAccess({
        userId: 'admin-user',
        tenantId: 'tenant-a',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
      });
      engine.registerUserAccess({
        userId: 'admin-user',
        tenantId: 'tenant-b',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
      });

      const result = await engine.validateRequest(
        {
          tool: 'database_query',
          params: {},
          userId: 'admin-user',
        },
        { tenantId: 'tenant-b', dataIsolationBoundary: 'tenant' }
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkTenantAccess', () => {
    it('should check tenant access correctly', async () => {
      engine.registerUserAccess({
        userId: 'user-1',
        tenantId: 'tenant-a',
        role: 'member',
        permissions: ['read'],
      });

      const hasAccess = await engine.checkTenantAccess('user-1', 'tenant-a');
      expect(hasAccess).toBe(true);

      const noAccess = await engine.checkTenantAccess('user-1', 'tenant-b');
      expect(noAccess).toBe(false);
    });
  });
});

// ============================================
// CROSS-TENANT LEAK DETECTOR TESTS (Task 3.6.7)
// ============================================

describe('CrossTenantLeakDetector', () => {
  let detector: CrossTenantLeakDetector;

  beforeEach(() => {
    detector = new CrossTenantLeakDetector({
      detectPII: true,
      detectEmails: true,
      detectPhones: true,
    });

    // Register known tenants using prefixed IDs that match detection patterns
    detector.registerTenant('tenant_abc123');
    detector.registerTenant('tenant_xyz789');
    detector.registerTenant('org_def456');
  });

  describe('scanResponse', () => {
    it('should detect no leaks for clean response', async () => {
      const result = await detector.scanResponse(
        { message: 'Hello world', data: [1, 2, 3] },
        'tenant_abc123'
      );

      expect(result.safe).toBe(true);
      expect(result.leaks).toHaveLength(0);
    });

    it('should detect leaked tenant ID', async () => {
      const result = await detector.scanResponse(
        { message: 'Data from tenant_xyz789', tenantId: 'tenant_xyz789' },
        'tenant_abc123' // Different tenant
      );

      expect(result.safe).toBe(false);
      expect(result.leaks.length).toBeGreaterThan(0);
    });

    it('should allow same-tenant references', async () => {
      // Disable PII detection for this test to focus on tenant detection
      const detectorNoPII = new CrossTenantLeakDetector({
        detectPII: false,
        detectEmails: false,
        detectPhones: false,
      });
      detectorNoPII.registerTenant('tenant_abc123');

      const result = await detectorNoPII.scanResponse(
        { tenantId: 'tenant_abc123', data: 'clean data' },
        'tenant_abc123'
      );

      expect(result.safe).toBe(true);
    });
  });

  describe('sanitizeResponse', () => {
    it('should redact leaked tenant IDs', async () => {
      const original = {
        message: 'Data',
        secretTenant: 'tenant_xyz789',
      };

      const scanResult = await detector.scanResponse(original, 'tenant_abc123');

      // Verify leaks were detected
      expect(scanResult.safe).toBe(false);
      expect(scanResult.leaks.length).toBeGreaterThan(0);

      // The response from scanResponse is already sanitized when autoSanitize is true
      const sanitizedResponse = scanResult.response as Record<string, unknown>;
      expect(sanitizedResponse.secretTenant).not.toBe('tenant_xyz789');
    });
  });

  describe('registerTenant', () => {
    it('should register known tenants', async () => {
      detector.registerTenant('customer_new123');

      const result = await detector.scanResponse(
        { data: 'customer_new123' },
        'tenant_abc123'
      );

      expect(result.safe).toBe(false);
    });
  });

  describe('extractTenantIds', () => {
    it('should extract tenant IDs from text', () => {
      const ids = detector.extractTenantIds('Found tenant_abc and org_xyz in the text');
      expect(ids.length).toBeGreaterThan(0);
    });
  });
});
