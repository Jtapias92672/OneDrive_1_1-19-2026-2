# FORGE Skill Integration Guide

## Overview: Three Skills, One Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FORGE AGENT LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SESSION START                                                         │
│        │                                                                │
│        ▼                                                                │
│   ┌─────────────────────────────────────────┐                          │
│   │  1. TOKEN BUDGET GOVERNANCE             │  ◄── Select profile      │
│   │     - Determine task complexity         │      based on task       │
│   │     - Set thinking token limit          │                          │
│   │     - Check for compliance keywords     │                          │
│   └─────────────────┬───────────────────────┘                          │
│                     │                                                   │
│                     ▼                                                   │
│   ┌─────────────────────────────────────────┐                          │
│   │  2. CONTEXT POSITIONING PROTOCOL        │  ◄── Assemble prompt    │
│   │     - Contract → PRIMACY zone (15%)     │      with zone awareness │
│   │     - History → MIDDLE zone (70%)       │                          │
│   │     - Current task → RECENCY zone (15%) │                          │
│   └─────────────────┬───────────────────────┘                          │
│                     │                                                   │
│                     ▼                                                   │
│   ┌─────────────────────────────────────────┐                          │
│   │  EXECUTE ITERATION                      │                          │
│   │     - Run with allocated tokens         │                          │
│   │     - Generate output                   │                          │
│   │     - Validate against contract         │                          │
│   └─────────────────┬───────────────────────┘                          │
│                     │                                                   │
│                     ▼                                                   │
│   ┌─────────────────────────────────────────┐                          │
│   │  3. STRUCTURED HANDOFF PROTOCOL         │  ◄── Check triggers     │
│   │     - Monitor context fill %            │      after each turn     │
│   │     - Detect context rot signals        │                          │
│   │     - Generate DTA handoff if needed    │                          │
│   └─────────────────┬───────────────────────┘                          │
│                     │                                                   │
│          ┌─────────┴─────────┐                                         │
│          ▼                   ▼                                         │
│     [Continue]          [Handoff]                                      │
│          │                   │                                         │
│          │                   ▼                                         │
│          │            NEW SESSION                                      │
│          │            (Bootstrap from                                  │
│          │             handoff document)                               │
│          │                   │                                         │
│          └─────────┬─────────┘                                         │
│                    ▼                                                   │
│              [Converged?]───────▶ COMPLETE                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Epic Modification Matrix

| Epic | Package | Skill Integration | Priority |
|------|---------|-------------------|----------|
| **02** | answer-contract | Context Positioning (contract → PRIMACY) | HIGH |
| **2.5** | mcp-gateway | Token Budget (enforce at tool execution) | HIGH |
| **03** | forge-c | ALL THREE (main orchestrator) | **CRITICAL** |
| **04** | convergence-engine | ALL THREE (iteration loop) | **CRITICAL** |
| **05** | figma-parser | Token Budget (BALANCED profile) | MEDIUM |
| **06** | react-generator | Token Budget + Context Positioning | MEDIUM |
| **07** | mendix-integration | Token Budget (QUALITY_FIRST) | MEDIUM |
| **08** | evidence-packs | Handoff Protocol (capture for audit) | HIGH |
| **14.1** | validators | Token Budget (COMPLIANCE for Wolfram) | HIGH |

---

## Epic 02: Answer Contract Modifications

### Current State
Contracts are defined but not position-aware.

### Required Changes

```typescript
// packages/answer-contract/src/contract-loader.ts

import { ContextZone } from '@forge/context-positioning-protocol';

interface PositionedContract {
  contract: AnswerContract;
  zone: ContextZone;
  tokenEstimate: number;
}

/**
 * Load contract with positioning metadata
 * Contracts ALWAYS go in PRIMACY zone
 */
export function loadContractForPrompt(
  contractId: string
): PositionedContract {
  const contract = loadContract(contractId);
  
  return {
    contract,
    zone: 'PRIMACY',  // NEVER middle, NEVER recency
    tokenEstimate: estimateContractTokens(contract)
  };
}

/**
 * Format contract for PRIMACY zone insertion
 */
export function formatContractAsPrimacy(contract: AnswerContract): string {
  return `
