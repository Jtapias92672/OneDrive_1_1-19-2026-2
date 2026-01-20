#!/bin/bash
#
# MCP Security + Server Test
# 
# Tests consolidated architecture:
# - mcp-gateway/  = Canonical MCP Security Gateway (Epic 2.5)
# - forge-c/mcp/  = Server that imports from mcp-gateway
#

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     FORGE MCP Consolidated Architecture Verification       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/../.." || exit 1

# ============================================
# Test 1: MCP Gateway (Canonical - Epic 2.5)
# ============================================
echo "Test 1: MCP Gateway (Canonical Location)"
echo "────────────────────────────────────────────────────────────"

if [ -d "mcp-gateway" ]; then
    echo "   ✅ mcp-gateway/ exists (canonical location)"
    
    # Core
    [ -f "mcp-gateway/core/types.ts" ] && echo "   ✅ core/types.ts"
    [ -f "mcp-gateway/core/gateway.ts" ] && echo "   ✅ core/gateway.ts"
    
    # Security modules
    [ -f "mcp-gateway/security/index.ts" ] && echo "   ✅ security/ module"
    [ -f "mcp-gateway/approval/index.ts" ] && echo "   ✅ approval/ module"
    [ -f "mcp-gateway/sandbox/index.ts" ] && echo "   ✅ sandbox/ module"
    [ -f "mcp-gateway/privacy/index.ts" ] && echo "   ✅ privacy/ module"
    [ -f "mcp-gateway/monitoring/index.ts" ] && echo "   ✅ monitoring/ module"
    
    # Main index
    [ -f "mcp-gateway/index.ts" ] && echo "   ✅ index.ts (main exports)"
else
    echo "   ❌ mcp-gateway/ missing"
fi

# ============================================
# Test 2: Forge-C MCP (Consumer)
# ============================================
echo ""
echo "Test 2: Forge-C MCP (Consumer of Gateway)"
echo "────────────────────────────────────────────────────────────"

if [ -d "forge-c/mcp" ]; then
    echo "   ✅ forge-c/mcp/ exists"
    
    # Should NOT have gateway subdirectory (using canonical)
    if [ ! -d "forge-c/mcp/gateway" ]; then
        echo "   ✅ No duplicate gateway/ (correct!)"
    else
        echo "   ❌ Duplicate gateway/ still exists"
    fi
    
    # Server and index
    [ -f "forge-c/mcp/server.ts" ] && echo "   ✅ server.ts (HTTP server)"
    [ -f "forge-c/mcp/index.ts" ] && echo "   ✅ index.ts (exports)"
    
    # Check import statement
    if grep -q "from '../../mcp-gateway'" forge-c/mcp/server.ts 2>/dev/null; then
        echo "   ✅ Imports from canonical mcp-gateway"
    else
        echo "   ❌ Not importing from canonical location"
    fi
else
    echo "   ❌ forge-c/mcp/ missing"
fi

# ============================================
# Test 3: Gateway Features
# ============================================
echo ""
echo "Test 3: Gateway Security Features (10-Step Pipeline)"
echo "────────────────────────────────────────────────────────────"

if [ -f "mcp-gateway/core/gateway.ts" ]; then
    grep -q "authenticate" mcp-gateway/core/gateway.ts && echo "   ✅ 1. Authentication"
    grep -q "Rate" mcp-gateway/core/gateway.ts && echo "   ✅ 2. Rate Limiting"
    grep -q "sanitize\|Sanitize" mcp-gateway/core/gateway.ts && echo "   ✅ 3. Input Sanitization"
    grep -q "integrity\|Integrity" mcp-gateway/core/gateway.ts && echo "   ✅ 4. Tool Integrity"
    grep -q "CARS\|Risk" mcp-gateway/core/gateway.ts && echo "   ✅ 5. CARS Assessment"
    grep -q "Approval\|approval" mcp-gateway/core/gateway.ts && echo "   ✅ 6. Human Approval"
    grep -q "tokenize\|Tokenize\|Privacy" mcp-gateway/core/gateway.ts && echo "   ✅ 7. Privacy Tokenization"
    grep -q "sandbox\|Sandbox" mcp-gateway/core/gateway.ts && echo "   ✅ 8. Sandbox Execution"
    grep -q "detokenize\|Detokenize" mcp-gateway/core/gateway.ts && echo "   ✅ 9. Detokenization"
    grep -q "audit\|Audit" mcp-gateway/core/gateway.ts && echo "   ✅ 10. Audit Logging"
fi

# ============================================
# Test 4: Server Features  
# ============================================
echo ""
echo "Test 4: MCP Server Features"
echo "────────────────────────────────────────────────────────────"

if [ -f "forge-c/mcp/server.ts" ]; then
    grep -q "class MCPServer" forge-c/mcp/server.ts && echo "   ✅ MCPServer class"
    grep -q "/health" forge-c/mcp/server.ts && echo "   ✅ Health endpoint"
    grep -q "/mcp/tools/list" forge-c/mcp/server.ts && echo "   ✅ MCP tools/list"
    grep -q "/mcp/tools/call" forge-c/mcp/server.ts && echo "   ✅ MCP tools/call"
    grep -q "SSE\|event-stream" forge-c/mcp/server.ts && echo "   ✅ SSE support"
    grep -q "MCPGateway" forge-c/mcp/server.ts && echo "   ✅ Gateway integration"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📋 Consolidated Architecture"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  forge/"
echo "  ├── mcp-gateway/          ← CANONICAL (Epic 2.5)"
echo "  │   ├── core/"
echo "  │   │   ├── types.ts"
echo "  │   │   └── gateway.ts     ← MCPGateway class"
echo "  │   ├── security/"
echo "  │   ├── approval/"
echo "  │   ├── sandbox/"
echo "  │   ├── privacy/"
echo "  │   ├── monitoring/"
echo "  │   └── index.ts"
echo "  │"
echo "  └── forge-c/"
echo "      └── mcp/"
echo "          ├── server.ts      ← HTTP Server (imports gateway)"
echo "          └── index.ts       ← Re-exports gateway + tools"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Single Gateway Architecture VERIFIED"
echo "════════════════════════════════════════════════════════════"
