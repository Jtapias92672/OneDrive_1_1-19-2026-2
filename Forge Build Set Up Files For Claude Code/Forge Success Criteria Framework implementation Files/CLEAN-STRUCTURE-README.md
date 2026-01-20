# FORGE Epic 2.5 + Epic 03 - Clean Directory Structure

## Issues Found in Your Screenshots

Your downloads had accumulated **corrupt artifacts**:

| Problem | Examples |
|---------|----------|
| Literal curly brace folders | `{core,security,sandbox,privacy,approval,monitoring,tests}` |
| Duplicate numbered versions | `mcp-gateway 2`, `mcp-gateway 3`, `forge-c 2`, `forge-c 3` |
| Duplicate gateway in forge-c | `forge-c/mcp/gateway/` (should NOT exist) |
| Files at wrong level | `deno-runtime.ts` at root instead of `sandbox/` |

## Clean Structure

Delete ALL existing `mcp-gateway*`, `forge-c*`, and `epic-02.5*` folders, then extract the CLEAN ZIPs:

```
forge/
│
├── mcp-gateway/                    ← CANONICAL Security Gateway (Epic 2.5)
│   │
│   ├── core/
│   │   ├── types.ts               (549 lines) - Config, Request/Response types
│   │   ├── gateway.ts             (758 lines) - MCPGateway class, 10-step pipeline
│   │   └── index.ts               (6 lines)   - Re-exports
│   │
│   ├── security/
│   │   └── index.ts               (460 lines) - OAuth 2.1 + PKCE, sanitization
│   │
│   ├── approval/
│   │   └── index.ts               (394 lines) - Human-in-the-loop approval
│   │
│   ├── sandbox/
│   │   ├── index.ts               (529 lines) - SandboxExecutor
│   │   └── deno-runtime.ts        (669 lines) - Real Deno subprocess execution
│   │
│   ├── privacy/
│   │   └── index.ts               (458 lines) - PII tokenization
│   │
│   ├── monitoring/
│   │   └── index.ts               (476 lines) - Audit logging, behavior monitoring
│   │
│   ├── tests/
│   │   ├── quick-test.sh
│   │   └── deno-runtime-test.sh
│   │
│   └── index.ts                   (180 lines) - Main exports
│
│
└── forge-c/                        ← FORGE C Core (Epic 03)
    │
    ├── core/
    │   ├── types.ts               - ForgeC types
    │   ├── forge-c.ts             - Main ForgeC class
    │   ├── session.ts             - Session management
    │   └── index.ts
    │
    ├── mcp/
    │   ├── server.ts              - HTTP/SSE MCP Server
    │   └── index.ts               - Re-exports (imports from ../../mcp-gateway)
    │   │
    │   └── [NO gateway/ folder!]  ← Uses canonical mcp-gateway via import
    │
    ├── providers/
    │   └── index.ts               - LLM provider implementations
    │
    ├── plugins/
    │   └── index.ts               - Plugin system
    │
    ├── tests/
    │   ├── quick-test.sh
    │   └── mcp-security-test.sh
    │
    └── index.ts
```

## Import Pattern

**forge-c imports from mcp-gateway** (no duplication):

```typescript
// In forge-c/mcp/server.ts
import {
  MCPGateway,
  MCPRequest,
  createGateway,
} from '../../mcp-gateway';  // ← Points to canonical location
```

## Installation Steps

1. **Delete corrupted folders**:
   ```bash
   rm -rf mcp-gateway* forge-c* epic-02.5* epic-2.5*
   ```

2. **Extract clean ZIPs**:
   ```bash
   unzip mcp-gateway-CLEAN.zip
   unzip forge-c-CLEAN.zip
   ```

3. **Verify structure**:
   ```bash
   ls mcp-gateway/sandbox/
   # Should show: deno-runtime.ts  index.ts
   
   ls forge-c/mcp/
   # Should show: index.ts  server.ts  (NO gateway folder!)
   ```

## File Counts

| Package | Files | Lines |
|---------|-------|-------|
| mcp-gateway | 10 .ts files | ~4,300 lines |
| forge-c | 9 .ts files | ~110K |

## Total Epic 2.5 Implementation

- 10 TypeScript files
- ~4,300 lines of code
- Zero Trust 10-step pipeline
- Real Deno runtime bindings
- All CRITICAL security gaps filled