## ANSWER CONTRACT (IMMUTABLE)
**ID:** ${contract.id}
**Version:** ${contract.version}
**Schema Hash:** ${hashSchema(contract.schema).slice(0, 8)}

### Required Sections
${contract.schema.sections.map(s => `- ${s.id}: ${s.type} (${s.required ? 'required' : 'optional'})`).join('\n')}

### Validation Rules
${contract.schema.validationRules.map(r => `- ${r.id}: ${r.type}`).join('\n')}

**This contract definition is IMMUTABLE for this session.**
`.trim();
}
```

### New Export

```typescript
// packages/answer-contract/src/index.ts

export { loadContractForPrompt, formatContractAsPrimacy } from './contract-loader';
export { PositionedContract } from './types';
```

---

## Epic 2.5: MCP Gateway Modifications

### Current State
Tools execute without token budget awareness.

### Required Changes

```typescript
// packages/mcp-gateway/src/middleware/token-budget.ts

import { TokenBudgetConfig, TokenProfile } from '@forge/token-budget-governance';

interface BudgetEnforcedRequest {
  tool: string;
  input: unknown;
  profile: TokenProfile;
  thinkingTokens: number;
  totalCeiling: number;
}

/**
 * Middleware: Enforce token budget before tool execution
 */
export function tokenBudgetMiddleware(
  config: TokenBudgetConfig
) {
  return async (request: McpRequest, next: NextFunction) => {
    // 1. Determine profile from request or auto-detect
    const profile = detectProfile(request, config);
    
    // 2. Get budget limits
    const limits = config.profiles[profile];
    
    // 3. Check for compliance keywords → auto-escalate
    if (containsComplianceKeywords(request)) {
      const escalatedProfile = 'COMPLIANCE';
      const escalatedLimits = config.profiles[escalatedProfile];
      
      console.log(`⚠️ Compliance keywords detected, escalating to ${escalatedProfile}`);
      
      request.budgetEnforced = {
        tool: request.tool,
        input: request.input,
        profile: escalatedProfile,
        thinkingTokens: escalatedLimits.thinkingTokens,
        totalCeiling: escalatedLimits.totalTaskCeiling
      };
    } else {
      request.budgetEnforced = {
        tool: request.tool,
        input: request.input,
        profile,
        thinkingTokens: limits.thinkingTokens,
        totalCeiling: limits.totalTaskCeiling
      };
    }
    
    // 4. Enforce minimum floor
    if (request.budgetEnforced.thinkingTokens < config.minimumThinkingTokens) {
      request.budgetEnforced.thinkingTokens = config.minimumThinkingTokens;
    }
    
    // 5. Log for audit
    await auditLog({
      type: 'TOKEN_BUDGET_APPLIED',
      profile: request.budgetEnforced.profile,
      thinkingTokens: request.budgetEnforced.thinkingTokens,
      tool: request.tool
    });
    
    return next(request);
  };
}

const COMPLIANCE_KEYWORDS = [
  'CMMC', 'DCMA', 'DFARS', 'classified', 'audit', 
  'security review', 'FedRAMP', 'NIST', 'CUI'
];

function containsComplianceKeywords(request: McpRequest): boolean {
  const content = JSON.stringify(request.input).toLowerCase();
  return COMPLIANCE_KEYWORDS.some(kw => content.includes(kw.toLowerCase()));
}
```

### Gateway Registration

```typescript
// packages/mcp-gateway/src/gateway.ts

import { tokenBudgetMiddleware } from './middleware/token-budget';
import { TOKEN_BUDGET_CONFIG } from '@forge/token-budget-governance';

export function createGateway(options: GatewayOptions): Gateway {
  const gateway = new Gateway(options);
  
  // Register token budget middleware FIRST
  gateway.use(tokenBudgetMiddleware(TOKEN_BUDGET_CONFIG));
  
  // ... other middleware
  
  return gateway;
}
```

---

## Epic 03: FORGE-C Core Modifications (CRITICAL)

### Current State
Main orchestrator without skill integration.

### Required Changes

