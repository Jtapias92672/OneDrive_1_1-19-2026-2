/**
 * MCP Client
 * High-level interface for calling MCP servers via protocol
 */

import type {
  MCPServerConfig,
  MCPTransport,
  MCPToolDefinition,
  MCPRequest,
  MCPErrorCode,
} from './types.js';
import { StdioTransport, HttpTransport } from './transport.js';
import { serializeMCPRequest } from './serialization.js';

export class MCPClient {
  private transports: Map<string, MCPTransport> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();
  private toolCache: Map<string, MCPToolDefinition[]> = new Map();

  /**
   * Register an MCP server configuration
   */
  registerServer(config: MCPServerConfig): void {
    this.serverConfigs.set(config.name, config);
    console.log(`[MCPClient] Registered server: ${config.name}`);
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string): Promise<void> {
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`Server not found: ${serverName}`);
    }

    if (this.transports.has(serverName)) {
      console.log(`[MCPClient] Already connected to ${serverName}`);
      return;
    }

    // Create transport based on config
    const transport = config.transport === 'stdio'
      ? new StdioTransport()
      : new HttpTransport();

    await transport.connect(config);
    this.transports.set(serverName, transport);

    console.log(`[MCPClient] Connected to ${serverName}`);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    const transport = this.transports.get(serverName);
    if (!transport) {
      return;
    }

    await transport.disconnect();
    this.transports.delete(serverName);
    this.toolCache.delete(serverName);

    console.log(`[MCPClient] Disconnected from ${serverName}`);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.transports.keys()).map(
      serverName => this.disconnect(serverName)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    // Ensure connected
    if (!this.transports.has(serverName)) {
      await this.connect(serverName);
    }

    const transport = this.transports.get(serverName)!;

    // Create MCP request
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: toolName,
      params: args,
    };

    console.log(`[MCPClient] Calling ${serverName}.${toolName}`, args);

    // Send request and wait for response
    const response = await transport.send(request);

    if (response.error) {
      throw new Error(
        `MCP Error ${response.error.code}: ${response.error.message}`
      );
    }

    console.log(`[MCPClient] ${serverName}.${toolName} returned:`, response.result);

    return response.result;
  }

  /**
   * Discover available tools from a server
   */
  async discoverTools(serverName: string): Promise<MCPToolDefinition[]> {
    // Check cache
    if (this.toolCache.has(serverName)) {
      return this.toolCache.get(serverName)!;
    }

    // Ensure connected
    if (!this.transports.has(serverName)) {
      await this.connect(serverName);
    }

    const transport = this.transports.get(serverName)!;

    // Call MCP tools/list method
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {},
    };

    const response = await transport.send(request);

    if (response.error) {
      throw new Error(
        `Failed to discover tools: ${response.error.message}`
      );
    }

    const tools = response.result?.tools || [];
    this.toolCache.set(serverName, tools);

    console.log(`[MCPClient] Discovered ${tools.length} tools from ${serverName}`);

    return tools;
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverName: string): boolean {
    const transport = this.transports.get(serverName);
    return transport?.isConnected() || false;
  }

  /**
   * Get list of registered servers
   */
  getRegisteredServers(): string[] {
    return Array.from(this.serverConfigs.keys());
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.transports.keys()).filter(
      name => this.transports.get(name)?.isConnected()
    );
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

/**
 * Get singleton MCP client instance
 */
export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
