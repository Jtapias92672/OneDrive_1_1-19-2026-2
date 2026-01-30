# MCP Protocol Integration

## Overview

The gateway now supports **hybrid mode**: direct TypeScript clients (dev) + MCP protocol servers (production).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Gateway                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  10-Step Zero Trust Pipeline                            │ │
│  │  1. Auth  2. Sanitize  3. Registry  4. Integrity       │ │
│  │  5. CARS  6. Approval  7. Tokenize  8. Sandbox         │ │
│  │  9. Detokenize  10. Audit                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            MCPIntegration (Hybrid Router)               │ │
│  └────────────────────────────────────────────────────────┘ │
│           ↓ (direct)                     ↓ (mcp)            │
│  ┌──────────────────┐          ┌──────────────────────┐    │
│  │  TypeScript      │          │    MCPClient         │    │
│  │  Clients         │          │    (JSON-RPC 2.0)    │    │
│  │  (Dev Mode)      │          │                      │    │
│  └──────────────────┘          └──────────────────────┘    │
│                                         ↓                    │
│                              ┌──────────────────────┐       │
│                              │  StdioTransport      │       │
│                              │  (spawn + readline)  │       │
│                              └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                                         ↓
        ┌────────────────────────────────────────────────┐
        │           MCP Server Processes                  │
        ├────────────┬────────────────┬──────────────────┤
        │  Figma     │   Bedrock      │    Wolfram       │
        │  Server    │   Server       │    Server        │
        └────────────┴────────────────┴──────────────────┘
                                         ↓
        ┌────────────────────────────────────────────────┐
        │              External APIs                      │
        │  Figma API  │  AWS Bedrock  │  Wolfram Alpha   │
        └────────────────────────────────────────────────┘
```

## Configuration

### `.mcp.json`

MCP server configuration file in project root:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["dist/mcp-servers/figma-server/server.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
      },
      "transport": "stdio"
    },
    "bedrock": {
      "command": "node",
      "args": ["dist/mcp-servers/bedrock-server/server.js"],
      "env": {
        "AWS_REGION": "${AWS_REGION}",
        "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
        "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}"
      },
      "transport": "stdio"
    },
    "wolfram": {
      "command": "node",
      "args": ["dist/mcp-servers/wolfram-server/server.js"],
      "env": {
        "WOLFRAM_APP_ID": "${WOLFRAM_APP_ID}"
      },
      "transport": "stdio"
    }
  },
  "gateway": {
    "mode": "hybrid",
    "defaultMode": "direct"
  }
}
```

### Environment Variables

Set in `.env` or system environment:

```bash
# Figma
FIGMA_ACCESS_TOKEN=your-figma-token

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Wolfram Alpha
WOLFRAM_APP_ID=your-app-id
```

## Usage

### Quick Start

```typescript
import { setupMCPGateway } from './core/setup-mcp-gateway.js';

// Setup gateway with MCP protocol support
const { gateway, mcpIntegration } = await setupMCPGateway({
  mcpMode: 'hybrid',
  mcpConfigPath: '.mcp.json',
  autoDiscoverTools: true,
});

// Tools from MCP servers are automatically registered
const tools = gateway.getTools();
console.log('Available tools:', tools.map(t => t.name));

// Process requests through gateway
const response = await gateway.processRequest({
  id: 'req-1',
  tool: 'figma_getFile',
  params: { fileKey: 'abc123' },
  context: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    source: 'api',
  },
  timestamp: new Date().toISOString(),
});

// Cleanup
await mcpIntegration.disconnectAll();
```

### Manual MCP Client Usage

```typescript
import { MCPClient } from './mcp-protocol/client.js';

const mcpClient = new MCPClient();

// Register server
mcpClient.registerServer({
  name: 'figma',
  command: 'node',
  args: ['dist/mcp-servers/figma-server/server.js'],
  env: { FIGMA_ACCESS_TOKEN: 'token' },
  transport: 'stdio',
});

// Connect
await mcpClient.connect('figma');

// Discover tools
const tools = await mcpClient.discoverTools('figma');

// Call tool
const result = await mcpClient.callTool('figma', 'figma_getFile', {
  fileKey: 'abc123',
});

// Cleanup
await mcpClient.disconnect('figma');
```

## MCP Server Development

### Server Structure

```
mcp-servers/
├── figma-server/
│   ├── server.ts         # Main server entry point
│   ├── tools.json        # Tool definitions
│   ├── package.json      # Server metadata
│   └── tsconfig.json     # TypeScript config
├── bedrock-server/
│   └── ...
└── wolfram-server/
    └── ...
```

### Creating a New MCP Server

1. **Create server directory:**

```bash
mkdir -p mcp-servers/myserver-server
```

2. **Create `tools.json`:**