```typescript
// packages/forge-c/src/orchestrator.ts

import { TokenBudgetConfig, selectProfile } from '@forge/token-budget-governance';
import { assembleZonedPrompt, ContextZones } from '@forge/context-positioning-protocol';
import { 
  HandoffManager, 
  checkHandoffTriggers, 
  generateHandoff,
  bootstrapFromHandoff 
} from '@forge/structured-handoff-protocol';

interface ForgeSession {
  id: string;
  contract: AnswerContract;
  tokenProfile: TokenProfile;
  contextZones: ContextZones;
  handoffManager: HandoffManager;
  currentIteration: number;
  converged: boolean;
}

/**
 * Main FORGE orchestration with all three skills
 */
export class ForgeOrchestrator {
  private config: ForgeConfig;
  private tokenBudget: TokenBudgetConfig;
  
  constructor(config: ForgeConfig) {
    this.config = config;
    this.tokenBudget = config.tokenBudget;
  }
  
  /**
   * Initialize session with skill awareness
   */
  async createSession(input: ForgeInput): Promise<ForgeSession> {
    // SKILL 1: Token Budget - Select profile
    const profile = selectProfile(input, this.tokenBudget);
    
    console.log(`📊 Token Profile: ${profile} (${this.tokenBudget.profiles[profile].thinkingTokens} thinking tokens)`);
    
    // SKILL 2: Context Positioning - Setup zones
    const contextZones: ContextZones = {
      primacy: {
        content: [],
        maxTokens: Math.floor(this.config.maxContextTokens * 0.15)
      },
      middle: {
        content: [],
        maxTokens: Math.floor(this.config.maxContextTokens * 0.70)
      },
      recency: {
        content: [],
        maxTokens: Math.floor(this.config.maxContextTokens * 0.15)
      }
    };
    
    // Load contract into PRIMACY zone
    const positionedContract = loadContractForPrompt(input.contractId);
    contextZones.primacy.content.push(formatContractAsPrimacy(positionedContract.contract));
    
    // Add identity to PRIMACY
    contextZones.primacy.content.unshift(this.config.agentIdentity);
    
    // SKILL 3: Handoff Manager - Initialize
    const handoffManager = new HandoffManager({
      contextFillThreshold: 0.60,
      rotDetectionEnabled: true
    });
    
    return {
      id: generateSessionId(),
      contract: positionedContract.contract,
      tokenProfile: profile,
      contextZones,
      handoffManager,
      currentIteration: 0,
      converged: false
    };
  }
  
  /**
   * Run iteration with skill enforcement
   */
  async iterate(session: ForgeSession, task: ForgeTask): Promise<IterationResult> {
    // SKILL 3: Check handoff triggers BEFORE iteration
    const handoffNeeded = await checkHandoffTriggers(session, session.handoffManager);
    
    if (handoffNeeded) {
      console.log(`🔄 Handoff triggered at ${session.handoffManager.contextFill}% context fill`);
      
      // Generate handoff document
      const handoff = await generateHandoff(session);
      
      // Bootstrap new session
      session = await bootstrapFromHandoff(handoff);
      
      console.log(`✅ New session ${session.id} bootstrapped from handoff`);
    }
    
    // SKILL 2: Position task in RECENCY zone
    session.contextZones.recency.content = [
      formatTaskAsRecency(task)
    ];
    
    // SKILL 2: Assemble zoned prompt
    const prompt = assembleZonedPrompt(session.contextZones);
    
    // SKILL 1: Execute with token budget
    const result = await this.execute(prompt, {
      maxThinkingTokens: this.tokenBudget.profiles[session.tokenProfile].thinkingTokens,
      maxTotalTokens: this.tokenBudget.profiles[session.tokenProfile].totalTaskCeiling
    });
    
    // Update middle zone with history (expendable)
    session.contextZones.middle.content.push(
      formatIterationForMiddle(result)
    );
    
    // Trim middle if exceeding budget
    trimMiddleZone(session.contextZones);
    
    // SKILL 3: Update handoff manager state
    session.handoffManager.recordIteration(result);
    
    session.currentIteration++;
    
    return result;
  }
  
  /**
   * Run full convergence loop
   */
  async runConvergence(input: ForgeInput): Promise<ConvergenceResult> {
    let session = await this.createSession(input);
    
    while (!session.converged && session.currentIteration < input.maxIterations) {
      const task = generateTaskFromContract(session.contract, session.currentIteration);
      
      const result = await this.iterate(session, task);
      
      // Check convergence
      if (result.score >= input.convergenceThreshold) {
        session.converged = true;
      }
      
      // SKILL 3: Proactive summary every 5 iterations
      if (session.currentIteration % 5 === 0 && !session.converged) {
        const summary = await this.generateStateOfUnion(session);
        
        // Inject into PRIMACY (after contract)
        session.contextZones.primacy.content[2] = summary;
        
        console.log(`📋 State of Union (Iteration ${session.currentIteration}):`);
        console.log(summary);
      }
    }
    
    return {
      sessionId: session.id,
      iterations: session.currentIteration,
      converged: session.converged,
      finalOutput: session.currentOutput,
      handoffCount: session.handoffManager.handoffCount
    };
  }
}
```

