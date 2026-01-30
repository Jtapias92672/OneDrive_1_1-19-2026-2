# MCP Smoke Tests

Smoke tests verify the MCP protocol implementation works end-to-end.

## Test Coverage

### 1. Figma MCP Server (`mcp-figma-protocol.smoke.test.ts`)
- ✅ Server startup via stdio
- ✅ Tool discovery (tools/list)
- ✅ Tool invocation (figma_getFile)
- ✅ Error handling (invalid tool, missing params)
- ✅ Multi-server management

**Status:** 7/7 tests passing

### 2. Bedrock MCP Server (TODO)
- Server startup via stdio
- Tool discovery (tools/list)
- Tool invocation (bedrock_invokeModel)
- Streaming support
- Error handling

### 3. Wolfram MCP Server (TODO)
- Server startup via stdio
- Tool discovery (tools/list)
- Tool invocation (wolfram_query)
- Mock mode testing
- Rate limiting

## Running Tests

```bash
# Run all smoke tests
npm test -- tests/smoke/

# Run specific server tests
npm test -- tests/smoke/mcp-figma-protocol.smoke.test.ts

# Run with verbose output
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/smoke/ --verbose
```

## Architecture Verified

```
Test → MCPClient → StdioTransport → MCP Server Process → Tool Handler → API
```

## Key Verification Points

1. **Protocol Compliance**
   - JSON-RPC 2.0 request/response format
   - tools/list returns tool definitions
   - Tool invocation passes parameters correctly

2. **Process Management**
   - Server starts via spawn
   - Stdin/stdout communication works
   - Server cleanup on disconnect

3. **Error Handling**
   - Invalid requests rejected
   - Missing parameters detected
   - API errors propagated correctly
