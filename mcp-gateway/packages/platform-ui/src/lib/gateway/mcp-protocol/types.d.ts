/**
 * MCP Protocol Types
 * Based on Model Context Protocol specification
 */
export interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, any>;
}
export interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: MCPError;
}
export interface MCPError {
    code: number;
    message: string;
    data?: any;
}
export interface MCPToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}
export interface MCPServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    transport: 'stdio' | 'http';
    description?: string;
}
export interface MCPTransport {
    send(request: MCPRequest): Promise<MCPResponse>;
    connect(serverConfig: MCPServerConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
export interface MCPServerCapabilities {
    tools?: MCPToolDefinition[];
    resources?: any[];
    prompts?: any[];
}
export declare enum MCPErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    SERVER_NOT_FOUND = -32001,
    TOOL_NOT_FOUND = -32002,
    TRANSPORT_ERROR = -32003,
    TIMEOUT_ERROR = -32004
}
//# sourceMappingURL=types.d.ts.map