### Skill Loader (Session Bootstrap)

```typescript
// packages/forge-c/src/skill-loader.ts

/**
 * Load and validate skills at session start
 * This runs BEFORE any agent work begins
 */
export async function loadForgeSkills(): Promise<SkillManifest> {
  const skills = {
    tokenBudget: await loadSkill('token-budget-governance'),
    contextPositioning: await loadSkill('context-positioning-protocol'),
    structuredHandoff: await loadSkill('structured-handoff-protocol')
  };
  
  // Validate all required skills present
  const missing = Object.entries(skills)
    .filter(([_, skill]) => !skill)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    throw new Error(`Missing required skills: ${missing.join(', ')}`);
  }
  
  console.log('✅ FORGE Skills Loaded:');
  console.log('   - token-budget-governance');
  console.log('   - context-positioning-protocol');
  console.log('   - structured-handoff-protocol');
  
  return {
    skills,
    loadedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}
```

---

## Epic 04: Convergence Engine Modifications (CRITICAL)

### Current State
Iterative refinement without context management.

### Required Changes

```typescript
// packages/convergence-engine/src/convergence-session.ts

import { ContextMonitor, detectContextRot } from '@forge/context-positioning-protocol';
import { HandoffTrigger, DTA_TEMPLATE } from '@forge/structured-handoff-protocol';
import { TokenProfile, PROFILE_LIMITS } from '@forge/token-budget-governance';

export class ConvergenceSession {
  private contextMonitor: ContextMonitor;
  private tokenProfile: TokenProfile;
  private handoffHistory: HandoffDocument[] = [];
  
  constructor(config: ConvergenceConfig) {
    // Initialize context monitor
    this.contextMonitor = new ContextMonitor({
      maxTokens: config.maxContextTokens,
      warnThreshold: 0.40,
      triggerThreshold: 0.60
    });
    
    // Set token profile based on contract type
    this.tokenProfile = this.determineProfile(config);
  }
  
  private determineProfile(config: ConvergenceConfig): TokenProfile {
    // Check for compliance requirements
    if (config.contract.tags?.some(t => 
      ['CMMC', 'DCMA', 'DFARS'].includes(t)
    )) {
      return 'COMPLIANCE';
    }
    
    // Check complexity
    if (config.contract.schema.sections.length > 10) {
      return 'QUALITY_FIRST';
    }
    
    return 'BALANCED';
  }
  
  /**
   * Run single iteration with skill enforcement
   */
  async runIteration(): Promise<IterationResult> {
    // 1. Check context state
    const contextState = this.contextMonitor.check();
    
    if (contextState.zone === 'RED') {
      return this.executeHandoff();
    }
    
    // 2. Check for context rot (even if below 60%)
    const rotIndicators = detectContextRot(this.getHistory());
    
    if (rotIndicators.detected) {
      console.warn('🚨 Context rot detected:', rotIndicators);
      return this.executeHandoff();
    }
    
    // 3. Get token limits for this profile
    const limits = PROFILE_LIMITS[this.tokenProfile];
    
    // 4. Execute iteration with limits
    const result = await this.executeWithBudget(limits);
    
    // 5. Update context monitor
    this.contextMonitor.recordTokens(result.tokensUsed);
    
    return result;
  }
  
  /**
   * Execute handoff and continue in new session
   */
  private async executeHandoff(): Promise<IterationResult> {
    // Generate DTA document
    const handoff = this.generateDTA();
    
    // Store for audit
    this.handoffHistory.push(handoff);
    
    // Log handoff
    console.log(`📤 Handoff generated at iteration ${this.currentIteration}`);
    console.log(`   Context fill: ${this.contextMonitor.fillPercentage.toFixed(1)}%`);
    console.log(`   Reason: ${handoff.reason}`);
    
    // Reset context (simulate new session)
    this.contextMonitor.reset();
    
    // Bootstrap from handoff
    await this.bootstrapFromHandoff(handoff);
    
    // Continue iteration
    return this.runIteration();
  }
  
  /**
   * Generate Decisions-Todos-Ask document
   */
  private generateDTA(): HandoffDocument {
    return {
      sessionId: this.id,
      timestamp: new Date().toISOString(),
      contextFill: this.contextMonitor.fillPercentage,
      reason: this.contextMonitor.zone === 'RED' ? 'sixty_percent' : 'context_rot',
      
      decisions: this.extractDecisions(),
      currentState: {
        contract: {
          id: this.contract.id,
          version: this.contract.version,
          schemaHash: this.contractHash
        },
        progress: {
          iteration: this.currentIteration,
          score: this.currentScore,
          convergenceThreshold: this.config.threshold
        }
      },
      todos: this.extractRemainingTasks(),
      theAsk: {
        objective: `Continue convergence from iteration ${this.currentIteration}`,
        acceptanceCriteria: [
          `Achieve score >= ${this.config.threshold}`,
          'All contract sections validated',
          'Evidence pack generated'
        ],
        tokenProfile: this.tokenProfile
      },
      criticalFacts: this.extractCriticalFacts(),
      filesToReload: this.loadedFiles
    };
  }
}
```

