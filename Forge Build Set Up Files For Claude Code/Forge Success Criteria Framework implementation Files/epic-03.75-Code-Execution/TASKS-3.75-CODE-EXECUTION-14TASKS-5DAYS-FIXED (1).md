# Epic 3.75: Code Execution - Atomic Task Breakdown (FIXED)

**Token Budget:** 20K (LIMIT: 20K) ✅ NEW SECURITY EPIC  
**Tasks:** 14 (was 10 - CORRECTED to match FORGE-SEGMENTATION-ANALYSIS.md)  
**Estimated Time:** 5 days (was 3 - CORRECTED to match FORGE-SEGMENTATION-ANALYSIS.md)  
**Dependencies:** Epic 3.7 (Compliance Validation)

---

## CHANGELOG (Jan 2025)

| Change | Reason | Source |
|--------|--------|--------|
| Tasks: 10 → 14 | Header mismatch with filename and segmentation analysis | FORGE-SEGMENTATION-ANALYSIS.md |
| Time: 3 → 5 days | Header mismatch with filename and segmentation analysis | FORGE-SEGMENTATION-ANALYSIS.md |
| Dependencies: Epic 3 → Epic 3.7 | Epic 3.75 follows 3.7, not Epic 3 | Dependency chain verification |

---

## Skills Integration (P2 Requirements)

### Required Skills for Epic 3.75
| Component | Required Skills | Reference |
|-----------|-----------------|-----------|
| Code Execution | `mcp-code-first-pattern` (98% reduction), `long-running-agent-harness` | /mnt/skills/user/ |
| Security | `cars-framework`, `verification-pillars` | NewSkills_Library.zip |

### Extended Thinking Trigger (MANDATORY)
```
⚠️ QUALITY_FIRST PROFILE REQUIRED
Epic 3.75 is INTEGRATION-CRITICAL (cross-system integration scope)

All prompts for this epic MUST use: "THINK HARDER"
Token budget: 8,000 thinking tokens (QUALITY_FIRST profile)
Keywords present: code execution, sandbox, Deno, MCP
```

### Context Positioning Protocol (MANDATORY)
```
PRIMACY ZONE (First 15%):
- MCP code-first pattern specifications
- 98% token reduction target
- Deno sandbox security requirements

MIDDLE ZONE (15-85%):
- Previous task outputs from Epics 3.5-3.7
- Supporting documentation
- Code context from CARS framework

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
- After Phase 3.75.1 (Sandbox Infrastructure complete)
- After Phase 3.75.2 (Privacy & Audit complete)
- After Phase 3.75.3 (CARS Integration complete)
```

### MCP Code-First Pattern (CRITICAL)
```
This epic implements the code-first pattern for 98% token reduction:

1. On-demand tool discovery (not upfront loading)
2. Pre-context filtering (filter BEFORE model sees data)
3. Single-step complex logic (reduce round-trips)
4. Connection pooling (warm connections)

Target: 150K tokens → 2K tokens per MCP operation
```

---

## Success Criteria Alignment

| Component | Reference | Alignment |
|-----------|-----------|-----------|
| **09_DATA_PROTECTION** | `forge-success-criteria/09_DATA_PROTECTION.md` | PII/secret patterns, classification levels |
| **05_CONVERGENCE_ENGINE** | `forge-success-criteria/05_CONVERGENCE_ENGINE.md` | Budget enforcement, timeout protection |
| **06_EVIDENCE_PACK** | `forge-success-criteria/06_EVIDENCE_PACK.md` | Audit logging schema |
| **12_HUMAN_REVIEW** | `forge-success-criteria/12_HUMAN_REVIEW.md` | Approval gates for high-risk execution |

**Acceptance Tests:** Inherit from 09_DATA_PROTECTION criteria DP-01 through DP-10

---

## Overview

Epic 3.75 implements secure code execution infrastructure including sandboxing, virtual filesystem, privacy filtering, audit logging, and CARS framework integration for risk assessment.

---

## Phase 3.75.1: Sandbox Infrastructure

### Task 3.75.1.1: Create code-execution package and types

**Time:** 5 minutes | **Tokens:** ~2K

