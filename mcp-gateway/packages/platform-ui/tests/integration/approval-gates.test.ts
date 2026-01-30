/**
 * Phase 5: Approval Gates Integration Tests
 *
 * Tests gateway approval workflow with CARS risk assessment.
 * Verifies auto-approval for low-risk, human approval for high-risk.
 */

import { MCPGateway } from '@/lib/gateway/core/gateway';
import { MCPTool, GatewayConfig } from '@/lib/gateway/core/types';

describe('Approval Gates (Phase 5)', () => {
  let gateway: MCPGateway;
  const mockLowRiskHandler = jest.fn(async () => ({ result: 'low-risk-success' }));
  const mockMediumRiskHandler = jest.fn(async () => ({ result: 'medium-risk-success' }));
  const mockHighRiskHandler = jest.fn(async () => ({ result: 'high-risk-success' }));

  beforeEach(() => {
    jest.clearAllMocks();

    const config: GatewayConfig = {
      security: {
        oauth: { enabled: false, issuer: '', clientId: '', scopes: [], pkceRequired: false },
        inputSanitization: { enabled: false, maxInputSize: 1024, allowedContentTypes: [], blockPatterns: [] },
        toolIntegrity: { enabled: false, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
        supplyChain: { enabled: false, allowedRegistries: [], requireSBOM: false, vulnerabilityScan: false },
      },
      monitoring: {
        enabled: true,
        audit: { enabled: true, logLevel: 'info', includePayloads: true, retentionDays: 90 },
        anomalyDetection: { enabled: false, baseline: 0, alertThreshold: 0 },
        toolBehavior: { enabled: false, trackDescriptionChanges: false, alertOnChange: false },
        metrics: { enabled: false, exportInterval: 60000 },
      },
      rateLimiting: {
        enabled: false,
        globalLimits: { maxRequestsPerMinute: 1000, maxRequestsPerHour: 10000 },
        toolLimits: {},
        tenantLimits: {},
      },
      approval: {
        enabled: true,
        defaultMode: 'always',  // Require approval for all tools by default
        requireApproval: ['test_updateData', 'test_deleteData'],  // Medium and high-risk
        autoApprove: ['test_readData'],  // Low-risk tools
        timeoutMs: 1000,  // 1 second for testing
        callbackUrl: undefined,
        carsIntegration: { enabled: false, apiEndpoint: '', apiKey: '' },
      },
      sandbox: {
        enabled: false,
        runtime: 'deno',
        resourceLimits: { cpuMillis: 5000, memoryMB: 512, networkAllowed: true, filesystemReadOnly: true },
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

    // Register low-risk tool
    const lowRiskTool: MCPTool = {
      name: 'test_readData',
      description: 'Read-only data access',
      version: '1.0.0',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      metadata: {
        author: 'test',
        source: 'test',
        permissions: ['network:read'],
        riskLevel: 'low',  // Auto-approve
        verificationStatus: 'unverified',
      },
    };

    // Register medium-risk tool
    const mediumRiskTool: MCPTool = {
      name: 'test_updateData',
      description: 'Limited write operations',
      version: '1.0.0',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, data: { type: 'object' } }, required: ['id', 'data'] },
      metadata: {
        author: 'test',
        source: 'test',
        permissions: ['network:write'],
        riskLevel: 'medium',  // Requires approval
        verificationStatus: 'unverified',
      },
    };

    // Register high-risk tool
    const highRiskTool: MCPTool = {
      name: 'test_deleteData',
      description: 'Destructive operations',
      version: '1.0.0',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      metadata: {
        author: 'test',
        source: 'test',
        permissions: ['network:write', 'filesystem:write'],
        riskLevel: 'high',  // Requires approval
        verificationStatus: 'unverified',
      },
    };

    gateway.registerTool(lowRiskTool, mockLowRiskHandler);
    gateway.registerTool(mediumRiskTool, mockMediumRiskHandler);
    gateway.registerTool(highRiskTool, mockHighRiskHandler);
  });

  describe('Risk-Based Approval', () => {
    it('should auto-approve low-risk tools', async () => {
      const response = await gateway.processRequest({
        id: 'test-1',
        tool: 'test_readData',
        params: { id: '123' },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(true);
      expect(mockLowRiskHandler).toHaveBeenCalled();
    });

    it('should require approval for medium-risk tools', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-2',
        tool: 'test_updateData',
        params: { id: '123', data: { name: 'test' } },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      // Simulate approval after short delay
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-2', true, 'manager@test.com', 'Approved for testing');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(true);
      expect(mockMediumRiskHandler).toHaveBeenCalled();
    });

    it('should require approval for high-risk tools', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-3',
        tool: 'test_deleteData',
        params: { id: '123' },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      // Simulate approval
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-3', true, 'admin@test.com', 'Approved for testing');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(true);
      expect(mockHighRiskHandler).toHaveBeenCalled();
    });
  });

  describe('Approval Denial', () => {
    it('should block request when approval is denied', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-4',
        tool: 'test_updateData',
        params: { id: '123', data: { name: 'test' } },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      // Simulate denial
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-4', false, 'manager@test.com', 'Denied: insufficient justification');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('APPROVAL_DENIED');
      expect(mockMediumRiskHandler).not.toHaveBeenCalled();
    });
  });

  describe('Fail-Closed on Timeout', () => {
    it('should deny request when approval times out', async () => {
      const response = await gateway.processRequest({
        id: 'test-5',
        tool: 'test_updateData',
        params: { id: '123', data: { name: 'test' } },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('APPROVAL_TIMEOUT');
      expect(mockMediumRiskHandler).not.toHaveBeenCalled();
    }, 2000);  // Allow 2s for test to complete
  });

  describe('Audit Logging', () => {
    it('should log approval requests', async () => {
      const auditLogger = (gateway as any).auditLogger;
      const logSpy = jest.spyOn(auditLogger, 'log');

      const requestPromise = gateway.processRequest({
        id: 'test-6',
        tool: 'test_updateData',
        params: { id: '123', data: { name: 'test' } },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      // Approve
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-6', true, 'manager@test.com');
      }, 100);

      await requestPromise;

      // Check audit logs contain approval events
      const calls = logSpy.mock.calls.map(call => call[0]);
      const approvalEvents = calls.filter((entry: any) =>
        entry.eventType.includes('approval')
      );

      expect(approvalEvents.length).toBeGreaterThan(0);
    });

    it('should log approval denials', async () => {
      const auditLogger = (gateway as any).auditLogger;
      const logSpy = jest.spyOn(auditLogger, 'log');

      const requestPromise = gateway.processRequest({
        id: 'test-7',
        tool: 'test_updateData',
        params: { id: '123', data: { name: 'test' } },
        context: { tenantId: 'test-tenant', userId: 'test-user', source: 'test' },
        timestamp: new Date().toISOString(),
      });

      // Deny
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-7', false, 'manager@test.com', 'Policy violation');
      }, 100);

      await requestPromise;

      // Check audit logs contain denial
      const calls = logSpy.mock.calls.map(call => call[0]);
      const denialEvents = calls.filter((entry: any) =>
        entry.eventType === 'approval:denied'
      );

      expect(denialEvents.length).toBeGreaterThan(0);
    });
  });
});
