# Epic 3.5: MCP Gateway Foundation

**Duration:** 5 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** Epic 1 (Foundation)  
**Blocks:** Epic 3.6 (Security Controls), Epic 3 (FORGE C Core)

---

## Epic Goal

Establish the foundational Zero Trust MCP Gateway with CARS-based risk assessment, human approval gates, and tool integrity monitoring. This epic implements the first 3 critical security controls to prevent Tool Poisoning Attacks and unauthorized MCP operations identified in the 2025 MCP security breach analysis.

---

## Context: Why This Epic is CRITICAL

### 2025 MCP Security Landscape
- **7 major CVEs** disclosed (April-October 2025)
- **437K+ npm package downloads** affected (CVE-2025-6514)
- **Production breaches**: WhatsApp (chat exfiltration), GitHub (private repo leak), Asana (cross-org data breach)
- **Root cause**: MCP tools treated as trusted - they are NOT

### Security Gaps Addressed by This Epic
1. ✅ **Human Approval Gates** - MEDIUM+ risk operations require approval
2. ✅ **Tool Behavior Monitoring** - Detect Tool Poisoning and "Rug Pull" attacks  
3. ✅ **Runtime Permission Scoping** - CARS risk-based execution

### Remaining Gaps (Epic 3.6, 3.7)
- OAuth 2.1 with PKCE (Epic 3.6)
- Tenant isolation (Epic 3.6)
- Input sanitization (Epic 3.6)
- Supply chain verification (Epic 3.7)
- Rate limiting (Epic 3.7)
- Audit logging (Epic 3.7)

---

## User Stories

### US-3.5.1: Zero Trust Gateway Core
**As a** platform security officer  
**I want** all MCP tool calls to pass through a Zero Trust Gateway  
**So that** no tool can execute without validation and approval

**Acceptance Criteria:**
- [ ] Gateway package structure created at `packages/mcp-gateway/`
- [ ] All MCP tool invocations routed through gateway
- [ ] Tool schema validation before execution
- [ ] Gateway rejects malformed requests
- [ ] Gateway integrates with CARS framework for risk assessment

**Implementation Pattern:**
```typescript
// packages/mcp-gateway/src/core/gateway.ts
export class MCPGateway {
  async handleToolCall(request: ToolCallRequest): Promise<ToolCallResponse> {
    // Step 1: Validate request structure
    this.validateRequest(request);
    
    // Step 2: Check tool fingerprint (integrity)
    await this.verifyToolIntegrity(request.tool);
    
    // Step 3: CARS risk assessment
    const riskLevel = await this.carsEngine.assess(request);
    
    // Step 4: Route based on risk
    if (riskLevel >= RiskLevel.MEDIUM) {
      return await this.approvalEngine.requestApproval(request, riskLevel);
    }
    
    // Step 5: Execute LOW risk tools directly
    return await this.executor.execute(request);
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test
pnpm --filter @forge/mcp-gateway build
```

---

### US-3.5.2: CARS Risk Assessment Integration
**As a** security architect  
**I want** CARS framework integrated into the gateway  
**So that** tool risk levels determine execution policy

**Acceptance Criteria:**
- [ ] CARS risk levels defined: LOW, MEDIUM, HIGH, CRITICAL
- [ ] Tool risk matrix implemented (per-tool risk mappings)
- [ ] Context-aware risk calculation (considers user role, project, environment)
- [ ] Risk score returned for every tool call
- [ ] Automatic escalation for HIGH/CRITICAL risk