**Success Criteria Reference:** 09_DATA_PROTECTION § Input Schema

**Files to CREATE:**
- `packages/forge-c/src/execution/types.ts`
- `packages/forge-c/src/execution/index.ts`

**Purpose:** Define types for secure code execution aligned with Data Protection layer.

**Implementation:**

```typescript
// packages/forge-c/src/execution/types.ts
// ALIGNED WITH: forge-success-criteria/09_DATA_PROTECTION.md § Input Schema

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  memoryUsed?: number;
  // FROM 09_DATA_PROTECTION: Include detection results
  privacyDetections?: PrivacyDetection[];
}

export interface PrivacyDetection {
  type: 'pii' | 'secret';
  category: string;  // email, phone, ssn, api_key, etc.
  token: string;     // e.g., "[REDACTED_EMAIL_1]"
  location: { start: number; end: number };
}

export interface ExecutionOptions {
  timeout?: number;
  maxMemory?: number;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
  workingDirectory?: string;
  // FROM 09_DATA_PROTECTION: Data classification
  classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

export interface Sandbox {
  name: string;
  execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;
  dispose(): Promise<void>;
}

export type SandboxType = 'deno' | 'vm' | 'docker';
```

```typescript
// packages/forge-c/src/execution/index.ts
export * from './types.js';
```

**Done When:** Types compile and align with 09_DATA_PROTECTION schema

---

### Task 3.75.1.2: Implement Node.js VM sandbox

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 09_DATA_PROTECTION § DP-07 (redaction <50ms)

**Files to CREATE:**
- `packages/forge-c/src/execution/vm-sandbox.ts`

**Purpose:** Implement secure code execution using Node.js VM module.

**Implementation:**

```typescript
// packages/forge-c/src/execution/vm-sandbox.ts
import { createContext, runInContext, Script } from 'vm';
import { Sandbox, ExecutionResult, ExecutionOptions } from './types.js';

export class VMSandbox implements Sandbox {
  name = 'vm';
  private output: string[] = [];

  async execute(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    // FROM 05_CONVERGENCE_ENGINE: Default timeout enforcement
    const timeout = options.timeout ?? 5000;

    // FROM 09_DATA_PROTECTION: Block RESTRICTED classification
    if (options.classification === 'RESTRICTED') {
      return {
        success: false,
        output: '',
        error: 'RESTRICTED classification cannot be processed by execution engine',
        duration: 0,
      };
    }

    try {
      const context = createContext({
        console: {
          log: (...args: unknown[]) => this.output.push(args.map(String).join(' ')),
          error: (...args: unknown[]) => this.output.push(`[ERROR] ${args.map(String).join(' ')}`),
        },
        // Security: Remove dangerous globals
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        fetch: undefined,
        require: undefined,
        process: undefined,
        __dirname: undefined,
        __filename: undefined,
      });

      const script = new Script(code, { filename: 'sandbox.js' });
      const result = script.runInContext(context, { timeout });

      return {
        success: true,
        output: this.output.join('\n') || String(result),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  async dispose(): Promise<void> {
    this.output = [];
  }
}
```

**Done When:** VM sandbox executes code with timeout, respects classification

---

### Task 3.75.1.3: Create sandbox factory

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/execution/factory.ts`

**Purpose:** Factory for creating appropriate sandbox instances.

**Implementation:**

```typescript
// packages/forge-c/src/execution/factory.ts
import { Sandbox, SandboxType } from './types.js';
import { VMSandbox } from './vm-sandbox.js';

export function createSandbox(type: SandboxType = 'vm'): Sandbox {
  switch (type) {
    case 'vm':
      return new VMSandbox();
    case 'deno':
      throw new Error('Deno sandbox not yet implemented');
    case 'docker':
      throw new Error('Docker sandbox not yet implemented');
    default:
      throw new Error(`Unknown sandbox type: ${type}`);
  }
}
```

**Done When:** Factory creates sandbox instances

---

## Phase 3.75.2: Filesystem & Privacy

### Task 3.75.2.1: Implement virtual filesystem

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 09_DATA_PROTECTION § DP-04 (tokenization round-trip)

**Files to CREATE:**
- `packages/forge-c/src/execution/virtual-fs.ts`

**Purpose:** Sandboxed filesystem that prevents access to host system.

**Implementation:**

```typescript
// packages/forge-c/src/execution/virtual-fs.ts
export interface VirtualFile {
  content: string;
  createdAt: Date;
  modifiedAt: Date;
  classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
}

