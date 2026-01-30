# Session Handoff - 2026-01-29 - Option 3 MCP Implementation

## Completed This Session:
- [x] Applied Epic 7.5 v2 to entire MCP Server codebase
- [x] Identified root cause: No MCP protocol, only direct integration clients
- [x] Created detailed analysis of what exists vs missing
- [x] User selected Option 3: Hybrid MCP wrapper approach
- [x] Created 8-task implementation plan
- [x] Task #1 COMPLETE: Created .mcp.json configuration

## Current State:
- **Tests:** 1260+ tests PASSING (gateway + E2E + smoke)
- **Build:** Next.js server running on :3000
- **MCP Architecture:** STARTED - .mcp.json created, 7 tasks pending

## Epic 7.5 v2 Analysis Results

### What EXISTS and WORKS ✅
1. **Figma Integration Client** - Real API calls proven
2. **AWS Bedrock Client** - AWS SDK integration proven
3. **Wolfram Alpha Client** - HTTP API integration proven
4. **Security Gateway** - 1105 tests passing, 10-step Zero Trust pipeline
5. **Agent Orchestration** - 11 agent types with task tracking

### What's MISSING ❌
1. **MCP Server Processes** - No standalone servers (clients are TypeScript classes)
2. **MCP Protocol Layer** - No stdio/HTTP transport, no request/response serialization
3. **MCP Configuration** - NOW CREATED: .mcp.json ✅
4. **MCP Tool Discovery** - Not implemented
5. **Server Lifecycle Management** - Not implemented

## Option 3 Implementation Plan (30-40 hours)

**Architecture:** Thin MCP protocol wrappers around existing clients
- Keep FigmaClient/BedrockClient/WolframClient as-is (proven working)
- Add MCP server processes that wrap these clients
- Gateway supports dual mode: direct (dev) OR MCP protocol (production)

## Task Breakdown

### ✅ Task #1: Create .mcp.json [COMPLETE]
**File:** `/mcp-gateway/.mcp.json`
**Status:** DONE
**Contents:**
- Figma server: node mcp-servers/figma-server/dist/server.js
- Bedrock server: node mcp-servers/bedrock-server/dist/server.js
- Wolfram server: node mcp-servers/wolfram-server/dist/server.js
- Hybrid mode config: direct (dev) + MCP (production)

### 🔄 Task #2: Implement MCP protocol transport layer
**Effort:** 8-10 hours
**Files to Create:**
```
mcp-gateway/
├── mcp-protocol/
│   ├── transport.ts          # Stdio/HTTP transport
│   ├── serialization.ts      # Request/response serialization
│   ├── client.ts             # MCP client for gateway
│   ├── types.ts              # MCP protocol types
│   └── connection-pool.ts    # Connection pooling
```

**Implementation Steps:**
1. Create transport.ts with stdio handler:
   ```typescript
   interface MCPTransport {
     send(request: MCPRequest): Promise<MCPResponse>;
     connect(serverConfig: ServerConfig): Promise<void>;
     disconnect(): Promise<void>;
   }
   
   class StdioTransport implements MCPTransport {
     private process: ChildProcess;
     // Spawn server process, handle stdin/stdout
   }
   ```

2. Create serialization.ts:
   ```typescript
   function serializeMCPRequest(tool: string, args: any): string
   function deserializeMCPResponse(data: string): MCPResponse
   ```

3. Create client.ts:
   ```typescript
   class MCPClient {
     async callTool(server: string, tool: string, args: any): Promise<any>
     async discoverTools(server: string): Promise<ToolDefinition[]>
   }
   ```

### 🔄 Task #3: Build MCP server wrapper for Figma
**Effort:** 6-8 hours
**Directory:** `/mcp-gateway/mcp-servers/figma-server/`

**Files to Create:**
1. `server.ts` - Main MCP server process:
   ```typescript
   import { FigmaClient } from '../../packages/platform-ui/src/lib/integrations/figma/figma-client';
   
   const mcpServer = createMCPServer({
     name: 'figma',
     version: '1.0.0',
     tools: loadToolsFromJSON('./tools.json')
   });
   
   mcpServer.onToolCall(async (toolName, args) => {
     const client = new FigmaClient({ accessToken: process.env.FIGMA_ACCESS_TOKEN });
     
     switch(toolName) {
       case 'figma_getFile':
         return client.getFile(args.fileKey);
       case 'figma_getImages':
         return client.getImages(args.fileKey, args.options);
       // ... other tools
     }
   });
   
   mcpServer.listen(process.stdin, process.stdout);
   ```

2. `tools.json` - MCP tool definitions:
   ```json
   {
     "tools": [
       {
         "name": "figma_getFile",
         "description": "Get Figma file design data",
         "parameters": {
           "type": "object",
           "properties": {
             "fileKey": { "type": "string", "description": "Figma file key" }
           },
           "required": ["fileKey"]
         }
       }
     ]
   }
   ```

3. `package.json` - Build configuration
4. `tsconfig.json` - TypeScript config

### 🔄 Task #4: Build MCP server wrapper for Bedrock
**Effort:** 6-8 hours
**Directory:** `/mcp-gateway/mcp-servers/bedrock-server/`

**Same structure as Figma:**
- server.ts wrapping BedrockClient
- tools.json with bedrock_invokeModel, bedrock_listModels, etc.
- Build configuration

### 🔄 Task #5: Build MCP server wrapper for Wolfram
**Effort:** 4-6 hours
**Directory:** `/mcp-gateway/mcp-servers/wolfram-server/`

**Same structure:**
- server.ts wrapping WolframClient
- tools.json with wolfram_query, wolfram_validate
- Rate limiting configuration (20/min, 2000/month)

