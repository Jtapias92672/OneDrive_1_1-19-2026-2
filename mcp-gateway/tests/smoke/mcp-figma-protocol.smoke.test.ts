/**
 * MCP Protocol Smoke Test - Figma Server
 * Verifies MCP protocol transport works with Figma server
 */

import { MCPClient } from '../../mcp-protocol/client.js';
import type { MCPServerConfig } from '../../mcp-protocol/types.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Smoke: MCP Protocol - Figma Server', () => {
  let mcpClient: MCPClient;
  const testTimeout = 30000; // 30 seconds

  beforeAll(() => {
    mcpClient = new MCPClient();

    // Register Figma MCP server
    const figmaConfig: MCPServerConfig = {
      name: 'figma',
      command: 'node',
      args: [join(__dirname, '../../dist/mcp-servers/figma-server/server.js')],
      env: {
        FIGMA_ACCESS_TOKEN: process.env.FIGMA_ACCESS_TOKEN || 'mock-token-for-testing',
      },
      transport: 'stdio',
      description: 'Figma MCP Server',
    };

    mcpClient.registerServer(figmaConfig);
  });

  afterAll(async () => {
    await mcpClient.disconnectAll();
  });

  it('should start Figma MCP server via stdio', async () => {
    await mcpClient.connect('figma');
    expect(mcpClient.isConnected('figma')).toBe(true);
  }, testTimeout);

  it('should discover tools from Figma server', async () => {
    const tools = await mcpClient.discoverTools('figma');

    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    // Check for expected Figma tools
    const toolNames = tools.map((t: any) => t.name);
    expect(toolNames).toContain('figma_getFile');
    expect(toolNames).toContain('figma_getImages');

    console.log(`Discovered ${tools.length} tools:`, toolNames);
  }, testTimeout);

  it('should call figma_getFile via MCP protocol (with mock or real token)', async () => {
    // This test will fail if no real token, but proves protocol works
    try {
      const result = await mcpClient.callTool('figma', 'figma_getFile', {
        fileKey: 'test-key-will-fail-but-proves-protocol-works',
      });

      // If we get here, token was valid and call succeeded
      expect(result).toBeDefined();
      console.log('figma_getFile succeeded with real token');
    } catch (error) {
      // Expected with mock token - proves protocol works, Figma API rejected
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/403|401|404|Invalid/i);
      console.log('figma_getFile failed as expected (no valid token), but MCP protocol worked');
    }
  }, testTimeout);

  it('should handle invalid tool gracefully', async () => {
    await expect(
      mcpClient.callTool('figma', 'invalid_tool_name', {})
    ).rejects.toThrow();
  }, testTimeout);

  it('should handle missing required parameters', async () => {
    await expect(
      mcpClient.callTool('figma', 'figma_getFile', {}) // Missing fileKey
    ).rejects.toThrow(/fileKey/i);
  }, testTimeout);
});

describe('Smoke: MCP Client Multi-Server', () => {
  let mcpClient: MCPClient;

  beforeAll(() => {
    mcpClient = new MCPClient();
  });

  afterAll(async () => {
    await mcpClient.disconnectAll();
  });

  it('should track registered servers', () => {
    const figmaConfig: MCPServerConfig = {
      name: 'figma',
      command: 'node',
      args: [join(__dirname, '../../dist/mcp-servers/figma-server/server.js')],
      env: { FIGMA_ACCESS_TOKEN: 'mock' },
      transport: 'stdio',
    };

    mcpClient.registerServer(figmaConfig);

    const registered = mcpClient.getRegisteredServers();
    expect(registered).toContain('figma');
  });

  it('should track connected servers separately', async () => {
    const registered = mcpClient.getRegisteredServers();
    const connected = mcpClient.getConnectedServers();

    expect(registered.length).toBeGreaterThanOrEqual(1);
    expect(connected.length).toBe(0); // Not connected yet

    await mcpClient.connect('figma');

    const connectedAfter = mcpClient.getConnectedServers();
    expect(connectedAfter).toContain('figma');
  }, 30000);
});
