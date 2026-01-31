/**
 * End-to-End Integration Test - Phases 5 & 6
 *
 * Verifies approval gates (Phase 5) and sandbox execution (Phase 6)
 * work together through the full gateway pipeline.
 */

import { setupMCPGateway } from '@/lib/gateway/core/setup-mcp-gateway';
import type { MCPGateway } from '@/lib/gateway/core/gateway';
import type { MCPIntegration } from '@/lib/gateway/core/mcp-integration';

describe('MCP Gateway - Phases 5 & 6 Integration', () => {
  let gateway: MCPGateway;
  let mcpIntegration: MCPIntegration;

  beforeAll(async () => {
    // Setup gateway with Phases 5 & 6 ENABLED (matching API route config)
    const setup = await setupMCPGateway({
      gatewayConfig: {
        security: {
          oauth: {
            enabled: false,  // Disable OAuth for testing (focus on approval + sandbox)
          },
          inputSanitization: {
            enabled: false,  // Disable for testing
          },
        },
        approval: {
          enabled: true,
          defaultMode: 'risk-based',
          requireApproval: ['*_delete*', '*_update*'],
          autoApprove: ['*_read*', '*_get*'],
          timeoutMs: 5000,  // 5 second timeout for tests
          carsIntegration: {
            enabled: true,
            riskThreshold: 0.7,
          },
        },
        sandbox: {
          enabled: true,
          runtime: 'deno',
          limits: {
            maxCpuMs: 5000,
            maxMemoryMb: 512,
            maxDiskMb: 100,
            maxNetworkConnections: 10,
            executionTimeoutMs: 10000,
          },
          network: {
            allowEgress: true,
            allowedHosts: ['api.figma.com', '*.amazonaws.com'],
            blockedHosts: ['169.254.169.254'],
          },
          filesystem: {
            readOnly: ['/tmp/mcp-sandbox'],
            writable: [],
            blocked: ['/etc', '/var', '/usr'],
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
        },
      },
      mcpMode: 'direct',
      autoDiscoverTools: false,
    });

    gateway = setup.gateway;
    mcpIntegration = setup.mcpIntegration;

    // Register test tools
    gateway.registerTool(
      {
        name: 'test_readData',
        description: 'Read data (low risk)',
        version: '1.0.0',
        inputSchema: {},
        metadata: {
          author: 'Test',
          source: 'test',
          riskLevel: 'low',
          permissions: [],
          verificationStatus: 'verified',
        },
      },
      async (params: unknown) => ({ success: true, data: 'read-result' })
    );

    gateway.registerTool(
      {
        name: 'test_updateData',
        description: 'Update data (medium risk)',
        version: '1.0.0',
        inputSchema: {},
        metadata: {
          author: 'Test',
          source: 'test',
          riskLevel: 'medium',
          permissions: ['database:write'],
          verificationStatus: 'verified',
        },
      },
      async (params: unknown) => ({ success: true, data: 'update-result' })
    );

    gateway.registerTool(
      {
        name: 'test_deleteData',
        description: 'Delete data (high risk)',
        version: '1.0.0',
        inputSchema: {},
        metadata: {
          author: 'Test',
          source: 'test',
          riskLevel: 'high',
          permissions: ['database:write'],
          verificationStatus: 'verified',
        },
      },
      async (params: unknown) => ({ success: true, data: 'delete-result' })
    );
  });

  afterAll(async () => {
    await mcpIntegration.disconnectAll();
  });

  describe('Phase 5: Approval Gates + CARS', () => {
    it('should auto-approve low-risk read operations', async () => {
      const response = await gateway.processRequest({
        id: 'test-1',
        tool: 'test_readData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();  // Data structure may vary with sandbox wrapping
      expect(response.metadata.approval.required).toBe(false);
    });

    it('should require approval for medium-risk update operations', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-2',
        tool: 'test_updateData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // Approval should be required - request will wait
      // Simulate approval after 100ms
      setTimeout(() => {
        // In real scenario, this would come from /api/mcp/approve/:requestId
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-2', true, 'test-approver', 'Approved for testing');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();  // Data structure may vary with sandbox wrapping
      expect(response.metadata.approval.required).toBe(true);
      expect(response.metadata.approval.status).toBe('approved');
    });

    it('should block when approval is denied', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-3',
        tool: 'test_deleteData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // Deny approval after 100ms
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-3', false, 'test-approver', 'Too risky');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('APPROVAL_DENIED');
      expect(response.error?.message).toContain('Too risky');
    });

    it('should timeout if no approval received', async () => {
      const response = await gateway.processRequest({
        id: 'test-4',
        tool: 'test_updateData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // No approval submitted - should timeout after 5 seconds
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('APPROVAL_TIMEOUT');
    }, 10000);  // Increase Jest timeout for this test
  });

  describe('Phase 6: Sandbox Execution', () => {
    it('should execute medium-risk tools in Deno sandbox', async () => {
      // First approve the request
      const requestPromise = gateway.processRequest({
        id: 'test-5',
        tool: 'test_updateData',
        params: { value: 'test' },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // Approve immediately
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-5', true, 'test-approver', 'Approved');
      }, 50);

      const response = await requestPromise;

      expect(response.success).toBe(true);
      expect(response.metadata.sandbox.used).toBe(true);
      expect(response.metadata.sandbox.runtime).toBe('deno');
      expect(response.metadata.sandbox.resourceUsage).toBeDefined();
    });

    it('should execute low-risk tools in sandbox (non-minimal risk)', async () => {
      const response = await gateway.processRequest({
        id: 'test-6',
        tool: 'test_readData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      expect(response.success).toBe(true);
      // Low-risk tools still use sandbox (only 'minimal' bypasses sandbox)
      expect(response.metadata.sandbox.used).toBe(true);
    });
  });

  describe('Combined Phases 5 + 6', () => {
    it('should require approval AND execute in sandbox for high-risk operations', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-7',
        tool: 'test_deleteData',
        params: { id: '123' },
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // Approve after 100ms
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        approvalGate.submitApproval('test-7', true, 'executive@test.com', 'Executive approval granted');
      }, 100);

      const response = await requestPromise;

      expect(response.success).toBe(true);

      // Verify BOTH phases were active
      expect(response.metadata.approval.required).toBe(true);
      expect(response.metadata.approval.status).toBe('approved');
      expect(response.metadata.approval.approvedBy).toBe('executive@test.com');

      expect(response.metadata.sandbox.used).toBe(true);
      expect(response.metadata.sandbox.runtime).toBe('deno');
    });

    it('should include CARS risk assessment in approval request', async () => {
      const requestPromise = gateway.processRequest({
        id: 'test-8',
        tool: 'test_deleteData',
        params: {},
        context: {
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
        },
        timestamp: new Date().toISOString(),
      });

      // Check that approval request includes CARS assessment
      setTimeout(() => {
        const approvalGate = (gateway as any).approvalGate;
        const pending = approvalGate.getPendingApprovals();

        expect(pending.length).toBeGreaterThan(0);
        const request = pending.find((p: any) => p.requestId === 'test-8');

        expect(request?.riskAssessment).toBeDefined();
        expect(request?.riskAssessment?.riskLevel).toBe('high');
        expect(request?.riskAssessment?.score).toBeGreaterThan(0.7);

        // Approve
        approvalGate.submitApproval('test-8', true, 'admin@test.com', 'OK');
      }, 100);

      const response = await requestPromise;
      expect(response.success).toBe(true);
    });
  });
});