export class VirtualFileSystem {
  private files = new Map<string, VirtualFile>();

  writeFile(path: string, content: string, classification?: VirtualFile['classification']): void {
    const now = new Date();
    const existing = this.files.get(path);
    this.files.set(path, {
      content,
      createdAt: existing?.createdAt ?? now,
      modifiedAt: now,
      classification: classification ?? existing?.classification ?? 'INTERNAL',
    });
  }

  readFile(path: string): string | undefined {
    return this.files.get(path)?.content;
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  delete(path: string): boolean {
    return this.files.delete(path);
  }

  list(prefix?: string): string[] {
    const paths = Array.from(this.files.keys());
    return prefix ? paths.filter(p => p.startsWith(prefix)) : paths;
  }

  clear(): void {
    this.files.clear();
  }

  getStats(path: string): { size: number; createdAt: Date; modifiedAt: Date; classification?: string } | undefined {
    const file = this.files.get(path);
    if (!file) return undefined;
    return {
      size: file.content.length,
      createdAt: file.createdAt,
      modifiedAt: file.modifiedAt,
      classification: file.classification,
    };
  }
}
```

**Done When:** Virtual filesystem provides isolation with classification tracking

---

### Task 3.75.2.2: Implement privacy filter

**Time:** 5 minutes | **Tokens:** ~2K

**Success Criteria Reference:** 09_DATA_PROTECTION § DP-01, DP-09, DP-10

**Files to CREATE:**
- `packages/forge-c/src/execution/privacy-filter.ts`

**Purpose:** Filter sensitive information from outputs. **MUST achieve ≥99% PII recall, 100% secret recall.**

**Implementation:**

```typescript
// packages/forge-c/src/execution/privacy-filter.ts
// ALIGNED WITH: forge-success-criteria/09_DATA_PROTECTION.md § Standard PII Patterns

export interface PrivacyRule {
  pattern: RegExp;
  replacement: string;
  category: string;
  type: 'pii' | 'secret';
}

// FROM 09_DATA_PROTECTION: Standard PII Patterns
const PII_PATTERNS: PrivacyRule[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]', category: 'email', type: 'pii' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[REDACTED_PHONE]', category: 'phone_us', type: 'pii' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]', category: 'ssn', type: 'pii' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED_CC]', category: 'credit_card', type: 'pii' },
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]', category: 'ip_address', type: 'pii' },
];

// FROM 09_DATA_PROTECTION: Secret Patterns (100% recall required)
const SECRET_PATTERNS: PrivacyRule[] = [
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[BLOCKED_AWS_KEY]', category: 'aws_access_key', type: 'secret' },
  { pattern: /[A-Za-z0-9/+=]{40}/g, replacement: '[BLOCKED_AWS_SECRET]', category: 'aws_secret_key', type: 'secret' },
  { pattern: /\b(?:sk-|pk-|api[_-]?key[=:]?\s*)[a-zA-Z0-9]{20,}\b/gi, replacement: '[BLOCKED_API_KEY]', category: 'generic_api_key', type: 'secret' },
  { pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: '[BLOCKED_JWT]', category: 'jwt_token', type: 'secret' },
  { pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g, replacement: '[BLOCKED_PRIVATE_KEY]', category: 'private_key', type: 'secret' },
];

export interface FilterResult {
  filtered: string;
  detections: Array<{ type: 'pii' | 'secret'; category: string; count: number }>;
  blocked: boolean;  // True if secrets found
}

export class PrivacyFilter {
  private rules: PrivacyRule[];

  constructor(additionalRules: PrivacyRule[] = []) {
    this.rules = [...PII_PATTERNS, ...SECRET_PATTERNS, ...additionalRules];
  }

