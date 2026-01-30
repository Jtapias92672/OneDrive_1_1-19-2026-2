/**
 * Phase 3 Integration Test
 *
 * Tests input sanitization END-TO-END with actual gateway instance
 * Verifies malicious inputs are blocked and legitimate inputs pass through
 */

import { MCPGateway } from '../../core/gateway.js';
import { MCPRequest } from '../../core/types.js';

describe('Phase 3: Input Sanitization Integration', () => {
  let gateway: MCPGateway;

  beforeEach(() => {
    // Initialize gateway with input sanitization enabled (Phase 3 config)
    gateway = new MCPGateway({
      security: {
        oauth: { enabled: false, pkceRequired: false, scopes: [] },
        inputSanitization: {
          enabled: true,  // Phase 3: Enable input sanitization
          maxInputSize: 1024 * 1024,
          allowedContentTypes: ['application/json'],
          blockPatterns: [
            '<script',
            'javascript:',
            'data:text/html',
            'onerror=',
            'onload=',
            'eval(',
            'Function(',
            'DROP TABLE',
            'DELETE FROM',
            '; --',
            'UNION SELECT',
          ],
        },
        toolIntegrity: { enabled: false, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
        supplyChain: { enabled: false, allowedRegistries: [], requireSBOM: false, vulnerabilityScan: false },
      },
      monitoring: {
        audit: { enabled: true, logLevel: 'info', includePayloads: true, retentionDays: 90 },
        anomalyDetection: { enabled: false, baseline: 100, alertThreshold: 3 },
        toolBehavior: { enabled: false, trackDescriptionChanges: false, alertOnChange: false },
      },
      approval: {
        enabled: false,
        defaultMode: 'never',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 30000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
      sandbox: {
        enabled: false,
        runtime: 'deno',
        limits: {
          maxCpuMs: 5000,
          maxMemoryMb: 512,
          maxDiskMb: 100,
          maxNetworkConnections: 10,
          executionTimeoutMs: 30000,
        },
        network: {
          allowEgress: false,
          allowedHosts: [],
          blockedHosts: [],
        },
        filesystem: {
          readOnly: [],
          writable: [],
          blocked: [],
        },
      },
    });

    // Register a test tool
    gateway.registerTool(
      {
        name: 'figma_getFile',
        description: 'Get Figma file metadata',
        version: '1.0.0',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string' },
          },
          required: ['fileKey'],
        },
        metadata: {
          author: 'test',
          source: 'test',
          riskLevel: 'low',
          permissions: ['network:read'],
          verificationStatus: 'verified',
        },
      },
      async (params) => {
        // Mock Figma API response
        return {
          name: 'Test File',
          fileKey: params.fileKey,
          lastModified: new Date().toISOString(),
        };
      }
    );
  });

  describe('XSS Attack Prevention', () => {
    it('blocks XSS script tag in fileKey parameter', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-xss-1',
        tool: 'figma_getFile',
        params: {
          fileKey: '<script>alert("xss")</script>',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      // Verify request was blocked
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
      expect(response.error?.message).toContain('blocked content');
    });

    it('blocks JavaScript protocol injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-xss-2',
        tool: 'figma_getFile',
        params: {
          fileKey: 'javascript:alert(1)',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('blocks event handler injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-xss-3',
        tool: 'figma_getFile',
        params: {
          fileKey: 'test" onerror="alert(1)',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('blocks DROP TABLE injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-sql-1',
        tool: 'figma_getFile',
        params: {
          fileKey: "'; DROP TABLE users; --",
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('blocks UNION SELECT injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-sql-2',
        tool: 'figma_getFile',
        params: {
          fileKey: "' UNION SELECT * FROM secrets --",
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('Code Injection Prevention', () => {
    it('blocks eval() injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-code-1',
        tool: 'figma_getFile',
        params: {
          fileKey: 'eval("malicious code")',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('blocks Function() constructor injection', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-code-2',
        tool: 'figma_getFile',
        params: {
          fileKey: 'new Function("return process.env")()',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('Legitimate Input Acceptance', () => {
    it('allows valid Figma file key', async () => {
      const legitimateRequest: MCPRequest = {
        id: 'test-valid-1',
        tool: 'figma_getFile',
        params: {
          fileKey: 'abc123-def456-ghi789',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(legitimateRequest);

      // Verify request succeeded
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect((response.data as any).fileKey).toBe('abc123-def456-ghi789');
    });

    it('allows alphanumeric file keys', async () => {
      const legitimateRequest: MCPRequest = {
        id: 'test-valid-2',
        tool: 'figma_getFile',
        params: {
          fileKey: 'Zxc9K8vVkw7Y6dF5hG3jJ1mN2',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(legitimateRequest);

      expect(response.success).toBe(true);
      expect((response.data as any).fileKey).toBe('Zxc9K8vVkw7Y6dF5hG3jJ1mN2');
    });

    it('allows file keys with hyphens and underscores', async () => {
      const legitimateRequest: MCPRequest = {
        id: 'test-valid-3',
        tool: 'figma_getFile',
        params: {
          fileKey: 'figma-file-key_12345',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(legitimateRequest);

      expect(response.success).toBe(true);
      expect((response.data as any).fileKey).toBe('figma-file-key_12345');
    });
  });

  describe('Edge Cases', () => {
    it('blocks malicious input embedded in larger string', async () => {
      const maliciousRequest: MCPRequest = {
        id: 'test-edge-1',
        tool: 'figma_getFile',
        params: {
          fileKey: 'valid-prefix-<script>alert(1)</script>-suffix',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(maliciousRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('allows empty string (if tool schema allows)', async () => {
      const emptyRequest: MCPRequest = {
        id: 'test-edge-2',
        tool: 'figma_getFile',
        params: {
          fileKey: '',
        },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await gateway.processRequest(emptyRequest);

      // Empty string should pass sanitization (schema validation is separate)
      expect(response.success).toBe(true);
    });
  });
});
