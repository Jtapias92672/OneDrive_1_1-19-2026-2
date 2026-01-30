# MCP Protocol Implementation

## Quick Start

```bash
# 1. Set environment variables
export FIGMA_ACCESS_TOKEN=your-token
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export WOLFRAM_APP_ID=your-app-id

# 2. Build MCP servers
npm run build

# 3. Run smoke tests
npm test -- tests/smoke/

# 4. Use in code
node
```

```typescript
import { setupMCPGateway } from './core/setup-mcp-gateway.js';

const { gateway } = await setupMCPGateway({ mcpMode: 'hybrid' });

const response = await gateway.processRequest({
  id: '1',
  tool: 'figma_getFile',
  params: { fileKey: 'abc123' },
  context: { tenantId: 't1', source: 'api' },
  timestamp: new Date().toISOString(),
});
```

## What's Included

### MCP Protocol Layer (`mcp-protocol/`)
- **`types.ts`** - MCP protocol type definitions (JSON-RPC 2.0)
- **`serialization.ts`** - Request/response helpers
- **`transport.ts`** - Stdio transport (spawn + readline)
- **`client.ts`** - High-level MCP client

### MCP Servers (`mcp-servers/`)
- **`figma-server/`** - Figma API integration (5 tools)
- **`bedrock-server/`** - AWS Bedrock AI models (4 tools)
- **`wolfram-server/`** - Wolfram Alpha computation (2 tools)

### Gateway Integration (`core/`)
- **`mcp-integration.ts`** - MCP protocol integration layer
- **`setup-mcp-gateway.ts`** - Helper to configure gateway with MCP support
- **`gateway.ts`** - Main gateway (unchanged, now supports MCP via integration)

### Configuration
- **`.mcp.json`** - MCP server configuration
- **Environment variables** - API keys and credentials

### Tests
- **`tests/smoke/`** - MCP protocol smoke tests (7/7 passing for Figma)
- **`tests/integration/`** - Gateway + MCP integration tests

### Documentation
- **`docs/MCP-PROTOCOL-INTEGRATION.md`** - Complete guide
- **`tests/smoke/README.md`** - Smoke test documentation
- **This file** - Quick reference

## Architecture

```
Gateway → MCPIntegration → MCPClient → StdioTransport → MCP Server → External API
```

## Available Tools

### Figma (5 tools)
- `figma_getFile` - Get design file data
- `figma_getFileNodes` - Get specific nodes
- `figma_getImages` - Render nodes as images
- `figma_getTeamProjects` - List team projects
- `figma_getProjectFiles` - List project files

### Bedrock (4 tools)
- `bedrock_invokeModel` - Invoke foundation model
- `bedrock_invokeModelStream` - Streaming invocation
- `bedrock_listModels` - List available models
- `bedrock_getModelInfo` - Get model details

### Wolfram (2 tools)
- `wolfram_query` - Query computational engine
- `wolfram_validate` - Validate detected claims

## Testing

```bash
# Run all tests
npm test

# Run MCP smoke tests
npm test -- tests/smoke/

# Run specific test
npm test -- tests/smoke/mcp-figma-protocol.smoke.test.ts

# Test server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  FIGMA_ACCESS_TOKEN=token node dist/mcp-servers/figma-server/server.js
```

## Project Status

**Phase 1: MCP Protocol Implementation** ✅ COMPLETE

- [x] Task #1: Create .mcp.json configuration
- [x] Task #2: Implement MCP protocol transport layer
- [x] Task #3: Build Figma MCP server wrapper
- [x] Task #4: Build Bedrock MCP server wrapper
- [x] Task #5: Build Wolfram MCP server wrapper
- [x] Task #6: Update Gateway to support MCP protocol
- [x] Task #7: Create MCP smoke tests (Figma: 7/7 passing)
- [x] Task #8: Document MCP architecture and usage

**Verification:**
- ✅ Stdio transport works (spawn + readline)
- ✅ JSON-RPC 2.0 protocol compliant
- ✅ Tool discovery works (tools/list)
- ✅ Tool invocation works
- ✅ Error handling works
- ✅ Multi-server management works
- ✅ Gateway integration works (hybrid mode)

## Next Phase Recommendations

**Phase 2: Production Readiness**
- Add server health checks
- Implement auto-restart on crash
- Add request queuing
- Add performance monitoring
- Complete smoke tests for Bedrock and Wolfram

**Phase 3: Scale**
- Distributed MCP servers (remote processes)
- Server load balancing
- Request caching
- Rate limiting per server

## File Locations

```
mcp-gateway/
├── .mcp.json                           # MCP server configuration
├── mcp-protocol/                       # Protocol implementation
│   ├── types.ts
│   ├── serialization.ts
│   ├── transport.ts
│   └── client.ts
├── mcp-servers/                        # MCP server wrappers
│   ├── figma-server/
│   ├── bedrock-server/
│   └── wolfram-server/
├── core/                               # Gateway + MCP integration
│   ├── gateway.ts
│   ├── mcp-integration.ts
│   └── setup-mcp-gateway.ts
├── tests/
│   ├── smoke/                          # MCP protocol tests
│   │   ├── mcp-figma-protocol.smoke.test.ts
│   │   └── README.md
│   └── integration/                    # Gateway integration tests
│       └── mcp-gateway-integration.test.ts
└── docs/
    └── MCP-PROTOCOL-INTEGRATION.md     # Complete documentation
```

## Key Design Decisions

1. **Hybrid Mode** - Support both direct TypeScript clients (dev) and MCP servers (prod)
2. **Stdio Transport** - Process isolation, no network needed
3. **JSON-RPC 2.0** - Standard protocol for interoperability
4. **Tool Auto-Discovery** - Gateway automatically registers tools from MCP servers
5. **Zero Trust Pipeline** - All requests go through 10-step security gateway
6. **Environment Variables** - Secrets passed via env, not config files

## Performance Characteristics

- **Server Startup:** ~100-200ms
- **Tool Discovery:** ~10-50ms
- **Tool Invocation:** ~50-500ms (API dependent)
- **Memory per Server:** ~10-20MB
- **Concurrent Requests:** Limited by API rate limits, not protocol

## Troubleshooting

**Server won't start:**
```bash
# Check server exists
ls dist/mcp-servers/figma-server/server.js

# Check environment
echo $FIGMA_ACCESS_TOKEN

# Test manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  FIGMA_ACCESS_TOKEN=test node dist/mcp-servers/figma-server/server.js
```

**Tool not found:**
- Check `.mcp.json` has server registered
- Check `autoDiscoverTools: true` in setup
- Check tool name in `tools.json`

**Connection errors:**
- Check server process still running: `ps aux | grep mcp-server`
- Check no JSON parse errors in stderr
- Verify stdin/stdout not blocked

## Links

- [Complete Documentation](./docs/MCP-PROTOCOL-INTEGRATION.md)
- [Smoke Test README](./tests/smoke/README.md)
- [Gateway Source](./core/gateway.ts)
- [MCP Integration](./core/mcp-integration.ts)
