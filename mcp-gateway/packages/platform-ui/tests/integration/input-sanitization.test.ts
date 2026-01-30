/**
 * Phase 3: Input Sanitization Integration Tests
 *
 * Tests gateway input sanitization with mock MCP tools.
 * Verifies blocking of XSS, SQL injection, and path traversal attacks.
 */

import { MCPGateway } from '@/lib/gateway/core/gateway';
import { MCPTool, GatewayConfig } from '@/lib/gateway/core/types';

describe('Input Sanitization (Phase 3)', () => {
  let gateway: MCPGateway;
  const mockToolHandler = jest.fn(async (params: Record<string, unknown>) => {
    return { result: 'success', params };
  });

  beforeEach(() => {
    // Create gateway with input sanitization enabled
    const config: GatewayConfig = {
      security: {
        oauth: {
          enabled: false,
          issuer: '',
          clientId: '',
          scopes: [],
          pkceRequired: false,
        },
        inputSanitization: {
          enabled: true,
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
            '../',           // Path traversal
            '..\\',          // Windows path traversal
          ],
        },
        toolIntegrity: {
          enabled: false,
          hashAlgorithm: 'sha256',
          requireSignature: false,
          trustedSigners: [],
        },
        supplyChain: {
          enabled: false,
          allowedRegistries: [],
          requireSBOM: false,
          vulnerabilityScan: false,
        },
      },
      monitoring: {
        enabled: true,
        audit: {
          enabled: true,
          logLevel: 'info',
          includePayloads: true,
          retentionDays: 90,
        },
        anomalyDetection: {
          enabled: false,
          baseline: 0,
          alertThreshold: 0,
        },
        toolBehavior: {
          enabled: false,
          trackDescriptionChanges: false,
          alertOnChange: false,
        },
        metrics: {
          enabled: false,
          exportInterval: 60000,
        },
      },
      rateLimiting: {
        enabled: false,
        globalLimits: { maxRequestsPerMinute: 1000, maxRequestsPerHour: 10000 },
        toolLimits: {},
        tenantLimits: {},
      },
      approval: {
        enabled: false,
        carsIntegration: { enabled: false, apiEndpoint: '', apiKey: '' },
        defaultRiskThreshold: 'medium',
        timeout: 60000,
        failClosed: true,
      },
      sandbox: {
        enabled: false,
        runtime: 'deno',
        resourceLimits: {
          cpuMillis: 5000,
          memoryMB: 512,
          networkAllowed: true,
          filesystemReadOnly: true,
        },
        allowedModules: [],
      },
      privacy: {
        enabled: false,
        piiDetection: { enabled: false, patterns: [] },
        tokenization: { enabled: false, algorithm: 'aes-256-gcm', keyRotationDays: 90 },
      },
      tenant: {
        enabled: false,
        isolationMode: 'namespace',
        tenantIdHeader: 'x-tenant-id',
        crossTenantRules: [],
      },
      circuitBreaker: {
        enabled: false,
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenRequests: 3,
      },
    };

    gateway = new MCPGateway(config);

    // Register mock tool
    const mockTool: MCPTool = {
      name: 'test_echoTool',
      description: 'Echo tool for testing input sanitization',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          path: { type: 'string' },
          query: { type: 'string' },
        },
        required: ['message'],
      },
      metadata: {
        author: 'test',
        source: 'test',
        permissions: ['network:read'],
        riskLevel: 'low',
        verificationStatus: 'unverified',
      },
    };

    gateway.registerTool(mockTool, mockToolHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('XSS Attack Prevention', () => {
    it('should block <script> tags', async () => {
      const response = await gateway.processRequest({
        id: 'test-1',
        tool: 'test_echoTool',
        params: {
          message: '<script>alert("XSS")</script>',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
      expect(response.error?.message).toContain('blocked content');
      expect(mockToolHandler).not.toHaveBeenCalled();
    });

    it('should block javascript: protocol', async () => {
      const response = await gateway.processRequest({
        id: 'test-2',
        tool: 'test_echoTool',
        params: {
          message: 'Click here',
          path: 'javascript:void(0)',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('should block event handlers', async () => {
      const response = await gateway.processRequest({
        id: 'test-3',
        tool: 'test_echoTool',
        params: {
          message: '<img src=x onerror=alert(1)>',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should block DROP TABLE commands', async () => {
      const response = await gateway.processRequest({
        id: 'test-4',
        tool: 'test_echoTool',
        params: {
          query: 'SELECT * FROM users; DROP TABLE users; --',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('should block UNION SELECT attacks', async () => {
      const response = await gateway.processRequest({
        id: 'test-5',
        tool: 'test_echoTool',
        params: {
          query: "1' UNION SELECT username, password FROM users --",
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should block Unix path traversal', async () => {
      const response = await gateway.processRequest({
        id: 'test-6',
        tool: 'test_echoTool',
        params: {
          path: '../../etc/passwd',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('should block Windows path traversal', async () => {
      const response = await gateway.processRequest({
        id: 'test-7',
        tool: 'test_echoTool',
        params: {
          path: '..\\..\\windows\\system32',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('Code Injection Prevention', () => {
    it('should block eval() calls', async () => {
      const response = await gateway.processRequest({
        id: 'test-8',
        tool: 'test_echoTool',
        params: {
          message: 'eval("malicious code")',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });

    it('should block Function() constructor', async () => {
      const response = await gateway.processRequest({
        id: 'test-9',
        tool: 'test_echoTool',
        params: {
          message: 'new Function("return 1")',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INPUT_BLOCKED');
    });
  });

  describe('Legitimate Input Handling', () => {
    it('should allow clean input', async () => {
      const response = await gateway.processRequest({
        id: 'test-10',
        tool: 'test_echoTool',
        params: {
          message: 'Hello, World!',
          path: '/api/users',
          query: 'SELECT * FROM users WHERE id = 1',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(true);
      expect(mockToolHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hello, World!',
          path: '/api/users',
        }),
        expect.objectContaining({
          tenantId: 'test-tenant',
          userId: 'test-user',
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should log security violations', async () => {
      const auditLogger = (gateway as any).auditLogger;
      const logSpy = jest.spyOn(auditLogger, 'log');

      await gateway.processRequest({
        id: 'test-11',
        tool: 'test_echoTool',
        params: {
          message: '<script>alert(1)</script>',
        },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'security:violation',
          tool: 'test_echoTool',
          tenantId: 'test-tenant',
          outcome: 'blocked',
        })
      );
    });
  });
});
