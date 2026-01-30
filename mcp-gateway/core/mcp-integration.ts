/**
 * MCP Protocol Integration for Gateway
 *
 * Adds MCP protocol server support to the existing gateway.
 * Supports hybrid mode: direct TypeScript clients + MCP protocol servers
 */

import { MCPClient } from '../mcp-protocol/client.js';
import type { MCPServerConfig } from '../mcp-protocol/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface MCPIntegrationConfig {
  mode: 'direct' | 'mcp' | 'hybrid';
  defaultMode?: 'direct' | 'mcp';
  mcpConfigPath?: string;
}

export interface MCPToolHandler {
  type: 'direct' | 'mcp';
  serverName?: string;
  toolName?: string;
  handler?: (params: Record<string, unknown>, context: any) => Promise<unknown>;
}

/**
 * MCP Integration Layer
 * Bridges the gateway with MCP protocol servers
 */
export class MCPIntegration {
  private mcpClient: MCPClient;
  private config: MCPIntegrationConfig;
  private mcpServers: Map<string, MCPServerConfig> = new Map();
  private toolMapping: Map<string, MCPToolHandler> = new Map();

  constructor(config: MCPIntegrationConfig) {
    this.config = config;
    this.mcpClient = new MCPClient();

    // Load MCP server configurations if in mcp or hybrid mode
    if (config.mode === 'mcp' || config.mode === 'hybrid') {
      this.loadMCPConfig(config.mcpConfigPath || '.mcp.json');
    }
  }

  /**
   * Load MCP server configuration from .mcp.json
   */
  private loadMCPConfig(configPath: string): void {
    try {
      const configFile = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configFile);

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.registerMCPServer(name, serverConfig as any);
        }
      }

      console.log(`[MCPIntegration] Loaded ${this.mcpServers.size} MCP servers from ${configPath}`);
    } catch (error) {
      console.warn(`[MCPIntegration] Could not load ${configPath}:`, error);
    }
  }

  /**
   * Register an MCP server
   */
  registerMCPServer(name: string, config: MCPServerConfig): void {
    // Resolve environment variables in config
    const resolvedConfig = {
      ...config,
      env: this.resolveEnvVars(config.env || {}),
    };

    this.mcpClient.registerServer(resolvedConfig);
    this.mcpServers.set(name, resolvedConfig);

    console.log(`[MCPIntegration] Registered MCP server: ${name}`);
  }

  /**
   * Resolve environment variables in server config
   */
  private resolveEnvVars(env: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      // Replace ${VAR_NAME} with process.env.VAR_NAME
      if (value.startsWith('${') && value.endsWith('}')) {
        const varName = value.slice(2, -1);
        resolved[key] = process.env[varName] || value;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(serverName: string): Promise<void> {
    await this.mcpClient.connect(serverName);
    console.log(`[MCPIntegration] Connected to MCP server: ${serverName}`);
  }

  /**
   * Discover tools from an MCP server
   */
  async discoverServerTools(serverName: string): Promise<Array<{ name: string; description: string; parameters: any }>> {
    await this.ensureConnected(serverName);

    const tools = await this.mcpClient.discoverTools(serverName);

    // Map tools to handler type
    for (const tool of tools) {
      this.toolMapping.set(tool.name, {
        type: 'mcp',
        serverName,
        toolName: tool.name,
      });
    }

    return tools;
  }

  /**
   * Create a tool handler that uses MCP protocol
   */
  createMCPToolHandler(serverName: string, toolName: string): (params: Record<string, unknown>, context: any) => Promise<unknown> {
    return async (params: Record<string, unknown>, context: any) => {
      await this.ensureConnected(serverName);

      console.log(`[MCPIntegration] Invoking MCP tool: ${serverName}.${toolName}`);
      const result = await this.mcpClient.callTool(serverName, toolName, params);

      return result;
    };
  }

  /**
   * Register a direct (TypeScript) tool handler
   */
  registerDirectTool(toolName: string, handler: (params: Record<string, unknown>, context: any) => Promise<unknown>): void {
    this.toolMapping.set(toolName, {
      type: 'direct',
      handler,
    });
  }

  /**
   * Get the handler for a tool based on mode
   */
  getToolHandler(toolName: string): ((params: Record<string, unknown>, context: any) => Promise<unknown>) | null {
    const mapping = this.toolMapping.get(toolName);
    if (!mapping) return null;

    if (mapping.type === 'direct' && mapping.handler) {
      return mapping.handler;
    }

    if (mapping.type === 'mcp' && mapping.serverName && mapping.toolName) {
      return this.createMCPToolHandler(mapping.serverName, mapping.toolName);
    }

    return null;
  }

  /**
   * Get all registered MCP servers
   */
  getMCPServers(): string[] {
    return Array.from(this.mcpServers.keys());
  }

  /**
   * Get all tool mappings
   */
  getToolMappings(): Map<string, MCPToolHandler> {
    return this.toolMapping;
  }

  /**
   * Ensure server is connected before use
   */
  private async ensureConnected(serverName: string): Promise<void> {
    if (!this.mcpClient.isConnected(serverName)) {
      await this.connectToServer(serverName);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    await this.mcpClient.disconnectAll();
    console.log('[MCPIntegration] Disconnected from all MCP servers');
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(serverName: string): boolean {
    return this.mcpClient.isConnected(serverName);
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const serverName of this.mcpServers.keys()) {
      status[serverName] = this.mcpClient.isConnected(serverName);
    }

    return status;
  }
}
