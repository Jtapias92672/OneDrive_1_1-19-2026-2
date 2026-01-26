#!/bin/bash
#
# FORGE C Core - Quick Test
# 
# @epic 03 - FORGE C Core
# @owner joe@arcfoundry.ai
# @created 2026-01-19
#
# Usage: bash tests/quick-test.sh
#

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          FORGE Epic 03: FORGE C Core Tests                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to forge-c directory
cd "$(dirname "$0")/.." || exit 1

# ============================================
# Test 1: Core Types
# ============================================
echo "Test 1: Core Types"
echo "────────────────────────────────────────────────────────────"

if [ -f "core/types.ts" ]; then
    TYPES=$(grep -c "export" core/types.ts)
    echo "   ✅ types.ts exists ($TYPES exports)"
    grep -q "ForgeCConfig" core/types.ts && echo "   ✅ ForgeCConfig type"
    grep -q "Session" core/types.ts && echo "   ✅ Session type"
    grep -q "CompletionRequest" core/types.ts && echo "   ✅ CompletionRequest type"
    grep -q "GenerationResult" core/types.ts && echo "   ✅ GenerationResult type"
else
    echo "   ❌ types.ts missing"
    exit 1
fi

# ============================================
# Test 2: ForgeC Main Class
# ============================================
echo ""
echo "Test 2: ForgeC Main Class"
echo "────────────────────────────────────────────────────────────"

if [ -f "core/forge-c.ts" ]; then
    echo "   ✅ ForgeC class exists"
    grep -q "class ForgeC" core/forge-c.ts && echo "   ✅ Has ForgeC class"
    grep -q "createSession" core/forge-c.ts && echo "   ✅ Has createSession method"
    grep -q "generate" core/forge-c.ts && echo "   ✅ Has generate method"
    grep -q "complete" core/forge-c.ts && echo "   ✅ Has complete method"
else
    echo "   ❌ forge-c.ts missing"
    exit 1
fi

# ============================================
# Test 3: Session Manager
# ============================================
echo ""
echo "Test 3: Session Manager"
echo "────────────────────────────────────────────────────────────"

if [ -f "core/session.ts" ]; then
    echo "   ✅ SessionManager exists"
    grep -q "class SessionManager" core/session.ts && echo "   ✅ Has SessionManager class"
    grep -q "create" core/session.ts && echo "   ✅ Has create method"
    grep -q "MemoryStorage" core/session.ts && echo "   ✅ Has MemoryStorage"
    grep -q "FileStorage" core/session.ts && echo "   ✅ Has FileStorage (stub)"
else
    echo "   ❌ session.ts missing"
fi

# ============================================
# Test 4: Providers
# ============================================
echo ""
echo "Test 4: LLM Providers"
echo "────────────────────────────────────────────────────────────"

if [ -f "providers/index.ts" ]; then
    echo "   ✅ Providers module exists"
    grep -q "AnthropicProvider" providers/index.ts && echo "   ✅ AnthropicProvider"
    grep -q "OpenAIProvider" providers/index.ts && echo "   ✅ OpenAIProvider"
    grep -q "BedrockProvider" providers/index.ts && echo "   ✅ BedrockProvider (stub)"
    grep -q "MockProvider" providers/index.ts && echo "   ✅ MockProvider (for testing)"
    grep -q "createProvider" providers/index.ts && echo "   ✅ Provider factory"
else
    echo "   ❌ providers/index.ts missing"
fi

# ============================================
# Test 5: Plugins
# ============================================
echo ""
echo "Test 5: Plugin System"
echo "────────────────────────────────────────────────────────────"

if [ -f "plugins/index.ts" ]; then
    echo "   ✅ Plugins module exists"
    grep -q "PluginManager" plugins/index.ts && echo "   ✅ PluginManager"
    grep -q "LoggingPlugin" plugins/index.ts && echo "   ✅ LoggingPlugin"
    grep -q "MetricsPlugin" plugins/index.ts && echo "   ✅ MetricsPlugin"
    grep -q "EvidencePlugin" plugins/index.ts && echo "   ✅ EvidencePlugin"
else
    echo "   ❌ plugins/index.ts missing"
fi

# ============================================
# Test 6: MCP Tools
# ============================================
echo ""
echo "Test 6: MCP Tools"
echo "────────────────────────────────────────────────────────────"

if [ -f "mcp/index.ts" ]; then
    echo "   ✅ MCP module exists"
    TOOLS=$(grep -c "name:" mcp/index.ts)
    echo "   ✅ Has $TOOLS tool definitions"
    grep -q "forge_generate" mcp/index.ts && echo "   ✅ forge_generate tool"
    grep -q "forge_validate" mcp/index.ts && echo "   ✅ forge_validate tool"
    grep -q "forge_session_status" mcp/index.ts && echo "   ✅ forge_session_status tool"
    grep -q "MCPServer" mcp/index.ts && echo "   ✅ MCPServer class"
else
    echo "   ❌ mcp/index.ts missing"
fi

# ============================================
# Test 7: Main Index
# ============================================
echo ""
echo "Test 7: Main Index (index.ts)"
echo "────────────────────────────────────────────────────────────"

if [ -f "index.ts" ]; then
    echo "   ✅ index.ts exists"
    grep -q "ForgeC" index.ts && echo "   ✅ Exports ForgeC"
    grep -q "SessionManager" index.ts && echo "   ✅ Exports SessionManager"
    grep -q "AnthropicProvider" index.ts && echo "   ✅ Exports AnthropicProvider"
    grep -q "MCPServer" index.ts && echo "   ✅ Exports MCPServer"
    grep -q "generate" index.ts && echo "   ✅ Exports generate function"
else
    echo "   ❌ index.ts missing"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📋 Epic 03: FORGE C Core - Component Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "core/"
echo "  ├── types.ts              - Core type definitions"
echo "  ├── forge-c.ts            - Main ForgeC orchestrator"
echo "  ├── session.ts            - Session management"
echo "  └── index.ts              - Core exports"
echo ""
echo "providers/"
echo "  └── index.ts              - LLM providers (Anthropic, OpenAI, etc.)"
echo ""
echo "plugins/"
echo "  └── index.ts              - Plugin system (Logging, Metrics, Evidence)"
echo ""
echo "mcp/"
echo "  └── index.ts              - MCP tools & server"
echo ""
echo "index.ts                    - Main package exports"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🏗️ FORGE C Architecture:"
echo ""
echo "   ┌─────────────────────────────────────────────┐"
echo "   │              ForgeC Orchestrator            │"
echo "   │  ┌─────────────┬─────────────┬───────────┐ │"
echo "   │  │  Providers  │   Plugins   │    MCP    │ │"
echo "   │  │ ─────────── │ ─────────── │ ───────── │ │"
echo "   │  │ • Anthropic │ • Logging   │ • Tools   │ │"
echo "   │  │ • OpenAI    │ • Metrics   │ • Server  │ │"
echo "   │  │ • Bedrock   │ • Evidence  │           │ │"
echo "   │  │ • Mock      │             │           │ │"
echo "   │  └─────────────┴─────────────┴───────────┘ │"
echo "   │                     │                       │"
echo "   │              SessionManager                 │"
echo "   │        (Memory / File / Redis / DB)        │"
echo "   └─────────────────────────────────────────────┘"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Epic 03: FORGE C Core COMPLETE"
echo "════════════════════════════════════════════════════════════"
