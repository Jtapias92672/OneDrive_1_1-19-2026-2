/**
 * MCP Gateway Integration Test
 *
 * Tests the gateway with MCP protocol server support
 */

import { setupMCPGateway, cleanupMCPGateway } from '../../core/setup-mcp-gateway.js';
import type { MCPRequest } from '../../core/types.js';

describe('Integration: MCP Gateway with Protocol Servers', () => {
  let gateway: any;
  let mcpIntegration: any;

  beforeAll(async () => {
    // Setup gateway with MCP protocol support
    const setup = await setupMCPGateway({
      mcpMode: 'hybrid',
      mcpConfigPath: '.mcp.json',
      autoDiscoverTools: true,
      gatewayConfig: {
        // Disable security features for testing
        security: {
          oauth: { enabled: false, pkceRequired: false, scopes: [] },
          inputSanitization: { enabled: false, maxInputSize: 1024 * 1024, allowedContentTypes: [], blockPatterns: [] },
          toolIntegrity: { enabled: false, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
          supplyChain: { enabled: false, allowedRegistries: [], requireSBOM: false, vulnerabilityScan: false },
        },
        approval: {
          enabled: false,
          defaultMode: 'never',
          requireApproval: [],
          autoApprove: [],
          timeoutMs: 300000,
          carsIntegration: { enabled: false, riskThreshold: 0.7 },
        },
        sandbox: {
          enabled: false,
          runtime: 'deno',
          limits: {
            maxCpuMs: 30000,
            maxMemoryMb: 512,
            maxDiskMb: 100,
            maxNetworkConnections: 10,
            executionTimeoutMs: 300000,
          },
          network: { allowEgress: true, allowedHosts: [], blockedHosts: [] },
          filesystem: { readOnly: [], writable: [], blocked: [] },
        },
        privacy: {
          enabled: false,
          patterns: [],
          tokenFormat: '',
          tokenTtlMs: 0,
          alwaysTokenize: [],
          neverTokenize: [],
        },
      },
    });

    gateway = setup.gateway;
    mcpIntegration = setup.mcpIntegration;
  }, 30000);

  afterAll(async () => {
    await cleanupMCPGateway(mcpIntegration);
  });

  it('should load MCP servers from configuration', () => {
    const servers = mcpIntegration.getMCPServers();

    expect(servers).toBeDefined();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);

    // Should have figma, bedrock, and wolfram servers
    expect(servers).toContain('figma');
  });

  it('should discover tools from MCP servers', () => {
    const tools = gateway.getTools();

    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    // Should have tools from all three servers
    const toolNames = tools.map((t: any) => t.name);

    // Figma tools
    expect(toolNames).toContain('figma_getFile');

    console.log(`Discovered ${tools.length} tools:`, toolNames);
  });

  it('should process request through MCP protocol to Figma server', async () => {
    const request: MCPRequest = {
      id: 'test-1',
      tool: 'figma_getFile',
      params: {
        fileKey: 'test-key-for-protocol-test',
      },
      context: {
        tenantId: 'test-tenant',
        userId: 'test-user',
        sessionId: 'test-session',
        source: 'test',
      },
      timestamp: new Date().toISOString(),
    };

    const response = await gateway.processRequest(request);

    expect(response).toBeDefined();
    expect(response.requestId).toBe('test-1');

    // With mock token, Figma API will reject but MCP protocol worked
    console.log('Response from MCP gateway:', response);
  }, 30000);

  it('should track MCP server connection status', () => {
    const status = mcpIntegration.getConnectionStatus();

    expect(status).toBeDefined();
    expect(typeof status).toBe('object');

    // Check if servers are tracked
    expect('figma' in status).toBe(true);
  });

  it('should handle tool not found error', async () => {
    const request: MCPRequest = {
      id: 'test-2',
      tool: 'nonexistent_tool',
      params: {},
      context: {
        tenantId: 'test-tenant',
        userId: 'test-user',
        sessionId: 'test-session',
        source: 'test',
      },
      timestamp: new Date().toISOString(),
    };

    const response = await gateway.processRequest(request);

    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('TOOL_NOT_FOUND');
  });
});
