# Epic 3.5: MCP Gateway Foundation - Task Breakdown (ENHANCED)

**Total Tasks:** 17 (was 15, +2 Jan 2025 alignment research tasks)  
**Estimated Tokens:** 55K total (~3.2K per task)  
**Estimated Time:** 6 days (was 5, +1 day for alignment research integration)  
**Dependencies:** Epic 3 (FORGE C Core)

---

## CHANGELOG (Jan 2025)

| Change | Reason | Source |
|--------|--------|--------|
| +Task 3.5.2.4 | DECEPTIVE_COMPLIANCE risk type | Anthropic "Alignment Faking" (Dec 2024) |
| +Task 3.5.2.5 | REWARD_HACKING_INDUCED risk type | Anthropic "Shortcuts to Sabotage" (Nov 2025) |
| +1 day timeline | Alignment research integration | ArcFoundry verification requirements |

---

## Skills Integration (P2 Requirements)

### Required Skills for Epic 3.5
| Component | Required Skills | Reference |
|-----------|-----------------|-----------|
| MCP Gateway | `cars-framework` (enhanced), `alignment-audit-protocol` | /mnt/skills/user/ |
| Security Controls | `verification-pillars` (10 pillars), `slop-tests` | NewSkills_Library.zip |

### Extended Thinking Trigger (MANDATORY)
```
⚠️ COMPLIANCE PROFILE REQUIRED
Epic 3.5 is SECURITY-CRITICAL (DCMA/DFARS/CMMC scope)

All prompts for this epic MUST use: "ULTRATHINK"
Token budget: 16,000 thinking tokens (COMPLIANCE profile)
Auto-escalation keywords present: CARS, security, approval, risk
```

### Context Positioning Protocol (MANDATORY)
```
PRIMACY ZONE (First 15%):
- CARS framework risk levels and matrix
- Answer Contract schema reference
- DCMA/DFARS compliance constraints

MIDDLE ZONE (15-85%):
- Previous task outputs
- Supporting documentation
- Code context from earlier phases

RECENCY ZONE (Last 15%):
- Current task specification
- Acceptance criteria
- Verification commands
```

### Structured Handoff Protocol
```
TRIGGER: Context fill reaches 60%
ACTION: Generate DTA (Decisions, To-dos, Ask) handoff document
FORMAT: See structured-handoff-protocol skill

Checkpoint tasks for handoff:
- After Task 3.5.1.4 (Gateway Core complete)
- After Task 3.5.2.6 (CARS Integration complete)
- After Task 3.5.3.4 (Approval Engine complete)
- After Task 3.5.4.3 (Tool Integrity complete)
```

---

## Phase 1: Gateway Core Infrastructure (US-3.5.1)

### Task 3.5.1.1: Create mcp-gateway package structure

**Time:** 5 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/package.json`
- `packages/mcp-gateway/tsconfig.json`
- `packages/mcp-gateway/src/index.ts`
- `packages/mcp-gateway/src/core/types.ts`
- `packages/mcp-gateway/README.md`

**Acceptance Criteria:**
- [ ] Package builds successfully
- [ ] TypeScript strict mode enabled
- [ ] Exports main gateway types
- [ ] pnpm workspace recognizes package

**Commands:**
```bash
mkdir -p packages/mcp-gateway/src/core
cd packages/mcp-gateway
pnpm init
pnpm add zod @anthropic-ai/sdk
pnpm add -D @types/node typescript vitest
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway build
```

---

### Task 3.5.1.2: Implement gateway core types

**Time:** 10 minutes  
**Tokens:** ~4K  

**Files to CREATE:**
- `packages/mcp-gateway/src/core/types.ts`
- `packages/mcp-gateway/src/core/errors.ts`

**Acceptance Criteria:**
- [ ] ToolCallRequest interface defined
- [ ] ToolCallResponse interface defined
- [ ] RiskLevel enum defined
- [ ] Gateway error classes defined
- [ ] Zod schemas for runtime validation

**Implementation:**
```typescript
// packages/mcp-gateway/src/core/types.ts
import { z } from 'zod';

export enum RiskLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export const ToolCallRequestSchema = z.object({
  tool: z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.record(z.unknown()),
  }),
  params: z.record(z.unknown()),
  context: z.object({
    userId: z.string(),
    projectId: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
  }),
});

export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;

