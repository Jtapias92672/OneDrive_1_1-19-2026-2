# Epic 3.75: Code Execution - Atomic Task Breakdown

**Token Budget:** 20K (LIMIT: 20K) ✅ NEW SECURITY EPIC  
**Tasks:** 10  
**Estimated Time:** 3 days  
**Dependencies:** Epic 3 (FORGE C Core)

---

## Overview

Epic 3.75 implements secure code execution infrastructure including sandboxing, virtual filesystem, privacy filtering, audit logging, and CARS framework integration for risk assessment.

---

## Phase 3.75.1: Sandbox Infrastructure

### Task 3.75.1.1: Create code-execution package and types

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/execution/types.ts`
- `packages/forge-c/src/execution/index.ts`

**Purpose:** Define types for secure code execution.

**Implementation:**

```typescript
// packages/forge-c/src/execution/types.ts
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  memoryUsed?: number;
}

export interface ExecutionOptions {
  timeout?: number;
  maxMemory?: number;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
  workingDirectory?: string;
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

**Done When:** Types compile correctly

---

### Task 3.75.1.2: Implement Node.js VM sandbox

**Time:** 5 minutes | **Tokens:** ~3K

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

  async execute(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? 5000;

    try {
      const context = createContext({
        console: {
          log: (...args: unknown[]) => this.output.push(args.map(String).join(' ')),
          error: (...args: unknown[]) => this.output.push(`[ERROR] ${args.map(String).join(' ')}`),
        },
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        fetch: undefined,
        require: undefined,
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

  private output: string[] = [];

  async dispose(): Promise<void> {
    this.output = [];
  }
}
```

**Done When:** VM sandbox executes code with timeout

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
}

export class VirtualFileSystem {
  private files = new Map<string, VirtualFile>();

  writeFile(path: string, content: string): void {
    const now = new Date();
    const existing = this.files.get(path);
    this.files.set(path, {
      content,
      createdAt: existing?.createdAt ?? now,
      modifiedAt: now,
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

  getStats(path: string): { size: number; createdAt: Date; modifiedAt: Date } | undefined {
    const file = this.files.get(path);
    if (!file) return undefined;
    return {
      size: file.content.length,
      createdAt: file.createdAt,
      modifiedAt: file.modifiedAt,
    };
  }
}
```

**Done When:** Virtual filesystem provides isolation

---

### Task 3.75.2.2: Implement privacy filter

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/execution/privacy-filter.ts`

**Purpose:** Filter sensitive information from outputs.

**Implementation:**

```typescript
// packages/forge-c/src/execution/privacy-filter.ts
export interface PrivacyRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const DEFAULT_RULES: PrivacyRule[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]', description: 'Email addresses' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]', description: 'Phone numbers' },
  { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, replacement: '[SSN]', description: 'Social Security Numbers' },
  { pattern: /\b(?:sk-|pk-|api[_-]?key[=:]?\s*)[a-zA-Z0-9]{20,}\b/gi, replacement: '[API_KEY]', description: 'API keys' },
  { pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, replacement: '[TOKEN]', description: 'Base64 tokens' },
];

export class PrivacyFilter {
  private rules: PrivacyRule[];

  constructor(additionalRules: PrivacyRule[] = []) {
    this.rules = [...DEFAULT_RULES, ...additionalRules];
  }

  filter(text: string): string {
    let filtered = text;
    for (const rule of this.rules) {
      filtered = filtered.replace(rule.pattern, rule.replacement);
    }
    return filtered;
  }

  addRule(rule: PrivacyRule): void {
    this.rules.push(rule);
  }
}

export const privacyFilter = new PrivacyFilter();
```

**Done When:** Privacy filter redacts sensitive data

---

### Task 3.75.2.3: Implement audit logger

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/execution/audit-logger.ts`

**Purpose:** Log all execution events for compliance auditing.

**Implementation:**

```typescript
// packages/forge-c/src/execution/audit-logger.ts
import { createLogger } from '@forge/core';

export interface AuditEvent {
  timestamp: Date;
  eventType: 'execution_start' | 'execution_end' | 'file_access' | 'network_access' | 'error';
  sessionId: string;
  details: Record<string, unknown>;
}

export class AuditLogger {
  private logger = createLogger('audit');
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = { ...event, timestamp: new Date() };
    this.events.push(fullEvent);
    
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.logger.info(`[AUDIT] ${event.eventType}`, { sessionId: event.sessionId, ...event.details });
  }

  getEvents(sessionId?: string): AuditEvent[] {
    return sessionId 
      ? this.events.filter(e => e.sessionId === sessionId)
      : [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

export const auditLogger = new AuditLogger();
```

**Done When:** Audit logger tracks all execution events

---

## Phase 3.75.3: CARS Framework

### Task 3.75.3.1: Define CARS risk types

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/cars/types.ts`

**Purpose:** Define risk assessment types for CARS framework.

**Implementation:**

```typescript
// packages/forge-c/src/cars/types.ts
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskType = 
  | 'CODE_EXECUTION'
  | 'FILE_SYSTEM_ACCESS'
  | 'NETWORK_ACCESS'
  | 'DATA_EXFILTRATION'
  | 'PRIVILEGE_ESCALATION'
  | 'DECEPTIVE_COMPLIANCE';

export interface RiskAssessment {
  level: RiskLevel;
  types: RiskType[];
  score: number;
  factors: string[];
  mitigations: string[];
  requiresApproval: boolean;
}

export interface CARSConfig {
  autoApproveBelow: RiskLevel;
  maxAutonomousRisk: number;
  enableDeceptionDetection: boolean;
}

export const DEFAULT_CARS_CONFIG: CARSConfig = {
  autoApproveBelow: 'low',
  maxAutonomousRisk: 0.3,
  enableDeceptionDetection: true,
};
```

**Done When:** Risk types compile correctly

---

### Task 3.75.3.2: Implement risk assessor

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/forge-c/src/cars/assessor.ts`
- `packages/forge-c/src/cars/index.ts`

**Purpose:** Assess risk level of code execution requests.

**Implementation:**

```typescript
// packages/forge-c/src/cars/assessor.ts
import { RiskAssessment, RiskLevel, RiskType, CARSConfig, DEFAULT_CARS_CONFIG } from './types.js';

const RISK_PATTERNS: Array<{ pattern: RegExp; type: RiskType; score: number }> = [
  { pattern: /eval\s*\(/i, type: 'CODE_EXECUTION', score: 0.8 },
  { pattern: /exec\s*\(/i, type: 'CODE_EXECUTION', score: 0.9 },
  { pattern: /fs\.(write|unlink|rm)/i, type: 'FILE_SYSTEM_ACCESS', score: 0.6 },
  { pattern: /fetch|http|request/i, type: 'NETWORK_ACCESS', score: 0.5 },
  { pattern: /process\.env/i, type: 'DATA_EXFILTRATION', score: 0.7 },
  { pattern: /sudo|chmod|chown/i, type: 'PRIVILEGE_ESCALATION', score: 0.9 },
];

export class RiskAssessor {
  private config: CARSConfig;

  constructor(config: Partial<CARSConfig> = {}) {
    this.config = { ...DEFAULT_CARS_CONFIG, ...config };
  }

  assess(code: string): RiskAssessment {
    const types: RiskType[] = [];
    const factors: string[] = [];
    let totalScore = 0;

    for (const { pattern, type, score } of RISK_PATTERNS) {
      if (pattern.test(code)) {
        if (!types.includes(type)) types.push(type);
        factors.push(`Detected: ${pattern.source}`);
        totalScore = Math.max(totalScore, score);
      }
    }

    const level = this.scoreToLevel(totalScore);
    const mitigations = this.suggestMitigations(types);
    const requiresApproval = totalScore > this.config.maxAutonomousRisk;

    return { level, types, score: totalScore, factors, mitigations, requiresApproval };
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 0.8) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private suggestMitigations(types: RiskType[]): string[] {
    const mitigations: string[] = [];
    if (types.includes('CODE_EXECUTION')) mitigations.push('Use VM sandbox');
    if (types.includes('FILE_SYSTEM_ACCESS')) mitigations.push('Use virtual filesystem');
    if (types.includes('NETWORK_ACCESS')) mitigations.push('Block network in sandbox');
    if (types.includes('DATA_EXFILTRATION')) mitigations.push('Filter environment variables');
    return mitigations;
  }
}

export const riskAssessor = new RiskAssessor();
```

```typescript
// packages/forge-c/src/cars/index.ts
export * from './types.js';
export * from './assessor.js';
```

**Done When:** Risk assessor evaluates code safety

---

### Task 3.75.3.3: Integrate CARS with execution

**Time:** 5 minutes | **Tokens:** ~2K

**Files to UPDATE:**
- `packages/forge-c/src/execution/index.ts`

**Purpose:** Integrate CARS risk assessment into code execution flow.

**Implementation:**

```typescript
// packages/forge-c/src/execution/index.ts
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

export async function safeExecute(
  code: string,
  sessionId: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const assessment = riskAssessor.assess(code);
  
  auditLogger.log({
    eventType: 'execution_start',
    sessionId,
    details: { riskLevel: assessment.level, riskScore: assessment.score },
  });

  if (assessment.requiresApproval) {
    return {
      success: false,
      output: '',
      error: `Execution blocked: Risk level ${assessment.level} requires approval`,
      duration: 0,
    };
  }

  const sandbox = createSandbox('vm');
  try {
    const result = await sandbox.execute(code, options);
    
    auditLogger.log({
      eventType: 'execution_end',
      sessionId,
      details: { success: result.success, duration: result.duration },
    });

    return {
      ...result,
      output: privacyFilter.filter(result.output),
    };
  } finally {
    await sandbox.dispose();
  }
}
```

**Done When:** Safe execution integrates CARS assessment

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

- [ ] All 10 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for forge-c
- [ ] VM sandbox executes code with timeout
- [ ] Virtual filesystem provides isolation
- [ ] Privacy filter redacts sensitive data
- [ ] Audit logger tracks events
- [ ] CARS risk assessor evaluates code
- [ ] safeExecute() integrates all components

**Commit:** `git commit -m "Epic 3.75: Code Execution (Security) complete"`

**Next:** Epic 4 - Convergence Engine
