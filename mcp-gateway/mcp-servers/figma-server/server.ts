#!/usr/bin/env node
/**
 * Figma MCP Server
 * Wraps FigmaClient to provide MCP protocol interface
 */

import { createInterface } from 'readline';
import { FigmaClient } from '../../../packages/platform-ui/src/lib/integrations/figma/figma-client.js';
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

// Initialize Figma client
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
if (!figmaToken) {
  console.error('[Figma MCP Server] Error: FIGMA_ACCESS_TOKEN environment variable required');
  process.exit(1);
}

const figmaClient = new FigmaClient({ accessToken: figmaToken });

console.error('[Figma MCP Server] Started successfully');
console.error(`[Figma MCP Server] Tools available: ${toolsJson.tools.map((t: any) => t.name).join(', ')}`);

/**
 * Handle MCP request and call appropriate Figma API method
 */
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  console.error(`[Figma MCP Server] Received request: ${method}`, params);

  try {
    let result: any;

    switch (method) {
      case 'tools/list':
        // MCP protocol: return list of available tools
        result = { tools: toolsJson.tools };
        break;

      case 'figma_getFile':
        if (!params?.fileKey) {
          throw new Error('Missing required parameter: fileKey');
        }
        result = await figmaClient.getFile(params.fileKey, {
          version: params.version,
          depth: params.depth,
        });
        break;

      case 'figma_getFileNodes':
        if (!params?.fileKey || !params?.ids) {
          throw new Error('Missing required parameters: fileKey, ids');
        }
        result = await figmaClient.getFileNodes(params.fileKey, params.ids);
        break;

      case 'figma_getImages':
        if (!params?.fileKey || !params?.ids) {
          throw new Error('Missing required parameters: fileKey, ids');
        }
        result = await figmaClient.getImages(params.fileKey, {
          ids: params.ids,
          format: params.format || 'png',
          scale: params.scale || 1,
        });
        break;

      case 'figma_getTeamProjects':
        if (!params?.teamId) {
          throw new Error('Missing required parameter: teamId');
        }
        result = await figmaClient.getTeamProjects(params.teamId);
        break;

      case 'figma_getProjectFiles':
        if (!params?.projectId) {
          throw new Error('Missing required parameter: projectId');
        }
        result = await figmaClient.getProjectFiles(params.projectId);
        break;

      default:
        return createMCPError(id, -32601, `Method not found: ${method}`);
    }

    console.error(`[Figma MCP Server] Request ${method} completed successfully`);
    return createMCPResponse(id, result);

  } catch (error) {
    console.error(`[Figma MCP Server] Error handling ${method}:`, error);
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

  console.error('[Figma MCP Server] Listening for requests on stdin...');

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
      console.error('[Figma MCP Server] Failed to parse request:', error);
      const errorResponse = createMCPError(
        0,
        -32700,
        'Parse error'
      );
      console.log(JSON.stringify(errorResponse));
    }
  });

  readline.on('close', () => {
    console.error('[Figma MCP Server] Stdin closed, exiting');
    process.exit(0);
  });
}

// Start server
main().catch((error) => {
  console.error('[Figma MCP Server] Fatal error:', error);
  process.exit(1);
});