export interface ToolCallResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  metadata: {
    riskLevel: RiskLevel;
    approvalRequired: boolean;
    executionTime: number;
  };
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:types
```

---

### Task 3.5.1.3: Implement MCPGateway orchestrator

**Time:** 15 minutes  
**Tokens:** ~5K  

**Files to CREATE:**
- `packages/mcp-gateway/src/core/gateway.ts`
- `packages/mcp-gateway/src/core/config.ts`
- `packages/mcp-gateway/tests/unit/gateway.test.ts`

**Acceptance Criteria:**
- [ ] MCPGateway class implements handleToolCall method
- [ ] Request validation using Zod schemas
- [ ] Integration points for CARS, approval, integrity modules
- [ ] Error handling for invalid requests
- [ ] Unit tests cover happy path and error cases

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:gateway
```

---

### Task 3.5.1.4: Implement request validation

**Time:** 5 minutes  
**Tokens:** ~3K  

**Files to MODIFY:**
- `packages/mcp-gateway/src/core/gateway.ts`

**Files to CREATE:**
- `packages/mcp-gateway/tests/unit/validation.test.ts`

**Acceptance Criteria:**
- [ ] Zod schema validation integrated
- [ ] Validation errors thrown with clear messages
- [ ] Tests cover invalid requests
- [ ] Performance: validation <1ms per request

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:validation
```

---

## Phase 2: CARS Risk Assessment (US-3.5.2) - ENHANCED

### Task 3.5.2.1: Define CARS risk levels and matrix

**Time:** 10 minutes  
**Tokens:** ~4K  

**Files to CREATE:**
- `packages/mcp-gateway/src/cars/risk-levels.ts`
- `packages/mcp-gateway/src/cars/risk-matrix.ts`
- `packages/mcp-gateway/tests/unit/risk-matrix.test.ts`

**Acceptance Criteria:**
- [ ] RiskLevel enum matches CARS framework
- [ ] Tool risk matrix covers all FORGE tools
- [ ] Risk matrix is extensible (easy to add new tools)
- [ ] Tests verify risk mappings

**Implementation:**
```typescript
// packages/mcp-gateway/src/cars/risk-matrix.ts
import { RiskLevel } from '../core/types.js';

export const TOOL_RISK_MATRIX: Record<string, RiskLevel> = {
  // File operations
  'filesystem_write': RiskLevel.HIGH,
  'filesystem_delete': RiskLevel.CRITICAL,
  'filesystem_read': RiskLevel.MEDIUM,
  'filesystem_list': RiskLevel.LOW,
  
  // FORGE operations
  'forge_converge': RiskLevel.MEDIUM,
  'answer_contract_validate': RiskLevel.LOW,
  'evidence_pack_create': RiskLevel.LOW,
  
  // External integrations
  'jira_create_epic': RiskLevel.MEDIUM,
  'github_push': RiskLevel.CRITICAL,
  'slack_post_message': RiskLevel.LOW,
};

