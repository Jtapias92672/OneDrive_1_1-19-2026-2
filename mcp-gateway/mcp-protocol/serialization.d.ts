/**
 * MCP Request/Response Serialization
 * JSON-RPC 2.0 compatible
 */
import type { MCPRequest, MCPResponse } from './types.js';
/**
 * Serialize MCP request to JSON string
 */
export declare function serializeMCPRequest(method: string, params: Record<string, any>, id?: string | number): string;
/**
 * Deserialize JSON string to MCP response
 */
export declare function deserializeMCPResponse(data: string): MCPResponse;
/**
 * Create MCP error response
 */
export declare function createMCPError(id: string | number, code: number, message: string, data?: any): MCPResponse;
/**
 * Create MCP success response
 */
export declare function createMCPResponse(id: string | number, result: any): MCPResponse;
/**
 * Validate MCP request structure
 */
export declare function validateMCPRequest(data: any): data is MCPRequest;
//# sourceMappingURL=serialization.d.ts.map