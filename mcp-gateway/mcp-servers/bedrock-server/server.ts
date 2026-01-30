#!/usr/bin/env node
/**
 * Bedrock MCP Server
 * Wraps BedrockClient to provide MCP protocol interface
 */

import { createInterface } from 'readline';
import { BedrockClient } from '../../../packages/platform-ui/src/lib/integrations/aws/bedrock-client.js';
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

// Initialize Bedrock client
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error('[Bedrock MCP Server] Warning: AWS credentials not fully configured');
  console.error('[Bedrock MCP Server] Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
}

const bedrockClient = new BedrockClient({
  region,
  accessKeyId,
  secretAccessKey,
});

console.error('[Bedrock MCP Server] Started successfully');
console.error(`[Bedrock MCP Server] Region: ${region}`);
console.error(`[Bedrock MCP Server] Tools available: ${toolsJson.tools.map((t: any) => t.name).join(', ')}`);

/**
 * Handle MCP request and call appropriate Bedrock API method
 */
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  console.error(`[Bedrock MCP Server] Received request: ${method}`, params);

  try {
    let result: any;

    switch (method) {
      case 'tools/list':
        // MCP protocol: return list of available tools
        result = { tools: toolsJson.tools };
        break;

      case 'bedrock_invokeModel':
        if (!params?.modelId || !params?.body) {
          throw new Error('Missing required parameters: modelId, body');
        }
        result = await bedrockClient.invokeModel({
          modelId: params.modelId,
          body: params.body,
          contentType: params.contentType,
          accept: params.accept,
        });
        break;

      case 'bedrock_invokeModelStream':
        if (!params?.modelId || !params?.body) {
          throw new Error('Missing required parameters: modelId, body');
        }
        // For streaming, collect all chunks and return full response
        const chunks: string[] = [];
        result = await bedrockClient.invokeModelStream(
          {
            modelId: params.modelId,
            body: params.body,
            contentType: params.contentType,
            accept: params.accept,
          },
          (chunk) => {
            chunks.push(chunk.chunk);
            console.error(`[Bedrock MCP Server] Stream chunk received: ${chunk.chunk.length} bytes`);
          }
        );
        break;

      case 'bedrock_listModels':
        result = await bedrockClient.listModels(params?.byProvider);
        break;

      case 'bedrock_getModelInfo':
        if (!params?.modelId) {
          throw new Error('Missing required parameter: modelId');
        }
        result = await bedrockClient.getModelInfo(params.modelId);
        if (!result) {
          throw new Error(`Model not found: ${params.modelId}`);
        }
        break;

      default:
        return createMCPError(id, -32601, `Method not found: ${method}`);
    }

    console.error(`[Bedrock MCP Server] Request ${method} completed successfully`);
    return createMCPResponse(id, result);

  } catch (error) {
    console.error(`[Bedrock MCP Server] Error handling ${method}:`, error);
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

  console.error('[Bedrock MCP Server] Listening for requests on stdin...');

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
      console.error('[Bedrock MCP Server] Failed to parse request:', error);
      const errorResponse = createMCPError(
        0,
        -32700,
        'Parse error'
      );
      console.log(JSON.stringify(errorResponse));
    }
  });

  readline.on('close', () => {
    console.error('[Bedrock MCP Server] Stdin closed, exiting');
    process.exit(0);
  });
}

// Start server
main().catch((error) => {
  console.error('[Bedrock MCP Server] Fatal error:', error);
  process.exit(1);
});
