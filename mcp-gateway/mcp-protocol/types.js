/**
 * MCP Protocol Types
 * Based on Model Context Protocol specification
 */
// MCP Error Codes (JSON-RPC standard + MCP extensions)
export var MCPErrorCode;
(function (MCPErrorCode) {
    MCPErrorCode[MCPErrorCode["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
    MCPErrorCode[MCPErrorCode["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
    MCPErrorCode[MCPErrorCode["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
    MCPErrorCode[MCPErrorCode["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
    // MCP-specific errors
    MCPErrorCode[MCPErrorCode["SERVER_NOT_FOUND"] = -32001] = "SERVER_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["TOOL_NOT_FOUND"] = -32002] = "TOOL_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["TRANSPORT_ERROR"] = -32003] = "TRANSPORT_ERROR";
    MCPErrorCode[MCPErrorCode["TIMEOUT_ERROR"] = -32004] = "TIMEOUT_ERROR";
})(MCPErrorCode || (MCPErrorCode = {}));
//# sourceMappingURL=types.js.map