```json
{
  "tools": [
    {
      "name": "myserver_doSomething",
      "description": "Does something useful",
      "parameters": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "Input parameter"
          }
        },
        "required": ["input"]
      }
    }
  ]
}
```

3. **Create `server.ts`:**

```typescript
#!/usr/bin/env node
import { createInterface } from 'readline';
import { MyClient } from '../../../packages/.../my-client.js';
import type { MCPRequest, MCPResponse } from '../../../mcp-protocol/types.js';
import { createMCPResponse, createMCPError, validateMCPRequest } from '../../../mcp-protocol/serialization.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsJson = JSON.parse(readFileSync(join(__dirname, 'tools.json'), 'utf-8'));

// Initialize client
const myClient = new MyClient({ /* config */ });

async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    let result: any;

    switch (method) {
      case 'tools/list':
        result = { tools: toolsJson.tools };
        break;

      case 'myserver_doSomething':
        if (!params?.input) {
          throw new Error('Missing required parameter: input');
        }
        result = await myClient.doSomething(params.input);
        break;

      default:
        return createMCPError(id, -32601, `Method not found: ${method}`);
    }

    return createMCPResponse(id, result);
  } catch (error) {
    return createMCPError(id, -32603, error.message);
  }
}

// Main server loop
async function main() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  readline.on('line', async (line: string) => {
    try {
      const data = JSON.parse(line);
      if (!validateMCPRequest(data)) {
        console.log(JSON.stringify(createMCPError(data.id || 0, -32600, 'Invalid MCP request')));
        return;
      }
      const response = await handleRequest(data);
      console.log(JSON.stringify(response));
    } catch (error) {
      console.log(JSON.stringify(createMCPError(0, -32700, 'Parse error')));
    }
  });

  readline.on('close', () => process.exit(0));
}

main().catch((error) => {
  console.error('[MyServer MCP] Fatal error:', error);
  process.exit(1);
});
```

4. **Register in `.mcp.json`:**

```json
{
  "mcpServers": {
    "myserver": {
      "command": "node",
      "args": ["dist/mcp-servers/myserver-server/server.js"],
      "env": {
        "MY_API_KEY": "${MY_API_KEY}"
      },
      "transport": "stdio"
    }
  }
}
```

## Testing

### Smoke Tests

```bash
# Run all MCP smoke tests
npm test -- tests/smoke/

# Run specific server
npm test -- tests/smoke/mcp-figma-protocol.smoke.test.ts
```

### Manual Testing

```bash
# Test server directly via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  FIGMA_ACCESS_TOKEN=token node dist/mcp-servers/figma-server/server.js
```

## Hybrid Mode

The gateway supports three modes:

1. **`direct`** - Only use TypeScript clients (dev mode)
2. **`mcp`** - Only use MCP protocol servers (production mode)
3. **`hybrid`** - Support both, configurable per tool (recommended)

### Configuring Hybrid Mode

```typescript
const { gateway, mcpIntegration } = await setupMCPGateway({
  mcpMode: 'hybrid',
  gatewayConfig: {
    // Gateway security settings
    security: { /* ... */ },
    approval: { /* ... */ },
  },
});

// Direct TypeScript handler
mcpIntegration.registerDirectTool('custom_tool', async (params) => {
  return { result: 'from direct handler' };
});

// MCP protocol handler (auto-registered from .mcp.json)
// figma_getFile, bedrock_invokeModel, wolfram_query, etc.
```

## Benefits of MCP Protocol

1. **Process Isolation** - Each server runs in separate process
2. **Language Agnostic** - Servers can be written in any language
3. **Standard Protocol** - JSON-RPC 2.0 for interoperability
4. **Resource Management** - Gateway can monitor/restart server processes
5. **Security** - Servers run with minimal permissions
6. **Scalability** - Servers can be distributed across machines

## Troubleshooting

### Server Won't Start

Check:
- Server compiled: `ls dist/mcp-servers/figma-server/server.js`
- Environment variables set
- Server logs: stderr from spawn process

### Tool Not Found

Check:
- Server registered in `.mcp.json`
- `autoDiscoverTools: true` in setup
- Tool name matches `tools.json`

### Connection Errors

Check:
- Server process still running
- Stdin/stdout not blocked
- No JSON parse errors in logs

## Performance

- **Server Startup:** ~100-200ms per server
- **Tool Discovery:** ~10-50ms per server
- **Tool Invocation:** ~50-500ms (depends on API)
- **Process Overhead:** ~10-20MB RAM per server

## Security

MCP servers:
- Run in separate processes (isolation)
- Communicate only via stdin/stdout (no network)
- Env vars for secrets (not in code)
- Gateway applies full zero-trust pipeline
- Servers cannot access gateway internals

## Next Steps

- Add more MCP servers (GitHub, Slack, etc.)
- Implement server health checks
- Add server auto-restart on crash
- Implement server request queuing
- Add distributed server support (remote MCP servers)
