/**
 * Setup MCP Gateway with Protocol Support
 *
 * Helper to configure the gateway with MCP protocol servers
 */

import { MCPGateway } from './gateway';
import { MCPIntegration } from './mcp-integration';
import type { MCPGatewayConfig, MCPTool } from './types';

export interface MCPGatewaySetupOptions {
  gatewayConfig?: Partial<MCPGatewayConfig>;
  mcpMode?: 'direct' | 'mcp' | 'hybrid';
  mcpConfigPath?: string;
  autoDiscoverTools?: boolean;
}

/**
 * Setup MCP Gateway with protocol support
 */
export async function setupMCPGateway(options: MCPGatewaySetupOptions = {}): Promise<{
  gateway: MCPGateway;
  mcpIntegration: MCPIntegration;
}> {
  const {
    gatewayConfig = {},
    mcpMode = 'hybrid',
    mcpConfigPath = '.mcp.json',
    autoDiscoverTools = true,
  } = options;

  // Create gateway instance
  const gateway = new MCPGateway(gatewayConfig);

  // Create MCP integration
  const mcpIntegration = new MCPIntegration({
    mode: mcpMode,
    defaultMode: 'direct',
    mcpConfigPath,
  });

  // Auto-discover and register tools from MCP servers
  if (autoDiscoverTools && (mcpMode === 'mcp' || mcpMode === 'hybrid')) {
    const servers = mcpIntegration.getMCPServers();

    for (const serverName of servers) {
      try {
        console.log(`[Setup] Discovering tools from MCP server: ${serverName}`);

        const tools = await mcpIntegration.discoverServerTools(serverName);

        for (const tool of tools) {
          // Convert MCP tool to gateway MCPTool format
          const gatewayTool: MCPTool = {
            name: tool.name,
            description: tool.description || `Tool from ${serverName}`,
            version: '1.0.0',
            inputSchema: tool.parameters || {},
            metadata: {
              author: `MCP Server: ${serverName}`,
              source: serverName,
              riskLevel: determineRiskLevel(serverName, tool.name),
              permissions: determinePermissions(serverName, tool.name),
              verificationStatus: 'verified' as const,
            },
          };

          // Create MCP-based handler
          const handler = mcpIntegration.createMCPToolHandler(serverName, tool.name);

          // Register with gateway
          gateway.registerTool(gatewayTool, handler);

          console.log(`[Setup] Registered MCP tool: ${tool.name} (from ${serverName})`);
        }
      } catch (error) {
        console.error(`[Setup] Failed to discover tools from ${serverName}:`, error);
      }
    }
  }

  return { gateway, mcpIntegration };
}

/**
 * Determine risk level based on server and tool name
 */
function determineRiskLevel(serverName: string, toolName: string): MCPTool['metadata']['riskLevel'] {
  // Bedrock AI calls are medium risk
  if (serverName === 'bedrock' || toolName.includes('invoke')) {
    return 'medium';
  }

  // Figma design data is low risk (read-only)
  if (serverName === 'figma') {
    return 'low';
  }

  // Wolfram computational queries are minimal risk
  if (serverName === 'wolfram') {
    return 'minimal';
  }

  // Default to low
  return 'low';
}

/**
 * Determine permissions based on server and tool name
 */
function determinePermissions(serverName: string, toolName: string): Array<'network:read' | 'network:write' | 'filesystem:read' | 'filesystem:write' | 'database:read' | 'database:write' | 'secrets:read' | 'llm:invoke' | 'external:api'> {
  const permissions: Array<'network:read' | 'network:write' | 'filesystem:read' | 'filesystem:write' | 'database:read' | 'database:write' | 'secrets:read' | 'llm:invoke' | 'external:api'> = [];

  // All external integrations need network and API access
  permissions.push('network:read', 'network:write', 'external:api');

  // Bedrock needs LLM invoke permission
  if (serverName === 'bedrock') {
    permissions.push('llm:invoke');
  }

  return permissions;
}

/**
 * Cleanup MCP Gateway
 */
export async function cleanupMCPGateway(mcpIntegration: MCPIntegration): Promise<void> {
  await mcpIntegration.disconnectAll();
  console.log('[Setup] MCP Gateway cleaned up');
}