### 🔄 Task #6: Update Gateway to support MCP protocol
**Effort:** 6-8 hours
**Files to Modify:**
- `/mcp-gateway/core/gateway.ts`
- `/mcp-gateway/server.ts`

**Changes:**
1. Add MCPClient to gateway:
   ```typescript
   class MCPGateway {
     private mcpClient: MCPClient;
     private directClients: {
       figma: FigmaClient;
       bedrock: BedrockClient;
       wolfram: WolframClient;
     };
     
     async processRequest(request: ToolRequest) {
       // Check mode from .mcp.json
       if (this.config.mode === 'mcp') {
         return this.mcpClient.callTool(server, tool, args);
       } else {
         // Use direct client (existing code)
         return this.directClients[server][method](args);
       }
     }
   }
   ```

2. Add mode switching:
   - Environment variable: `MCP_MODE=direct|mcp`
   - Default to direct in dev, mcp in production
   - Allow runtime switching

3. Update server.ts to initialize MCP client if mode=mcp

### 🔄 Task #7: Create MCP smoke tests
**Effort:** 4-6 hours
**File:** `/mcp-gateway/tests/smoke/mcp-protocol.smoke.test.ts`

**Test Cases:**
```typescript
describe('MCP Protocol Smoke Tests', () => {
  it('should start Figma MCP server via stdio', async () => {
    const server = await startMCPServer('figma');
    expect(server.isRunning()).toBe(true);
  });
  
  it('should call figma_getFile via MCP protocol', async () => {
    const response = await mcpClient.callTool('figma', 'figma_getFile', {
      fileKey: 'test-key'
    });
    expect(response).toHaveProperty('document');
  });
  
  it('should discover tools from Figma server', async () => {
    const tools = await mcpClient.discoverTools('figma');
    expect(tools).toContainEqual(expect.objectContaining({
      name: 'figma_getFile'
    }));
  });
  
  it('should handle errors gracefully', async () => {
    await expect(
      mcpClient.callTool('figma', 'invalid_tool', {})
    ).rejects.toThrow('Tool not found');
  });
});
```

### 🔄 Task #8: Document MCP architecture
**Effort:** 2-3 hours
**Files to Create/Update:**

1. `/mcp-gateway/docs/mcp-architecture.md`:
   - Architecture diagrams (direct vs MCP mode)
   - Configuration guide
   - Development vs production setup
   - Troubleshooting

2. Update `/mcp-gateway/README.md`:
   - Add MCP protocol section
   - Configuration examples
   - Mode switching instructions

## Implementation Order (Recommended)

**Phase 1: Foundation (Tasks #2, #3)** [14-18 hours]
1. Implement MCP protocol transport layer
2. Build Figma MCP wrapper (proves pattern works)
3. Test end-to-end: Gateway → MCP protocol → Figma server → Real API

**Phase 2: Expand (Tasks #4, #5)** [10-14 hours]
1. Build Bedrock MCP wrapper
2. Build Wolfram MCP wrapper
3. Test all three servers work via MCP protocol

**Phase 3: Integration (Task #6)** [6-8 hours]
1. Update gateway for dual mode
2. Add mode switching logic
3. Test direct mode still works

**Phase 4: Verification (Tasks #7, #8)** [6-9 hours]
1. Create smoke tests
2. Run Epic 7.5 v2 verification
3. Document architecture

**Total: 36-49 hours**

## Next Session Must:

1. **START Task #2:** Implement MCP protocol transport layer
   - Focus on stdio transport first (simpler than HTTP)
   - Create StdioTransport class
   - Test with simple echo server

2. **START Task #3:** Build Figma MCP wrapper
   - Use existing FigmaClient (proven working)
   - Create thin MCP server wrapper
   - Test: spawn server → send MCP request → get response

3. **Verify end-to-end:**
   ```bash
   # Start Figma MCP server
   node mcp-servers/figma-server/dist/server.js
   
   # Send MCP request via stdio
   echo '{"method":"figma_getFile","params":{"fileKey":"test"}}' | node mcp-servers/figma-server/dist/server.js
   
   # Should get JSON response
   ```

## Key Files Created This Session:

- `/mcp-gateway/.mcp.json` - MCP server configuration ✅
- `/mcp-gateway/CC-RESTART-PROMPT.md` - This file ✅

## Key Files Modified This Session:

- None (analysis only)

## Context Notes:

### Architecture Decision: Hybrid Mode
- **Direct Mode (dev):** Use existing TypeScript clients, no MCP protocol
- **MCP Mode (production):** Use MCP servers via stdio/HTTP protocol
- Gateway supports both, switchable via config
- Existing clients remain unchanged (proven working)

### Why This Approach Works:
1. **No Breaking Changes:** Existing code continues to work
2. **MCP Protocol Support:** Adds MCP compatibility
3. **Performance:** Direct mode avoids IPC overhead in dev
4. **Standards Compliance:** Production can use MCP protocol
5. **Incremental Migration:** Can switch server-by-server

### Agent IDs (for resuming):
- Explore agent (MCP infrastructure map): a2b562b
- Verification agent (Epic 7.5 v2): a3fa3c6

### MCP Protocol Resources:
- Spec: https://modelcontextprotocol.io/specification
- Examples: https://github.com/modelcontextprotocol/servers
- Transport: stdio (JSON-RPC over stdin/stdout)

### Token Usage:
- Current: ~111k / 200k tokens
- Still within safe limits

## For Next Developer:

1. Read this file first
2. Review .mcp.json to understand server config
3. Start with Task #2 (transport layer)
4. Build incrementally, test each component
5. Use Epic 7.5 v2 verification after each task

---

**Status:** Option 3 implementation STARTED
**Completed:** 1/8 tasks (12.5%)
**Next Priority:** Tasks #2 and #3 (foundation)