  filter(text: string): FilterResult {
    let filtered = text;
    const detections: FilterResult['detections'] = [];
    let blocked = false;

    for (const rule of this.rules) {
      const matches = text.match(rule.pattern);
      if (matches && matches.length > 0) {
        filtered = filtered.replace(rule.pattern, rule.replacement);
        detections.push({ type: rule.type, category: rule.category, count: matches.length });
        
        // FROM 09_DATA_PROTECTION: Secrets block processing
        if (rule.type === 'secret') {
          blocked = true;
        }
      }
    }

    return { filtered, detections, blocked };
  }

  addRule(rule: PrivacyRule): void {
    this.rules.push(rule);
  }
}

export const privacyFilter = new PrivacyFilter();
```

**Done When:** Privacy filter redacts PII (≥99% recall) and blocks secrets (100% recall)

---

### Task 3.75.2.3: Implement audit logger

**Time:** 5 minutes | **Tokens:** ~2K

**Success Criteria Reference:** 06_EVIDENCE_PACK § Iteration Schema, 09_DATA_PROTECTION § DP-06

**Files to CREATE:**
- `packages/forge-c/src/execution/audit-logger.ts`

**Purpose:** Log all execution events for compliance auditing. **Aligned with Evidence Pack schema.**

**Implementation:**

```typescript
// packages/forge-c/src/execution/audit-logger.ts
// ALIGNED WITH: forge-success-criteria/06_EVIDENCE_PACK.md § Output Schema

import { createLogger } from '@forge/core';

// FROM 06_EVIDENCE_PACK: Audit event structure
export interface AuditEvent {
  timestamp: string;  // ISO8601 per Evidence Pack spec
  eventType: 'execution_start' | 'execution_end' | 'file_access' | 'network_access' | 'privacy_detection' | 'error';
  sessionId: string;
  details: Record<string, unknown>;
  // FROM 09_DATA_PROTECTION: Classification tracking
  classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

export class AuditLogger {
  private logger = createLogger('audit');
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = { 
      ...event, 
      timestamp: new Date().toISOString()  // ISO8601 format
    };
    this.events.push(fullEvent);
    
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.logger.info(`[AUDIT] ${event.eventType}`, { 
      sessionId: event.sessionId, 
      classification: event.classification,
      ...event.details 
    });
  }

  getEvents(sessionId?: string): AuditEvent[] {
    return sessionId 
      ? this.events.filter(e => e.sessionId === sessionId)
      : [...this.events];
  }