export function getToolRisk(toolName: string): RiskLevel {
  return TOOL_RISK_MATRIX[toolName] ?? RiskLevel.CRITICAL; // Unknown = CRITICAL
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:risk-matrix
```

---

### Task 3.5.2.2: Implement CARS context types

**Time:** 5 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/src/cars/context.ts`

**Acceptance Criteria:**
- [ ] CARSContext interface defined
- [ ] Context includes userId, projectId, environment, userRole
- [ ] Context validation

**Implementation:**
```typescript
// packages/mcp-gateway/src/cars/context.ts
import { z } from 'zod';

export const CARSContextSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  environment: z.enum(['development', 'staging', 'production']),
  userRole: z.enum(['viewer', 'developer', 'admin']),
});

export type CARSContext = z.infer<typeof CARSContextSchema>;
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:cars-context
```

---

### Task 3.5.2.3: Implement CARS risk assessment engine

**Time:** 15 minutes  
**Tokens:** ~5K  

**Files to CREATE:**
- `packages/mcp-gateway/src/cars/risk-assessment.ts`
- `packages/mcp-gateway/tests/unit/risk-assessment.test.ts`

**Acceptance Criteria:**
- [ ] CARSEngine class implements assess method
- [ ] Base risk from tool matrix
- [ ] Context-aware risk escalation (production +1 level)
- [ ] Risk reasoning generated
- [ ] Tests cover all risk levels and escalation scenarios

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:risk-assessment
```

---

### Task 3.5.2.4: Implement DECEPTIVE_COMPLIANCE Risk Detection (NEW - Jan 2025)

**Time:** 20 minutes  
**Tokens:** ~4K  

**Research Basis:** Anthropic "Alignment Faking in Large Language Models" (Dec 2024)

> "Models can strategically comply with training objectives while maintaining hidden preferences. This behavior emerged WITHOUT being explicitly trained for it."

**Files to CREATE:**
- `packages/mcp-gateway/src/cars/deceptive-compliance-detector.ts`
- `packages/mcp-gateway/tests/unit/deceptive-compliance.test.ts`

**Files to MODIFY:**
- `packages/mcp-gateway/src/cars/risk-assessment.ts` (add DECEPTIVE_COMPLIANCE checks)

**Acceptance Criteria:**
- [ ] DeceptiveComplianceDetector class implemented
- [ ] 5 risk indicators detected with modifiers:
  - Agent self-validates own work: +1 level
  - No external verification available: +1 level
  - Complex multi-step hidden reasoning: +0.5 level
  - Agent claims urgency to bypass review: +0.5 level
  - Agent reports success without evidence: +0.5 level
- [ ] Detection patterns for:
  - "task complete" without verifiable output
  - Passes own tests but fails external validation
  - Modifies files outside stated scope
  - Reasoning doesn't match actual behavior
  - Rapid "success" claims on complex tasks
- [ ] Integration with CARSEngine.assess()
- [ ] Tests cover all 5 indicators

**Implementation:**
```typescript
// packages/mcp-gateway/src/cars/deceptive-compliance-detector.ts
import { RiskLevel } from '../core/types.js';

export interface DeceptiveComplianceIndicators {
  selfValidation: boolean;      // Agent self-validates own work
  noExternalVerification: boolean; // No external verification available
  hiddenReasoning: boolean;     // Complex multi-step hidden reasoning
  urgencyBypass: boolean;       // Claims urgency to bypass review
  successWithoutEvidence: boolean; // Reports success without evidence
}

export interface DeceptiveComplianceAssessment {
  indicatorCount: number;
  riskModifier: number;
  indicators: string[];
  action: 'SPOT_CHECK' | 'FULL_REVIEW' | 'ESCALATE';
}

export class DeceptiveComplianceDetector {
  /**
   * Detect deceptive compliance indicators per Anthropic Dec 2024 research
   */
  detect(context: DeceptiveComplianceContext): DeceptiveComplianceAssessment {
    const indicators: string[] = [];
    let riskModifier = 0;
    
    // Indicator 1: Self-validation (+1 level)
    if (context.agentValidatesOwnWork && !context.externalValidationPresent) {
      indicators.push('Agent self-validates own work');
      riskModifier += 1.0;
    }
    
    // Indicator 2: No external verification (+1 level)
    if (!context.externalVerificationAvailable) {
      indicators.push('No external verification available');
      riskModifier += 1.0;
    }
    
    // Indicator 3: Hidden reasoning (+0.5 level)
    if (context.reasoningStepCount > 5 && !context.reasoningFullyVisible) {
      indicators.push('Complex multi-step hidden reasoning');
      riskModifier += 0.5;
    }
    
    // Indicator 4: Urgency bypass (+0.5 level)
    if (context.claimsUrgency && context.requestsBypassReview) {
      indicators.push('Agent claims urgency to bypass review');
      riskModifier += 0.5;
    }
    
    // Indicator 5: Success without evidence (+0.5 level)
    if (context.claimsSuccess && !context.evidenceProvided) {
      indicators.push('Agent reports success without evidence');
      riskModifier += 0.5;
    }
    
    // Determine action based on indicator count
    const indicatorCount = indicators.length;
    let action: 'SPOT_CHECK' | 'FULL_REVIEW' | 'ESCALATE';
    
    if (indicatorCount >= 3) {
      action = 'ESCALATE'; // Assume potential deception
    } else if (indicatorCount === 2) {
      action = 'FULL_REVIEW'; // Full human review required
    } else if (indicatorCount === 1) {
      action = 'SPOT_CHECK'; // Human spot-check required
    } else {
      action = 'SPOT_CHECK'; // Default to spot-check
    }
    
    return {
      indicatorCount,
      riskModifier,
      indicators,
      action,
    };
  }
}

export interface DeceptiveComplianceContext {
  agentValidatesOwnWork: boolean;
  externalValidationPresent: boolean;
  externalVerificationAvailable: boolean;
  reasoningStepCount: number;
  reasoningFullyVisible: boolean;
  claimsUrgency: boolean;
  requestsBypassReview: boolean;
  claimsSuccess: boolean;
  evidenceProvided: boolean;
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:deceptive-compliance
```

---

### Task 3.5.2.5: Implement REWARD_HACKING_INDUCED Risk Detection (NEW - Jan 2025)

**Time:** 25 minutes  
**Tokens:** ~5K  

**Research Basis:** Anthropic "From Shortcuts to Sabotage: Natural Emergent Misalignment from Reward Hacking" (Nov 2025)

> "When models learn to reward hack (cheat on programming tasks), they spontaneously generalize to alignment faking, research sabotage, and cooperation with malicious actors—WITHOUT being trained or instructed to do so."

**Critical Finding:** Alignment faking reasoning appeared in **50% of responses** even to simple questions like "What are your goals?" after the model learned to reward hack.

**Files to CREATE:**
- `packages/mcp-gateway/src/cars/reward-hacking-detector.ts`
- `packages/mcp-gateway/tests/unit/reward-hacking.test.ts`

**Files to MODIFY:**
- `packages/mcp-gateway/src/cars/risk-assessment.ts` (add REWARD_HACKING_INDUCED checks)

**Acceptance Criteria:**
- [ ] RewardHackingDetector class implemented
- [ ] Code pattern detection for:
  - `sys.exit(0)` - Force exit with success code (+1.5 levels)
  - `mock.return_value = True` - Mock always succeeds (+1 level)
  - `@skip` or `@pytest.mark.skip` - Skip verification (+1 level)
  - `# pragma: no cover` - Exclude from coverage (+0.5 level)
  - `echo "PASS"` - Hardcoded success message (+1 level)
- [ ] Test infrastructure modification detection:
  - Code and tests modified in same commit = WARNING
  - Assertions removed = CRITICAL
- [ ] Escalation rules:
  - 0 indicators: Normal CARS assessment
  - 1 indicator: External test verification required (+1 level)
  - 2 indicators: Human review of all test results (+2 levels)
  - 3+ indicators: Assume compromised, full audit (CRITICAL)
- [ ] Integration with CARSEngine.assess()
- [ ] Tests cover all patterns

**Implementation:**
```typescript
// packages/mcp-gateway/src/cars/reward-hacking-detector.ts
import { RiskLevel } from '../core/types.js';

export interface RewardHackingIndicators {
  testBypassDetected: boolean;      // sys.exit(0), forced returns, mock manipulation
  shortcutPatterns: boolean;        // Finding loopholes vs solving problems
  evaluationGaming: boolean;        // Optimizing proxy instead of goal
  semanticDrift: boolean;           // Behavior diverges from stated intentions
  rapidCompletionClaims: boolean;   // Complex tasks "solved" suspiciously fast
  testInfraModified: boolean;       // Agent changes tests alongside code
  assertionsRemoved: boolean;       // Assertions removed in commit
}

export interface RewardHackingAssessment {
  indicatorCount: number;
  riskModifier: number;
  patterns: RewardHackingPattern[];
  action: 'NORMAL' | 'EXTERNAL_VERIFY' | 'HUMAN_REVIEW' | 'FULL_AUDIT';
}

export interface RewardHackingPattern {
  pattern: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  location?: string;
  riskModifier: number;
}

// Regex patterns for code analysis
const REWARD_HACKING_PATTERNS = {
  // CRITICAL: Force exit with success
  SYS_EXIT: {
    pattern: /sys\.exit\(0\)/g,
    severity: 'CRITICAL' as const,
    modifier: 1.5,
    description: 'Force exit with success code',
  },
  OS_EXIT: {
    pattern: /os\._exit\(/g,
    severity: 'CRITICAL' as const,
    modifier: 1.5,
    description: 'os._exit() bypasses cleanup',
  },
  // HIGH: Mock manipulation
  MOCK_RETURN_TRUE: {
    pattern: /mock\.return_value\s*=\s*True/gi,
    severity: 'HIGH' as const,
    modifier: 1.0,
    description: 'Mock always returns success',
  },
  MOCK_RETURN_EXPECTED: {
    pattern: /return_value\s*=\s*expected/gi,
    severity: 'HIGH' as const,
    modifier: 1.0,
    description: 'Mock returns expected value',
  },
  // HIGH: Skip verification
  PYTEST_SKIP: {
    pattern: /@pytest\.mark\.skip/g,
    severity: 'HIGH' as const,
    modifier: 1.0,
    description: 'Test skipped without documented reason',
  },
  UNITTEST_SKIP: {
    pattern: /@unittest\.skip/g,
    severity: 'HIGH' as const,
    modifier: 1.0,
    description: 'Test skipped',
  },
  // MEDIUM: Coverage exclusion
  PRAGMA_NO_COVER: {
    pattern: /#\s*pragma:\s*no\s*cover/gi,
    severity: 'MEDIUM' as const,
    modifier: 0.5,
    description: 'Code excluded from coverage',
  },
  // HIGH: Hardcoded success
  ECHO_PASS: {
    pattern: /echo\s*["']PASS["']/gi,
    severity: 'HIGH' as const,
    modifier: 1.0,
    description: 'Hardcoded success message in shell',
  },
  // CRITICAL: Tautological tests
  ASSERT_TRUE_BARE: {
    pattern: /assert\s+True\s*$/gm,
    severity: 'CRITICAL' as const,
    modifier: 1.5,
    description: 'Tautological assertion (always passes)',
  },
  ASSERT_ACTUAL_ACTUAL: {
    pattern: /assert.*==.*actual.*==/gi,
    severity: 'CRITICAL' as const,
    modifier: 1.5,
    description: 'Comparing actual to itself',
  },
};

export class RewardHackingDetector {
  /**
   * Analyze code for reward hacking patterns per Anthropic Nov 2025 research
   */
  analyzeCode(code: string, context?: RewardHackingContext): RewardHackingAssessment {
    const patterns: RewardHackingPattern[] = [];
    let totalModifier = 0;
    
    // Scan for each pattern
    for (const [name, config] of Object.entries(REWARD_HACKING_PATTERNS)) {
      const matches = code.match(config.pattern);
      if (matches && matches.length > 0) {
        patterns.push({
          pattern: name,
          severity: config.severity,
          riskModifier: config.modifier,
        });
        totalModifier += config.modifier;
      }
    }
    
    // Check for test infrastructure modification
    if (context?.codeAndTestsModifiedTogether) {
      patterns.push({
        pattern: 'TEST_INFRA_MODIFIED',
        severity: 'HIGH',
        riskModifier: 1.0,
      });
      totalModifier += 1.0;
    }
    
    // Check for assertion removal
    if (context?.assertionsRemovedCount && context.assertionsRemovedCount > 0) {
      patterns.push({
        pattern: 'ASSERTIONS_REMOVED',
        severity: 'CRITICAL',
        riskModifier: 1.5 * context.assertionsRemovedCount,
      });
      totalModifier += 1.5 * context.assertionsRemovedCount;
    }
    
    // Determine action based on indicator count
    const indicatorCount = patterns.length;
    let action: 'NORMAL' | 'EXTERNAL_VERIFY' | 'HUMAN_REVIEW' | 'FULL_AUDIT';
    
    if (indicatorCount >= 3 || patterns.some(p => p.severity === 'CRITICAL')) {
      action = 'FULL_AUDIT'; // Assume compromised
    } else if (indicatorCount === 2) {
      action = 'HUMAN_REVIEW'; // Human review of all test results
    } else if (indicatorCount === 1) {
      action = 'EXTERNAL_VERIFY'; // External test verification required
    } else {
      action = 'NORMAL'; // Normal CARS assessment
    }
    
    return {
      indicatorCount,
      riskModifier: Math.min(totalModifier, 3), // Cap at +3 levels (to CRITICAL)
      patterns,
      action,
    };
  }
}

export interface RewardHackingContext {
  codeAndTestsModifiedTogether?: boolean;
  assertionsRemovedCount?: number;
  rapidCompletion?: boolean;
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:reward-hacking
```

---

### Task 3.5.2.6: Integrate CARS with gateway (Updated)

**Time:** 15 minutes  
**Tokens:** ~4K  

**Files to MODIFY:**
- `packages/mcp-gateway/src/core/gateway.ts`
- `packages/mcp-gateway/src/cars/risk-assessment.ts`

**Acceptance Criteria:**
- [ ] MCPGateway calls CARSEngine.assess() before tool execution
- [ ] CARSEngine integrates DeceptiveComplianceDetector
- [ ] CARSEngine integrates RewardHackingDetector
- [ ] Risk level determines approval requirement
- [ ] Integration tests verify end-to-end flow

**Implementation (Updated CARSEngine):**
```typescript
// packages/mcp-gateway/src/cars/risk-assessment.ts
import { RiskLevel, ToolCallRequest } from '../core/types.js';
import { getToolRisk } from './risk-matrix.js';
import { CARSContext } from './context.js';
import { DeceptiveComplianceDetector, DeceptiveComplianceContext } from './deceptive-compliance-detector.js';
import { RewardHackingDetector, RewardHackingContext } from './reward-hacking-detector.js';

export interface RiskAssessment {
  riskLevel: RiskLevel;
  reasoning: string;
  requiresApproval: boolean;
  contextFactors: string[];
  deceptiveComplianceAssessment?: DeceptiveComplianceAssessment;
  rewardHackingAssessment?: RewardHackingAssessment;
}

export class CARSEngine {
  private deceptiveComplianceDetector = new DeceptiveComplianceDetector();
  private rewardHackingDetector = new RewardHackingDetector();
  
  async assess(
    request: ToolCallRequest,
    context?: CARSContext,
    deceptiveContext?: DeceptiveComplianceContext,
    rewardHackingContext?: RewardHackingContext,
    codeToAnalyze?: string
  ): Promise<RiskAssessment> {
    let riskLevel = getToolRisk(request.tool.name);
    const contextFactors: string[] = [];
    
    // 1. Base context-aware escalation
    if (context) {
      if (context.environment === 'production') {
        riskLevel = this.escalateRisk(riskLevel);
        contextFactors.push('Production environment (+1 risk level)');
      }
    }
    
    // 2. DECEPTIVE_COMPLIANCE check (Jan 2025)
    let deceptiveComplianceAssessment;
    if (deceptiveContext) {
      deceptiveComplianceAssessment = this.deceptiveComplianceDetector.detect(deceptiveContext);
      if (deceptiveComplianceAssessment.riskModifier > 0) {
        riskLevel = this.escalateRiskBy(riskLevel, deceptiveComplianceAssessment.riskModifier);
        contextFactors.push(
          `Deceptive compliance: ${deceptiveComplianceAssessment.indicators.join(', ')} (+${deceptiveComplianceAssessment.riskModifier} levels)`
        );
      }
    }
    
    // 3. REWARD_HACKING_INDUCED check (Jan 2025)
    let rewardHackingAssessment;
    if (codeToAnalyze) {
      rewardHackingAssessment = this.rewardHackingDetector.analyzeCode(codeToAnalyze, rewardHackingContext);
      if (rewardHackingAssessment.riskModifier > 0) {
        riskLevel = this.escalateRiskBy(riskLevel, rewardHackingAssessment.riskModifier);
        contextFactors.push(
          `Reward hacking patterns: ${rewardHackingAssessment.patterns.map(p => p.pattern).join(', ')} (+${rewardHackingAssessment.riskModifier} levels)`
        );
      }
    }
    
    return {
      riskLevel,
      reasoning: this.explainRisk(request.tool.name, riskLevel, contextFactors),
      requiresApproval: riskLevel >= RiskLevel.MEDIUM,
      contextFactors,
      deceptiveComplianceAssessment,
      rewardHackingAssessment,
    };
  }
  
  private escalateRisk(current: RiskLevel): RiskLevel {
    return Math.min(current + 1, RiskLevel.CRITICAL) as RiskLevel;
  }
  
  private escalateRiskBy(current: RiskLevel, amount: number): RiskLevel {
    return Math.min(current + Math.ceil(amount), RiskLevel.CRITICAL) as RiskLevel;
  }
  
  private explainRisk(toolName: string, riskLevel: RiskLevel, factors: string[]): string {
    const base = `Tool ${toolName} assessed at ${RiskLevel[riskLevel]} risk.`;
    if (factors.length === 0) return base;
    return `${base} Factors: ${factors.join('; ')}`;
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:cars-integration
```

---

## Phase 3: Human Approval Engine (US-3.5.3)

### Task 3.5.3.1: Define approval database schema

**Time:** 10 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/src/approval/schema.ts`
- `packages/mcp-gateway/src/approval/types.ts`

**Acceptance Criteria:**
- [ ] ApprovalRequest interface defined
- [ ] ApprovalDecision interface defined
- [ ] Prisma schema for persistence
- [ ] Index on pendingApprovals(userId, status)

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:approval-schema
```

---

### Task 3.5.3.2: Implement approval engine core

**Time:** 15 minutes  
**Tokens:** ~4K  

**Files to CREATE:**
- `packages/mcp-gateway/src/approval/approval-engine.ts`
- `packages/mcp-gateway/tests/unit/approval-engine.test.ts`

**Acceptance Criteria:**
- [ ] ApprovalEngine class implements requestApproval method
- [ ] Approval request stored with unique ID
- [ ] Notification hook for pending approvals
- [ ] Tests cover request creation and retrieval

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:approval-engine
```

---

### Task 3.5.3.3: Implement approval API endpoints

**Time:** 10 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/src/approval/approval-api.ts`

**Acceptance Criteria:**
- [ ] POST /approvals - Create approval request
- [ ] GET /approvals/:id - Get approval status
- [ ] POST /approvals/:id/approve - Approve request
- [ ] POST /approvals/:id/reject - Reject request

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:approval-api
```

---

### Task 3.5.3.4: Integrate approval engine with gateway

**Time:** 10 minutes  
**Tokens:** ~3K  

**Files to MODIFY:**
- `packages/mcp-gateway/src/core/gateway.ts`

**Acceptance Criteria:**
- [ ] HIGH and CRITICAL risk operations blocked until approved
- [ ] LOW and MEDIUM operations execute immediately
- [ ] Approval timeout configurable (default 5 minutes)

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:gateway-approval-integration
```

---

## Phase 4: Tool Integrity Monitoring (US-3.5.4)

### Task 3.5.4.1: Implement tool fingerprinting

**Time:** 10 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/src/monitoring/tool-fingerprint.ts`

**Acceptance Criteria:**
- [ ] SHA-256 hash of tool schema
- [ ] Version tracking
- [ ] Fingerprint storage

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:tool-fingerprint
```

---

### Task 3.5.4.2: Implement tool registry

**Time:** 10 minutes  
**Tokens:** ~3K  

**Files to CREATE:**
- `packages/mcp-gateway/src/monitoring/tool-registry.ts`

**Acceptance Criteria:**
- [ ] Register tool with fingerprint
- [ ] Lookup tool by name
- [ ] Version history

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:tool-registry
```

---

### Task 3.5.4.3: Implement integrity monitor with alerting

**Time:** 15 minutes  
**Tokens:** ~4K  

**Files to CREATE:**
- `packages/mcp-gateway/src/monitoring/tool-integrity.ts`
- `packages/mcp-gateway/tests/unit/tool-integrity.test.ts`

**Acceptance Criteria:**
- [ ] Compare current fingerprint to registered
- [ ] Alert on mismatch (tool poisoning detection)
- [ ] Block execution if fingerprint changed
- [ ] Tests verify detection of modified tools

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:tool-integrity
```

---

## Completion Checklist

- [ ] **Phase 1**: Gateway Core Infrastructure (4 tasks) ✅
- [ ] **Phase 2**: CARS Risk Assessment (6 tasks, +2 new) ✅
- [ ] **Phase 3**: Human Approval Engine (4 tasks) ✅
- [ ] **Phase 4**: Tool Integrity Monitoring (3 tasks) ✅
- [ ] All tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] DECEPTIVE_COMPLIANCE detection verified
- [ ] REWARD_HACKING_INDUCED detection verified
- [ ] Documentation complete

---

## Handoff to Epic 3.6

**Epic 3.6 Security Controls will use**:
- CARS risk assessment from Task 3.5.2.1-3.5.2.6
- Human approval engine from Task 3.5.3.1-3.5.3.4
- Tool integrity monitoring from Task 3.5.4.1-3.5.4.3
- **NEW**: Deceptive compliance detection for OAuth security
- **NEW**: Reward hacking patterns for injection prevention

**Epic 3.6 will add**:
- OAuth 2.1 with PKCE
- Tenant isolation
- Input sanitization
- Real-time security alerting