**Tool Risk Matrix:**
```typescript
// packages/mcp-gateway/src/cars/risk-matrix.ts
export const TOOL_RISK_MATRIX: Record<string, RiskLevel> = {
  // File operations
  'filesystem_write': RiskLevel.HIGH,
  'filesystem_delete': RiskLevel.CRITICAL,
  'filesystem_read': RiskLevel.MEDIUM,
  'filesystem_list': RiskLevel.LOW,
  
  // FORGE operations
  'forge_converge': RiskLevel.MEDIUM,          // Generates code
  'answer_contract_validate': RiskLevel.LOW,    // Read-only validation
  'evidence_pack_create': RiskLevel.LOW,        // Creates evidence bundle
  
  // External integrations (Epic 3.6 will add OAuth)
  'jira_create_epic': RiskLevel.MEDIUM,
  'github_push': RiskLevel.CRITICAL,
  'slack_post_message': RiskLevel.LOW,
};

export interface CARSContext {
  userId: string;
  projectId: string;
  environment: 'development' | 'staging' | 'production';
  userRole: 'developer' | 'admin' | 'viewer';
}

export class CARSEngine {
  async assess(request: ToolCallRequest, context: CARSContext): Promise<RiskAssessment> {
    const baseRisk = TOOL_RISK_MATRIX[request.tool.name] || RiskLevel.CRITICAL;
    
    // Context adjustments
    if (context.environment === 'production') {
      baseRisk = this.escalateRisk(baseRisk); // Production = +1 risk level
    }
    
    return {
      riskLevel: baseRisk,
      reasoning: this.explainRisk(request, context),
      requiresApproval: baseRisk >= RiskLevel.MEDIUM,
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:cars
```

---

### US-3.5.3: Human Approval Engine
**As a** compliance officer  
**I want** MEDIUM+ risk tools to require human approval  
**So that** autonomous AI cannot perform destructive operations without oversight

**Acceptance Criteria:**
- [ ] Approval engine routes MEDIUM+ risk calls to human review
- [ ] Approval request includes: tool name, parameters, risk level, reasoning
- [ ] Time-bound approval tokens (5-minute expiry)
- [ ] Approval UI API endpoint (`POST /api/mcp/approvals`)
- [ ] Automatic DENY on timeout
- [ ] Audit log of all approval decisions

**Approval Flow:**
```typescript
// packages/mcp-gateway/src/approval/approval-engine.ts
export class ApprovalEngine {
  async requestApproval(
    request: ToolCallRequest,
    riskLevel: RiskLevel
  ): Promise<ToolCallResponse> {
    // Create approval request
    const approvalId = uuidv4();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    await this.db.approvalRequests.create({
      id: approvalId,
      tool: request.tool.name,
      params: request.params,
      riskLevel,
      expiresAt,
      status: 'PENDING',
    });
    
    // Emit approval needed event (UI will poll or WebSocket)
    await this.events.emit('approval:required', { approvalId });
    
    // Wait for approval (with timeout)
    const decision = await this.waitForApproval(approvalId, expiresAt);
    
    if (decision.status === 'APPROVED') {
      return await this.executor.execute(request);
    } else {
      throw new ApprovalDeniedError(`Tool call denied: ${decision.reason}`);
    }
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:approval-engine
curl -X POST http://localhost:3000/api/mcp/approvals/:id/approve
```

---

### US-3.5.4: Tool Integrity Monitoring
**As a** security engineer  
**I want** runtime monitoring of tool behavior  
**So that** Tool Poisoning and "Rug Pull" attacks are detected immediately

**Acceptance Criteria:**
- [ ] Tool fingerprinting at registration (SHA-256 hash of definition)
- [ ] Runtime tool description comparison (detect mutations)
- [ ] Automatic tool quarantine on integrity violation
- [ ] Security alerts via logging system
- [ ] Tool allowlist/blocklist management

**Tool Poisoning Detection:**
```typescript
// packages/mcp-gateway/src/monitoring/tool-integrity.ts
export class ToolIntegrityMonitor {
  private registry: Map<string, ToolFingerprint> = new Map();
  
  async registerTool(tool: MCPTool): Promise<void> {
    const fingerprint = this.calculateFingerprint(tool);
    this.registry.set(tool.name, fingerprint);
    
    await this.db.toolRegistry.upsert({
      name: tool.name,
      fingerprint,
      registeredAt: new Date(),
    });
  }
  
  async verifyIntegrity(tool: MCPTool): Promise<void> {
    const currentFingerprint = this.calculateFingerprint(tool);
    const registeredFingerprint = this.registry.get(tool.name);
    
    if (!registeredFingerprint) {
      throw new UnregisteredToolError(`Tool ${tool.name} not registered`);
    }
    
    if (currentFingerprint.hash !== registeredFingerprint.hash) {
      // CRITICAL: Tool Poisoning detected
      await this.quarantineTool(tool.name);
      await this.alertSecurity({
        type: 'TOOL_POISONING_DETECTED',
        tool: tool.name,
        expectedHash: registeredFingerprint.hash,
        actualHash: currentFingerprint.hash,
        severity: 'CRITICAL',
      });
      
      throw new ToolPoisoningError(
        `Tool ${tool.name} behavior changed post-registration`
      );
    }
  }
  
  private calculateFingerprint(tool: MCPTool): ToolFingerprint {
    const canonical = JSON.stringify({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    });
    
    return {
      hash: createHash('sha256').update(canonical).digest('hex'),
      timestamp: new Date(),
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:tool-poisoning
```

