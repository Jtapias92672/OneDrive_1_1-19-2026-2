/**
 * MCP Protocol Transport Layer
 * Implements stdio transport for MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import type {
  MCPTransport,
  MCPRequest,
  MCPResponse,
  MCPServerConfig,
  MCPErrorCode,
} from './types.js';
import {
  serializeMCPRequest,
  deserializeMCPResponse,
  createMCPError,
} from './serialization.js';

export class StdioTransport implements MCPTransport {
  private process: ChildProcess | null = null;
  private serverConfig: MCPServerConfig | null = null;
  private pendingRequests: Map<string | number, {
    resolve: (response: MCPResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private requestTimeout = 30000; // 30 seconds

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    if (this.process) {
      throw new Error(`Transport already connected to ${this.serverConfig?.name}`);
    }

    this.serverConfig = serverConfig;

    console.log(`[StdioTransport] Starting MCP server: ${serverConfig.name}`);
    console.log(`[StdioTransport] Command: ${serverConfig.command} ${serverConfig.args.join(' ')}`);

    // Spawn the MCP server process
    this.process = spawn(serverConfig.command, serverConfig.args, {
      env: {
        ...process.env,
        ...serverConfig.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('Failed to create stdio pipes');
    }

    // Set up readline to process stdout line by line
    const readline = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity,
    });

    // Handle responses from server
    readline.on('line', (line: string) => {
      try {
        console.log(`[StdioTransport] Received from ${serverConfig.name}:`, line);

        const response = deserializeMCPResponse(line);
        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(`MCP Error ${response.error.code}: ${response.error.message}`));
          } else {
            pending.resolve(response);
          }
        } else {
          console.warn(`[StdioTransport] Received response for unknown request ID: ${response.id}`);
        }
      } catch (error) {
        console.error(`[StdioTransport] Failed to parse response:`, error);
      }
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      console.error(`[StdioTransport] ${serverConfig.name} stderr:`, data.toString());
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`[StdioTransport] ${serverConfig.name} exited with code ${code}, signal ${signal}`);

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`MCP server ${serverConfig.name} exited unexpectedly`));
      }
      this.pendingRequests.clear();
      this.process = null;
    });

    // Wait a bit for server to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`[StdioTransport] Connected to ${serverConfig.name}`);
  }

  async disconnect(): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log(`[StdioTransport] Disconnecting from ${this.serverConfig?.name}`);

    // Cancel all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Transport disconnected'));
    }
    this.pendingRequests.clear();

    // Kill the process
    this.process.kill();
    this.process = null;
    this.serverConfig = null;
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Transport not connected');
    }

    console.log(`[StdioTransport] Sending to ${this.serverConfig?.name}:`, request);

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request ${request.id} timed out after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Write request to server's stdin
      const serialized = JSON.stringify(request);
      this.process!.stdin!.write(serialized + '\n');
    });
  }

  isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }

  setRequestTimeout(ms: number): void {
    this.requestTimeout = ms;
  }
}

/**
 * HTTP Transport (stub for future implementation)
 */
export class HttpTransport implements MCPTransport {
  async connect(serverConfig: MCPServerConfig): Promise<void> {
    throw new Error('HTTP transport not yet implemented');
  }

  async disconnect(): Promise<void> {
    throw new Error('HTTP transport not yet implemented');
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    throw new Error('HTTP transport not yet implemented');
  }

  isConnected(): boolean {
    return false;
  }
}