---

## Epic 08: Evidence Packs Modifications

### Current State
Evidence packs don't capture skill usage.

### Required Changes

```typescript
// packages/evidence-packs/src/collectors/skill-evidence.ts

/**
 * Collect evidence of skill application for audit
 */
export function collectSkillEvidence(session: ForgeSession): SkillEvidence {
  return {
    tokenBudget: {
      profile: session.tokenProfile,
      thinkingTokens: session.tokensUsed.thinking,
      totalTokens: session.tokensUsed.total,
      autoEscalations: session.autoEscalationLog
    },
    
    contextPositioning: {
      primacyTokens: session.contextZones.primacy.tokenCount,
      middleTokens: session.contextZones.middle.tokenCount,
      recencyTokens: session.contextZones.recency.tokenCount,
      contractInPrimacy: true,  // Verify this
      taskInRecency: true       // Verify this
    },
    
    handoffs: session.handoffHistory.map(h => ({
      timestamp: h.timestamp,
      contextFillAtHandoff: h.contextFill,
      reason: h.reason,
      decisionsPreserved: h.decisions.length,
      criticalFactsPreserved: h.criticalFacts.length
    }))
  };
}

/**
 * Add skill evidence to evidence pack
 */
export function enrichWithSkillEvidence(
  pack: EvidencePack, 
  session: ForgeSession
): EvidencePack {
  const skillEvidence = collectSkillEvidence(session);
  
  pack.artifacts.push({
    id: `skill-evidence-${Date.now()}`,
    type: 'skill_application',
    content: skillEvidence,
    timestamp: new Date().toISOString()
  });
  
  // Add handoff documents as artifacts (for compliance audit)
  for (const handoff of session.handoffHistory) {
    pack.artifacts.push({
      id: `handoff-${handoff.timestamp}`,
      type: 'handoff_document',
      content: handoff,
      timestamp: handoff.timestamp
    });
  }
  
  return pack;
}
```

---

## Epic 14.1: Validators Modifications

### Current State
Wolfram validation without token budget awareness.

### Required Changes

