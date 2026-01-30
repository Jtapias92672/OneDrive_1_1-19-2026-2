#!/usr/bin/env node
/**
 * Wolfram MCP Server
 * Wraps WolframClient to provide MCP protocol interface
 */

import { createInterface } from 'readline';
import { WolframClient } from '../../../packages/platform-ui/src/lib/accuracy/wolfram/wolfram-client.js';
import type { MCPRequest, MCPResponse } from '../../../mcp-protocol/types.js';
import {
  createMCPResponse,
  createMCPError,
  validateMCPRequest,
} from '../../../mcp-protocol/serialization.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load tool definitions
const toolsJson = JSON.parse(
  readFileSync(join(__dirname, 'tools.json'), 'utf-8')
);

// Initialize Wolfram client
const appId = process.env.WOLFRAM_APP_ID;

if (!appId) {
  console.error('[Wolfram MCP Server] Warning: WOLFRAM_APP_ID not configured');
  console.error('[Wolfram MCP Server] Will use mock responses for testing');
}

const wolframClient = new WolframClient({
  appId: appId || '',
  requestsPerMinute: 20,
  requestsPerMonth: 2000,
});

console.error('[Wolfram MCP Server] Started successfully');
console.error(`[Wolfram MCP Server] Enabled: ${wolframClient.isEnabled()}`);
console.error(`[Wolfram MCP Server] Tools available: ${toolsJson.tools.map((t: any) => t.name).join(', ')}`);

/**
 * Handle MCP request and call appropriate Wolfram API method
 */
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  console.error(`[Wolfram MCP Server] Received request: ${method}`, params);

  try {
    let result: any;

    switch (method) {
      case 'tools/list':
        // MCP protocol: return list of available tools
        result = { tools: toolsJson.tools };
        break;

      case 'wolfram_query':
        if (!params?.input) {
          throw new Error('Missing required parameter: input');
        }
        result = await wolframClient.query(params.input, {
          units: params.units,
          timeout: params.timeout,
        });
        break;

      case 'wolfram_validate':
        if (!params?.claim) {
          throw new Error('Missing required parameter: claim');
        }
        if (!params.claim.text || !params.claim.category) {
          throw new Error('Claim must have text and category fields');
        }
        result = await wolframClient.validateClaim(params.claim);
        break;

      default:
        return createMCPError(id, -32601, `Method not found: ${method}`);
    }

    console.error(`[Wolfram MCP Server] Request ${method} completed successfully`);
    return createMCPResponse(id, result);

  } catch (error) {
    console.error(`[Wolfram MCP Server] Error handling ${method}:`, error);
    return createMCPError(
      id,
      -32603,
      error instanceof Error ? error.message : 'Internal error',
      error instanceof Error ? { stack: error.stack } : undefined
    );
  }
}

/**
 * Main server loop - read from stdin, write to stdout
 */
async function main() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  console.error('[Wolfram MCP Server] Listening for requests on stdin...');

  readline.on('line', async (line: string) => {
    try {
      const data = JSON.parse(line);

      if (!validateMCPRequest(data)) {
        const errorResponse = createMCPError(
          data.id || 0,
          -32600,
          'Invalid MCP request'
        );
        console.log(JSON.stringify(errorResponse));
        return;
      }

      const response = await handleRequest(data);
      console.log(JSON.stringify(response));

    } catch (error) {
      console.error('[Wolfram MCP Server] Failed to parse request:', error);
      const errorResponse = createMCPError(
        0,
        -32700,
        'Parse error'
      );
      console.log(JSON.stringify(errorResponse));
    }
  });

  readline.on('close', () => {
    console.error('[Wolfram MCP Server] Stdin closed, exiting');
    process.exit(0);
  });
}

// Start server
main().catch((error) => {
  console.error('[Wolfram MCP Server] Fatal error:', error);
  process.exit(1);
});