---

## Key Deliverables

```
packages/mcp-gateway/
├── src/
│   ├── core/
│   │   ├── gateway.ts                 # Main gateway orchestrator
│   │   ├── types.ts                   # Gateway types
│   │   ├── config.ts                  # Configuration
│   │   └── executor.ts                # Tool execution wrapper
│   ├── cars/
│   │   ├── risk-assessment.ts         # CARS integration
│   │   ├── risk-matrix.ts             # Tool risk mappings
│   │   └── risk-levels.ts             # Risk level definitions
│   ├── approval/
│   │   ├── approval-engine.ts         # Approval orchestration
│   │   ├── approval-api.ts            # REST API for approvals
│   │   └── approval-tokens.ts         # Time-bound tokens
│   └── monitoring/
│       ├── tool-integrity.ts          # Integrity monitoring
│       ├── fingerprinting.ts          # Tool fingerprinting
│       └── quarantine.ts              # Tool quarantine
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Completion Criteria

- [ ] All 4 User Stories implemented
- [ ] Gateway intercepts 100% of MCP tool calls
- [ ] CARS risk assessment integrated
- [ ] Human approval gates functional for MEDIUM+ risk
- [ ] Tool integrity monitoring detects mutations
- [ ] All unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Handoff to Epic 3.6 ready

---

## Handoff Context for Epic 3.6

**What Epic 3.6 needs to know:**

**Gateway Entry Point:**
```typescript
import { MCPGateway } from '@forge/mcp-gateway';

const gateway = new MCPGateway({
  carsEngine: carsEngine,
  approvalEngine: approvalEngine,
  integrityMonitor: integrityMonitor,
});

await gateway.handleToolCall(request);
```

**What Epic 3.6 will add:**
1. OAuth 2.1 with PKCE (prevent Confused Deputy attacks)
2. Tenant isolation (prevent cross-customer data leaks)
3. Advanced input sanitization (prevent prompt/command injection)

**Files to reference:**
- `packages/mcp-gateway/src/core/gateway.ts` - Main entry point
- `packages/mcp-gateway/src/core/types.ts` - Extend ToolCallRequest
- `packages/mcp-gateway/src/cars/risk-assessment.ts` - CARS context

---

## Verification Script

```bash
#!/bin/bash
# verify-epic-3.5.sh

set -e

echo "🔍 Verifying Epic 3.5: MCP Gateway Foundation"

# Check package structure
if [ ! -d "packages/mcp-gateway" ]; then
  echo "❌ mcp-gateway package missing"
  exit 1
fi

# Check core files
required_files=(
  "packages/mcp-gateway/src/core/gateway.ts"
  "packages/mcp-gateway/src/cars/risk-assessment.ts"
  "packages/mcp-gateway/src/approval/approval-engine.ts"
  "packages/mcp-gateway/src/monitoring/tool-integrity.ts"
  "packages/mcp-gateway/package.json"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Build
echo "📦 Building mcp-gateway..."
pnpm --filter @forge/mcp-gateway build

# Run tests
echo "🧪 Running tests..."
pnpm --filter @forge/mcp-gateway test

# Verify CARS integration
echo "🔒 Verifying CARS integration..."
pnpm --filter @forge/mcp-gateway test:cars

# Verify approval engine
echo "✋ Verifying approval engine..."
pnpm --filter @forge/mcp-gateway test:approval-engine

# Verify tool integrity monitoring
echo "🔍 Verifying tool integrity monitoring..."
pnpm --filter @forge/mcp-gateway test:tool-poisoning

echo ""
echo "✅ Epic 3.5 verification complete"
echo "✅ Gateway foundation operational"
echo "✅ CARS risk assessment integrated"
echo "✅ Human approval gates functional"
echo "✅ Tool integrity monitoring active"
echo ""
echo "📋 Ready for Epic 3.6: Security Controls"
```