```typescript
// packages/validators/src/wolfram-validator.ts

import { TokenProfile } from '@forge/token-budget-governance';

// Wolfram validation ALWAYS uses COMPLIANCE profile
const WOLFRAM_TOKEN_PROFILE: TokenProfile = 'COMPLIANCE';

export class WolframValidator {
  private tokenBudget = PROFILE_LIMITS[WOLFRAM_TOKEN_PROFILE];
  
  async validate(expressions: ValidationExpression[]): Promise<ValidationResult> {
    console.log(`🔬 Wolfram validation with ${WOLFRAM_TOKEN_PROFILE} profile`);
    console.log(`   Thinking tokens: ${this.tokenBudget.thinkingTokens}`);
    
    // ... validation logic with enforced budget
  }
}
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
```
1. Epic 03 (forge-c) - Skill loader + orchestrator
2. Epic 2.5 (mcp-gateway) - Token budget middleware
```

### Phase 2: Core Loop (Week 2)
```
3. Epic 04 (convergence-engine) - Full skill integration
4. Epic 02 (answer-contract) - Position-aware contracts
```

### Phase 3: Support Systems (Week 3)
```
5. Epic 08 (evidence-packs) - Skill evidence collection
6. Epic 14.1 (validators) - COMPLIANCE profile enforcement
```

### Phase 4: Pipeline (Week 4)
```
7. Epic 05, 06, 07 - Token budget for parsing/generation
8. Integration testing
```

---

## Skill Loading Protocol

### At Agent Startup (MANDATORY)

```typescript
// This MUST run before any FORGE agent work begins

async function initializeForgeAgent(): Promise<ForgeAgent> {
  console.log('🚀 FORGE Agent Initialization');
  console.log('================================');
  
  // 1. Load skills (fail fast if missing)
  const skills = await loadForgeSkills();
  console.log('✅ Skills loaded');
  
  // 2. Initialize token budget config
  const tokenBudget = initializeTokenBudget(skills.tokenBudget);
  console.log(`✅ Token budget initialized (default: ${tokenBudget.defaultProfile})`);
  
  // 3. Initialize context positioning
  const contextPositioning = initializeContextPositioning(skills.contextPositioning);
  console.log('✅ Context positioning initialized');
  
  // 4. Initialize handoff manager
  const handoffManager = initializeHandoffManager(skills.structuredHandoff);
  console.log('✅ Handoff manager initialized');
  
  // 5. Verify configuration
  validateSkillIntegration({ tokenBudget, contextPositioning, handoffManager });
  console.log('✅ Skill integration validated');
  
  console.log('================================');
  console.log('🎯 FORGE Agent Ready');
  
  return new ForgeAgent({
    skills,
    tokenBudget,
    contextPositioning,
    handoffManager
  });
}
```

### Skill Enforcement Points

| Point | Skill | Action |
|-------|-------|--------|
| Session start | All three | Load and validate |
| Prompt assembly | Context Positioning | Zone-aware assembly |
| Before execution | Token Budget | Set limits |
| After each turn | Handoff Protocol | Check triggers |
| Every 5 iterations | Handoff Protocol | Proactive summary |
| At 60% fill | Handoff Protocol | Generate DTA |
| At context rot | Handoff Protocol | Force handoff |
| Session end | Evidence Packs | Capture skill evidence |

---

## Verification Checklist

### Epic 03 (forge-c) - CRITICAL
- [ ] Skill loader implemented
- [ ] All three skills loaded at startup
- [ ] Token profile selection working
- [ ] Context zones initialized
- [ ] Handoff triggers checked per iteration
- [ ] Proactive summaries at 5-iteration intervals

### Epic 04 (convergence-engine) - CRITICAL
- [ ] Context monitor integrated
- [ ] Context rot detection implemented
- [ ] DTA document generation working
- [ ] Handoff bootstrap working
- [ ] Token limits enforced per iteration

### Epic 2.5 (mcp-gateway)
- [ ] Token budget middleware registered
- [ ] Compliance keyword detection working
- [ ] Auto-escalation logging

### Epic 02 (answer-contract)
- [ ] Position-aware contract loader
- [ ] Contract formatted for PRIMACY zone

### Epic 08 (evidence-packs)
- [ ] Skill evidence collector implemented
- [ ] Handoff documents captured for audit

### Epic 14.1 (validators)
- [ ] COMPLIANCE profile enforced for Wolfram

---

## Testing the Integration

```bash
# Test skill loading
pnpm --filter @forge/forge-c test:skills

# Test token budget enforcement
pnpm --filter @forge/mcp-gateway test:token-budget

# Test context positioning
pnpm --filter @forge/forge-c test:context-zones

# Test handoff triggers
pnpm --filter @forge/convergence-engine test:handoff

# Integration test: Full convergence loop with skills
pnpm --filter @forge/forge-c test:integration:skills
```
