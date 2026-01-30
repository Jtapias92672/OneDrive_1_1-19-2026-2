/**
 * MCP Request/Response Serialization
 * JSON-RPC 2.0 compatible
 */

import type { MCPRequest, MCPResponse, MCPError } from './types';

/**
 * Serialize MCP request to JSON string
 */
export function serializeMCPRequest(
  method: string,
  params: Record<string, any>,
  id: string | number = Date.now()
): string {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };

  return JSON.stringify(request);
}

/**
 * Deserialize JSON string to MCP response
 */
export function deserializeMCPResponse(data: string): MCPResponse {
  try {
    const response = JSON.parse(data);

    // Validate JSON-RPC 2.0 structure
    if (response.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    if (!('id' in response)) {
      throw new Error('Missing id field');
    }

    if (!('result' in response) && !('error' in response)) {
      throw new Error('Response must have result or error');
    }

    return response as MCPResponse;
  } catch (error) {
    throw new Error(`Failed to deserialize MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create MCP error response
 */
export function createMCPError(
  id: string | number,
  code: number,
  message: string,
  data?: any
): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * Create MCP success response
 */
export function createMCPResponse(
  id: string | number,
  result: any
): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Validate MCP request structure
 */
export function validateMCPRequest(data: any): data is MCPRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.jsonrpc === '2.0' &&
    'id' in data &&
    'method' in data &&
    typeof data.method === 'string'
  );
}
