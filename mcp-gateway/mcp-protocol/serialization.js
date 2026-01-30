/**
 * MCP Request/Response Serialization
 * JSON-RPC 2.0 compatible
 */
/**
 * Serialize MCP request to JSON string
 */
export function serializeMCPRequest(method, params, id = Date.now()) {
    const request = {
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
export function deserializeMCPResponse(data) {
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
        return response;
    }
    catch (error) {
        throw new Error(`Failed to deserialize MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Create MCP error response
 */
export function createMCPError(id, code, message, data) {
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
export function createMCPResponse(id, result) {
    return {
        jsonrpc: '2.0',
        id,
        result,
    };
}
/**
 * Validate MCP request structure
 */
export function validateMCPRequest(data) {
    return (typeof data === 'object' &&
        data !== null &&
        data.jsonrpc === '2.0' &&
        'id' in data &&
        'method' in data &&
        typeof data.method === 'string');
}
//# sourceMappingURL=serialization.js.map