  // FROM 06_EVIDENCE_PACK: Export for evidence pack integration
  exportForEvidencePack(sessionId: string): AuditEvent[] {
    return this.getEvents(sessionId).map(event => ({
      ...event,
      // Ensure no PII in exported events
      details: this.sanitizeDetails(event.details),
    }));
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    // Hash any potentially sensitive values
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = `[TRUNCATED:${value.length}chars]`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  clear(): void {
    this.events = [];
  }
}

export const auditLogger = new AuditLogger();
```

**Done When:** Audit logger tracks events in Evidence Pack compatible format

---

## Phase 3.75.3: CARS Framework

### Task 3.75.3.1: Define CARS risk types

**Time:** 5 minutes | **Tokens:** ~2K

**Success Criteria Reference:** 09_DATA_PROTECTION § Classification Handling, 12_HUMAN_REVIEW § Trigger Conditions

**Files to CREATE:**
- `packages/forge-c/src/cars/types.ts`

**Purpose:** Define risk assessment types for CARS framework.

**Implementation:**

```typescript
// packages/forge-c/src/cars/types.ts
// ALIGNED WITH: forge-success-criteria/09_DATA_PROTECTION.md, 12_HUMAN_REVIEW.md

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// FROM 09_DATA_PROTECTION + alignment faking countermeasures
export type RiskType = 
  | 'CODE_EXECUTION'
  | 'FILE_SYSTEM_ACCESS'
  | 'NETWORK_ACCESS'
  | 'DATA_EXFILTRATION'
  | 'PRIVILEGE_ESCALATION'
  | 'DECEPTIVE_COMPLIANCE'      // Alignment faking detection
  | 'PII_EXPOSURE'              // FROM 09_DATA_PROTECTION
  | 'SECRET_EXPOSURE';          // FROM 09_DATA_PROTECTION

export interface RiskAssessment {
  level: RiskLevel;
  types: RiskType[];
  score: number;  // 0.0 - 1.0
  factors: string[];
  mitigations: string[];
  requiresApproval: boolean;  // FROM 12_HUMAN_REVIEW: Triggers human gate
  // FROM 09_DATA_PROTECTION: Data classification impact
  recommendedClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

export interface CARSConfig {
  autoApproveBelow: RiskLevel;
  maxAutonomousRisk: number;  // Score threshold for auto-approval
  enableDeceptionDetection: boolean;
  // FROM 12_HUMAN_REVIEW: Integration with approval gates
  humanReviewThreshold: number;  // Score above which human review required
}

export const DEFAULT_CARS_CONFIG: CARSConfig = {
  autoApproveBelow: 'low',
  maxAutonomousRisk: 0.3,
  enableDeceptionDetection: true,
  humanReviewThreshold: 0.5,  // FROM 12_HUMAN_REVIEW: HR-01 trigger
};
```

**Done When:** Risk types compile and include alignment faking detection

---

### Task 3.75.3.2: Implement risk assessor

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 09_DATA_PROTECTION § Secret Patterns, 12_HUMAN_REVIEW § HR-01, HR-02

**Files to CREATE:**
- `packages/forge-c/src/cars/assessor.ts`
- `packages/forge-c/src/cars/index.ts`

**Purpose:** Assess risk level of code execution requests.

**Implementation:**

```typescript
// packages/forge-c/src/cars/assessor.ts
// ALIGNED WITH: forge-success-criteria/09_DATA_PROTECTION.md, 12_HUMAN_REVIEW.md

import { RiskAssessment, RiskLevel, RiskType, CARSConfig, DEFAULT_CARS_CONFIG } from './types.js';

const RISK_PATTERNS: Array<{ pattern: RegExp; type: RiskType; score: number; mitigation: string }> = [
  // Code execution risks
  { pattern: /eval\s*\(/i, type: 'CODE_EXECUTION', score: 0.8, mitigation: 'Use VM sandbox' },
  { pattern: /exec\s*\(/i, type: 'CODE_EXECUTION', score: 0.9, mitigation: 'Use VM sandbox' },
  { pattern: /Function\s*\(/i, type: 'CODE_EXECUTION', score: 0.7, mitigation: 'Use VM sandbox' },
  
  // File system risks
  { pattern: /fs\.(write|unlink|rm|chmod)/i, type: 'FILE_SYSTEM_ACCESS', score: 0.6, mitigation: 'Use virtual filesystem' },
  { pattern: /require\s*\(\s*['"]fs['"]\s*\)/i, type: 'FILE_SYSTEM_ACCESS', score: 0.5, mitigation: 'Use virtual filesystem' },
  
  // Network risks
  { pattern: /fetch|http|request|axios/i, type: 'NETWORK_ACCESS', score: 0.5, mitigation: 'Block network in sandbox' },
  
  // Data exfiltration (FROM 09_DATA_PROTECTION)
  { pattern: /process\.env/i, type: 'DATA_EXFILTRATION', score: 0.7, mitigation: 'Filter environment variables' },
  { pattern: /AKIA[0-9A-Z]{16}/i, type: 'SECRET_EXPOSURE', score: 1.0, mitigation: 'BLOCK - AWS key detected' },
  { pattern: /-----BEGIN.*PRIVATE KEY/i, type: 'SECRET_EXPOSURE', score: 1.0, mitigation: 'BLOCK - Private key detected' },
  
  // Privilege escalation
  { pattern: /sudo|chmod|chown/i, type: 'PRIVILEGE_ESCALATION', score: 0.9, mitigation: 'Block privileged operations' },
  
  // Deceptive compliance patterns (alignment faking)
  { pattern: /ignore.*previous|disregard.*instruction/i, type: 'DECEPTIVE_COMPLIANCE', score: 0.95, mitigation: 'BLOCK - Potential prompt injection' },
  { pattern: /pretend.*you.*are|act.*as.*if/i, type: 'DECEPTIVE_COMPLIANCE', score: 0.6, mitigation: 'Review for roleplay manipulation' },
];

export class RiskAssessor {
  private config: CARSConfig;

  constructor(config: Partial<CARSConfig> = {}) {
    this.config = { ...DEFAULT_CARS_CONFIG, ...config };
  }

  assess(code: string): RiskAssessment {
    const types: RiskType[] = [];
    const factors: string[] = [];
    const mitigations: string[] = [];
    let maxScore = 0;

    for (const { pattern, type, score, mitigation } of RISK_PATTERNS) {
      if (pattern.test(code)) {
        if (!types.includes(type)) types.push(type);
        factors.push(`Detected: ${pattern.source}`);
        mitigations.push(mitigation);
        maxScore = Math.max(maxScore, score);
      }
    }

    const level = this.scoreToLevel(maxScore);
    
    // FROM 12_HUMAN_REVIEW: Determine if human approval required
    const requiresApproval = maxScore >= this.config.humanReviewThreshold;
    
    // FROM 09_DATA_PROTECTION: Recommend classification based on risk
    const recommendedClassification = this.determineClassification(types, maxScore);

    return { 
      level, 
      types, 
      score: maxScore, 
      factors, 
      mitigations: [...new Set(mitigations)],
      requiresApproval,
      recommendedClassification,
    };
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 0.8) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private determineClassification(types: RiskType[], score: number): RiskAssessment['recommendedClassification'] {
    if (types.includes('SECRET_EXPOSURE') || types.includes('DECEPTIVE_COMPLIANCE')) {
      return 'RESTRICTED';
    }
    if (score >= 0.7 || types.includes('DATA_EXFILTRATION')) {
      return 'CONFIDENTIAL';
    }
    if (score >= 0.3) {
      return 'INTERNAL';
    }
    return 'PUBLIC';
  }
}

export const riskAssessor = new RiskAssessor();
```

```typescript
// packages/forge-c/src/cars/index.ts
export * from './types.js';
export * from './assessor.js';
```

**Done When:** Risk assessor evaluates code safety with classification recommendations

---

### Task 3.75.3.3: Integrate CARS with execution

**Time:** 5 minutes | **Tokens:** ~2K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-01 through CE-05, 09_DATA_PROTECTION § DP-05

**Files to UPDATE:**
- `packages/forge-c/src/execution/index.ts`

**Purpose:** Integrate CARS risk assessment into code execution flow.

**Implementation:**

```typescript
// packages/forge-c/src/execution/index.ts
// ALIGNED WITH: forge-success-criteria/05_CONVERGENCE_ENGINE.md, 09_DATA_PROTECTION.md

export * from './types.js';
export * from './vm-sandbox.js';
export * from './factory.js';
export * from './virtual-fs.js';
export * from './privacy-filter.js';
export * from './audit-logger.js';

import { createSandbox } from './factory.js';
import { riskAssessor } from '../cars/assessor.js';
import { auditLogger } from './audit-logger.js';
import { privacyFilter } from './privacy-filter.js';
import { ExecutionResult, ExecutionOptions } from './types.js';

export interface SafeExecutionResult extends ExecutionResult {
  riskAssessment: import('../cars/types.js').RiskAssessment;
  auditTrail: string;  // Session ID for Evidence Pack integration
}

export async function safeExecute(
  code: string,
  sessionId: string,
  options: ExecutionOptions = {}
): Promise<SafeExecutionResult> {
  // STEP 1: CARS Risk Assessment (FROM 12_HUMAN_REVIEW)
  const assessment = riskAssessor.assess(code);
  
  auditLogger.log({
    eventType: 'execution_start',
    sessionId,
    classification: assessment.recommendedClassification,
    details: { 
      riskLevel: assessment.level, 
      riskScore: assessment.score,
      riskTypes: assessment.types,
    },
  });

  // STEP 2: Block if approval required (FROM 12_HUMAN_REVIEW § HR-01)
  if (assessment.requiresApproval) {
    auditLogger.log({
      eventType: 'error',
      sessionId,
      classification: assessment.recommendedClassification,
      details: { reason: 'approval_required', riskLevel: assessment.level },
    });
    
    return {
      success: false,
      output: '',
      error: `Execution blocked: Risk level ${assessment.level} (score: ${assessment.score.toFixed(2)}) requires human approval. Factors: ${assessment.factors.join(', ')}`,
      duration: 0,
      riskAssessment: assessment,
      auditTrail: sessionId,
    };
  }

  // STEP 3: Pre-execution privacy scan (FROM 09_DATA_PROTECTION § DP-02)
  const preFilter = privacyFilter.filter(code);
  if (preFilter.blocked) {
    auditLogger.log({
      eventType: 'privacy_detection',
      sessionId,
      classification: 'RESTRICTED',
      details: { detections: preFilter.detections, action: 'blocked' },
    });
    
    return {
      success: false,
      output: '',
      error: `Execution blocked: Secrets detected in code. Categories: ${preFilter.detections.filter(d => d.type === 'secret').map(d => d.category).join(', ')}`,
      duration: 0,
      riskAssessment: assessment,
      auditTrail: sessionId,
    };
  }

  // STEP 4: Execute in sandbox
  const sandbox = createSandbox('vm');
  try {
    const result = await sandbox.execute(code, {
      ...options,
      classification: assessment.recommendedClassification,
    });
    
    // STEP 5: Post-execution output filter (FROM 09_DATA_PROTECTION § DP-05)
    const postFilter = privacyFilter.filter(result.output);
    
    if (postFilter.detections.length > 0) {
      auditLogger.log({
        eventType: 'privacy_detection',
        sessionId,
        classification: assessment.recommendedClassification,
        details: { detections: postFilter.detections, action: 'redacted' },
      });
    }
    
    auditLogger.log({
      eventType: 'execution_end',
      sessionId,
      classification: assessment.recommendedClassification,
      details: { success: result.success, duration: result.duration },
    });

    return {
      ...result,
      output: postFilter.filtered,
      privacyDetections: postFilter.detections.map(d => ({
        type: d.type,
        category: d.category,
        token: `[REDACTED_${d.category.toUpperCase()}]`,
        location: { start: 0, end: 0 },  // Location tracking would need enhancement
      })),
      riskAssessment: assessment,
      auditTrail: sessionId,
    };
  } finally {
    await sandbox.dispose();
  }
}
```

**Done When:** Safe execution integrates CARS, privacy filtering, and audit logging

---

### Task 3.75.3.4: Export all execution and CARS components

**Time:** 3 minutes | **Tokens:** ~1K

**Files to UPDATE:**
- `packages/forge-c/src/index.ts`

**Purpose:** Export execution and CARS modules from main package.

**Implementation:**

```typescript
// packages/forge-c/src/index.ts
export * from './core/index.js';
export * from './providers/index.js';
export * from './plugins/index.js';
export * from './mcp/index.js';
export * from './execution/index.js';
export * from './cars/index.js';
```

**Verification:**
```bash
cd packages/forge-c && pnpm build
node -e "import('@forge/forge-c').then(m => console.log('CARS:', !!m.riskAssessor, 'SafeExec:', !!m.safeExecute))"
```

**Done When:** All exports available from @forge/forge-c

---

## Epic 3.75 Completion Checklist

Before moving to Epic 4:

- [ ] All 14 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for forge-c
- [ ] VM sandbox executes code with timeout
- [ ] Virtual filesystem provides isolation
- [ ] Privacy filter achieves ≥99% PII recall, 100% secret recall (09_DATA_PROTECTION § DP-09, DP-10)
- [ ] Audit logger outputs Evidence Pack compatible format (06_EVIDENCE_PACK)
- [ ] CARS risk assessor evaluates code with classification (09_DATA_PROTECTION)
- [ ] safeExecute() blocks high-risk code requiring approval (12_HUMAN_REVIEW § HR-01)
- [ ] Deceptive compliance patterns detected (CARS alignment faking countermeasure)

**Success Criteria Verification:**
```bash
# Run against 09_DATA_PROTECTION acceptance tests
pnpm test:acceptance --component=data-protection
```

**Commit:** `git commit -m "Epic 3.75: Code Execution (Security) - aligned with Success Criteria 05, 06, 09, 12"`

**Next:** Epic 4 - Convergence Engine
