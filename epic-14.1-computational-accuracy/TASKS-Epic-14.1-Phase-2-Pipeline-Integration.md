# Epic 14.1 Phase 2: Pipeline Integration Tasks

> **Status:** NOT STARTED  
> **Depends On:** Phase 1 (Complete)  
> **Duration:** 4 days  
> **Token Budget:** 15K

---

## Overview

Phase 2 integrates the Wolfram computational validator into the FORGE convergence pipeline, enabling automatic detection of computational claims, integration with evidence packs, and feeding correct answers back into the repair loop.

---

## Task 2.1: Defense & EVM Claim Detector Patterns

**Time:** 4 hours | **Tokens:** ~4K

### Purpose
Expand the claim detection regex patterns to recognize defense contractor and EVM-specific calculations that are common in FORGE outputs.

### Files to Create/Modify

```
validators/computational/
├── claim-patterns.ts          # NEW - Pattern library
└── computational-validator.ts # MODIFY - Import patterns
```

### Implementation

```typescript
// validators/computational/claim-patterns.ts

export interface ClaimPattern {
  id: string;
  name: string;
  category: 'evm' | 'financial' | 'statistical' | 'conversion' | 'date' | 'defense';
  pattern: RegExp;
  extractor: (match: RegExpMatchArray) => ComputationalClaim;
  priority: number; // Higher = check first
}

export const CLAIM_PATTERNS: ClaimPattern[] = [
  // ============================================
  // EVM (Earned Value Management) Patterns
  // ============================================
  {
    id: 'evm-cpi',
    name: 'Cost Performance Index',
    category: 'evm',
    pattern: /CPI\s*[=:]\s*(?:EV\s*[\/÷]\s*AC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseFloat(match[3]),
      context: 'CPI calculation',
      formula: 'CPI = EV / AC'
    }),
    priority: 100
  },
  {
    id: 'evm-spi',
    name: 'Schedule Performance Index',
    category: 'evm',
    pattern: /SPI\s*[=:]\s*(?:EV\s*[\/÷]\s*PV\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseFloat(match[3]),
      context: 'SPI calculation',
      formula: 'SPI = EV / PV'
    }),
    priority: 100
  },
  {
    id: 'evm-eac',
    name: 'Estimate at Completion',
    category: 'evm',
    pattern: /EAC\s*[=:]\s*(?:BAC\s*[\/÷]\s*CPI\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*([\d.]+)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseFloat(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'EAC calculation',
      formula: 'EAC = BAC / CPI'
    }),
    priority: 100
  },
  {
    id: 'evm-vac',
    name: 'Variance at Completion',
    category: 'evm',
    pattern: /VAC\s*[=:]\s*(?:BAC\s*[-−]\s*EAC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*[-−]?\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'VAC calculation',
      formula: 'VAC = BAC - EAC'
    }),
    priority: 100
  },
  {
    id: 'evm-tcpi',
    name: 'To-Complete Performance Index',
    category: 'evm',
    pattern: /TCPI\s*[=:]\s*\(?\s*(?:BAC\s*[-−]\s*EV\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\(?\s*(?:BAC\s*[-−]\s*AC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `(${parseNumber(match[1])} - ${parseNumber(match[2])}) / (${parseNumber(match[3])} - ${parseNumber(match[4])})`,
      claimedResult: parseFloat(match[5]),
      context: 'TCPI calculation',
      formula: 'TCPI = (BAC - EV) / (BAC - AC)'
    }),
    priority: 100
  },

  // ============================================
  // Defense Contract Patterns
  // ============================================
  {
    id: 'defense-award-fee',
    name: 'Award Fee Calculation',
    category: 'defense',
    pattern: /award\s+fee\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)%?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseFloat(match[2]) / 100}`,
      claimedResult: parseNumber(match[3]),
      context: 'Award fee calculation',
      formula: 'Award Fee = Base × Performance Score'
    }),
    priority: 90
  },
  {
    id: 'defense-cpif',
    name: 'CPIF Share Calculation',
    category: 'defense',
    pattern: /(?:government|contractor)\s+share\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)%?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseFloat(match[2]) / 100}`,
      claimedResult: parseNumber(match[3]),
      context: 'CPIF share ratio calculation'
    }),
    priority: 90
  },
  {
    id: 'defense-fte',
    name: 'FTE Hours Calculation',
    category: 'defense',
    pattern: /([\d,]+(?:\.\d+)?)\s*FTE[s]?\s*[×x\*]\s*([\d,]+)\s*hours?\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*(?:total\s+)?hours?/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'FTE to hours conversion'
    }),
    priority: 80
  },

  // ============================================
  // Financial Patterns
  // ============================================
  {
    id: 'financial-compound-interest',
    name: 'Compound Interest',
    category: 'financial',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*(?:at|@)\s*([\d.]+)%?\s*(?:APR|APY|interest)?\s*(?:for|over)\s*(\d+)\s*(?:years?|months?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'compound_interest',
      principal: parseNumber(match[1]),
      rate: parseFloat(match[2]),
      periods: parseInt(match[3]),
      claimedResult: parseNumber(match[4]),
      context: 'Compound interest calculation'
    }),
    priority: 85
  },
  {
    id: 'financial-percentage',
    name: 'Percentage Calculation',
    category: 'financial',
    pattern: /([\d.]+)%\s*(?:of)\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseFloat(match[1])} / 100 * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Percentage calculation'
    }),
    priority: 70
  },
  {
    id: 'financial-margin',
    name: 'Profit Margin',
    category: 'financial',
    pattern: /(?:profit\s+)?margin\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)%?/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `(${parseNumber(match[1])} - ${parseNumber(match[2])}) / ${parseNumber(match[3])} * 100`,
      claimedResult: parseFloat(match[4]),
      context: 'Profit margin calculation'
    }),
    priority: 75
  },

  // ============================================
  // Statistical Patterns
  // ============================================
  {
    id: 'statistical-average',
    name: 'Average/Mean',
    category: 'statistical',
    pattern: /(?:average|mean)\s*(?:of)?\s*[=:]\s*\(?([\d,.\s+]+)\)?\s*[\/÷]\s*(\d+)\s*[=:]\s*([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const numbers = match[1].split(/[+,\s]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
      return {
        type: 'arithmetic',
        expression: `(${numbers.join(' + ')}) / ${match[2]}`,
        claimedResult: parseNumber(match[3]),
        context: 'Average calculation'
      };
    },
    priority: 60
  },
  {
    id: 'statistical-variance',
    name: 'Variance Percentage',
    category: 'statistical',
    pattern: /variance\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)%?/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `(${parseNumber(match[1])} - ${parseNumber(match[2])}) / ${parseNumber(match[3])} * 100`,
      claimedResult: parseFloat(match[4]),
      context: 'Variance calculation'
    }),
    priority: 65
  },

  // ============================================
  // Generic Arithmetic (Fallback)
  // ============================================
  {
    id: 'generic-division',
    name: 'Generic Division',
    category: 'statistical',
    pattern: /([\d,]+(?:\.\d+)?)\s*[\/÷]\s*([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseFloat(match[3]),
      context: 'Division'
    }),
    priority: 10
  },
  {
    id: 'generic-multiplication',
    name: 'Generic Multiplication',
    category: 'statistical',
    pattern: /([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d,]+(?:\.\d+)?)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Multiplication'
    }),
    priority: 10
  }
];

// Helper function to parse numbers with commas
function parseNumber(str: string): number {
  return parseFloat(str.replace(/,/g, ''));
}

// Export pattern categories for filtering
export const PATTERN_CATEGORIES = ['evm', 'financial', 'statistical', 'conversion', 'date', 'defense'] as const;
export type PatternCategory = typeof PATTERN_CATEGORIES[number];

// Get patterns by category
export function getPatternsByCategory(category: PatternCategory): ClaimPattern[] {
  return CLAIM_PATTERNS.filter(p => p.category === category).sort((a, b) => b.priority - a.priority);
}

// Get all patterns sorted by priority
export function getAllPatternsSorted(): ClaimPattern[] {
  return [...CLAIM_PATTERNS].sort((a, b) => b.priority - a.priority);
}
```

### Verification

```bash
# Run pattern matching tests
pnpm test -- --grep "claim-patterns"

# Test with sample EVM text
echo "CPI = 750000 / 800000 = 0.9375" | npx ts-node tests/test-patterns.ts
```

### Done When
- [ ] All EVM patterns (CPI, SPI, EAC, VAC, TCPI) tested
- [ ] Defense patterns (award fee, CPIF, FTE) tested
- [ ] Financial patterns working
- [ ] Pattern priority ordering correct
- [ ] Integrated with ComputationalValidator

---

## Task 2.2: Evidence Pack Integration

**Time:** 3 hours | **Tokens:** ~3K

### Purpose
Extend the FORGE evidence pack schema to include computational validation results, Wolfram query IDs, and verification audit trails.

### Files to Create/Modify

```
validators/computational/
├── evidence-integration.ts    # NEW - Evidence pack adapter
└── types.ts                   # MODIFY - Add evidence types
```

### Implementation

```typescript
// validators/computational/evidence-integration.ts

import { ValidationReport, ValidatedClaim } from './types';

/**
 * Evidence Pack schema extension for computational validation
 */
export interface ComputationalEvidence {
  /** Unique ID for this validation run */
  validationId: string;
  
  /** ISO8601 timestamp */
  timestamp: string;
  
  /** Summary statistics */
  summary: {
    totalClaims: number;
    validClaims: number;
    invalidClaims: number;
    skippedClaims: number;
    l1PassRate: number;
    wolframInvocations: number;
    cacheHits: number;
    totalLatencyMs: number;
  };
  
  /** Per-claim evidence */
  claims: ClaimEvidence[];
  
  /** Cost tracking */
  costs: {
    wolframQueries: number;
    estimatedCostUsd: number;
    budgetRemainingDaily: number;
    budgetRemainingMonthly: number;
  };
  
  /** Audit metadata */
  audit: {
    validatorVersion: string;
    wolframApiVersion: string;
    configHash: string;
    environmentId: string;
  };
}

export interface ClaimEvidence {
  claimId: string;
  originalText: string;
  category: string;
  patternId: string;
  
  /** L1 validation result */
  l1Result: {
    passed: boolean;
    computedValue: number | null;
    claimedValue: number;
    tolerance: number;
    latencyMs: number;
  };
  
  /** L1.5 Wolfram result (if invoked) */
  wolframResult?: {
    invoked: boolean;
    queryId: string;
    query: string;
    response: string;
    computedValue: number | null;
    confidence: number;
    latencyMs: number;
    cached: boolean;
  };
  
  /** Final determination */
  finalStatus: 'VALID' | 'INVALID' | 'UNCERTAIN' | 'SKIPPED';
  correctValue?: number;
  errorMessage?: string;
}

/**
 * Converts a ValidationReport to Evidence Pack format
 */
export function toEvidencePack(report: ValidationReport): ComputationalEvidence {
  const validationId = `cv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    validationId,
    timestamp: new Date().toISOString(),
    summary: {
      totalClaims: report.summary.total,
      validClaims: report.summary.valid,
      invalidClaims: report.summary.invalid,
      skippedClaims: report.summary.skipped || 0,
      l1PassRate: report.summary.total > 0 
        ? (report.summary.total - report.summary.wolframInvocations) / report.summary.total 
        : 1,
      wolframInvocations: report.summary.wolframInvocations,
      cacheHits: report.summary.cacheHits,
      totalLatencyMs: report.claims.reduce((sum, c) => sum + (c.latencyMs || 0), 0)
    },
    claims: report.claims.map(claim => toClaimEvidence(claim)),
    costs: {
      wolframQueries: report.summary.wolframInvocations - report.summary.cacheHits,
      estimatedCostUsd: (report.summary.wolframInvocations - report.summary.cacheHits) * 0.02,
      budgetRemainingDaily: report.budgetStatus?.dailyRemaining || 0,
      budgetRemainingMonthly: report.budgetStatus?.monthlyRemaining || 0
    },
    audit: {
      validatorVersion: '14.1.0',
      wolframApiVersion: 'llm-api-v1',
      configHash: report.configHash || 'unknown',
      environmentId: process.env.FORGE_ENV_ID || 'local'
    }
  };
}

function toClaimEvidence(claim: ValidatedClaim): ClaimEvidence {
  return {
    claimId: claim.id || `claim-${Math.random().toString(36).substr(2, 9)}`,
    originalText: claim.originalText,
    category: claim.category || 'unknown',
    patternId: claim.patternId || 'generic',
    l1Result: {
      passed: claim.l1Passed || false,
      computedValue: claim.l1ComputedValue || null,
      claimedValue: claim.claimedResult,
      tolerance: claim.tolerance || 0.0001,
      latencyMs: claim.l1LatencyMs || 0
    },
    wolframResult: claim.wolframInvoked ? {
      invoked: true,
      queryId: claim.wolframQueryId || '',
      query: claim.wolframQuery || '',
      response: claim.wolframResponse || '',
      computedValue: claim.wolframComputedValue || null,
      confidence: claim.wolframConfidence || 0,
      latencyMs: claim.wolframLatencyMs || 0,
      cached: claim.wolframCached || false
    } : undefined,
    finalStatus: claim.status,
    correctValue: claim.correctAnswer,
    errorMessage: claim.errorMessage
  };
}

/**
 * Merges computational evidence into existing FORGE evidence pack
 */
export function mergeIntoEvidencePack(
  existingPack: any, // FORGE EvidencePack type
  computationalEvidence: ComputationalEvidence
): any {
  return {
    ...existingPack,
    computationalValidation: computationalEvidence,
    metadata: {
      ...existingPack.metadata,
      computationalValidationId: computationalEvidence.validationId,
      computationalValidationTimestamp: computationalEvidence.timestamp
    },
    // Add to iteration history if present
    iterations: existingPack.iterations?.map((iter: any, idx: number) => 
      idx === existingPack.iterations.length - 1
        ? { ...iter, computationalEvidence }
        : iter
    )
  };
}
```

### Verification

```bash
# Test evidence pack generation
pnpm test -- --grep "evidence-integration"

# Validate against FORGE evidence pack schema
npx ajv validate -s forge-success-criteria/schemas/evidence-pack.schema.json -d test-evidence.json
```

### Done When
- [ ] Evidence schema matches FORGE EP-01 through EP-10
- [ ] All claim details captured
- [ ] Cost tracking accurate
- [ ] Audit trail complete
- [ ] Schema validation passes

---

## Task 2.3: Repair Loop Integration

**Time:** 4 hours | **Tokens:** ~4K

### Purpose
Connect the computational validator to the FORGE convergence engine's repair loop, providing correct answers to the reflection agent when calculations are invalid.

### Files to Create/Modify

```
validators/computational/
├── repair-feedback.ts         # NEW - Repair feedback generator
└── convergence-adapter.ts     # NEW - Convergence engine adapter
```

### Implementation

```typescript
// validators/computational/repair-feedback.ts

import { ValidationReport, ValidatedClaim } from './types';

/**
 * Generates structured feedback for the FORGE repair loop
 * Based on CE-07 (repair prompts with specific errors) and CE-11 (explicit reflection)
 */
export interface RepairFeedback {
  /** Overall validation status */
  hasComputationalErrors: boolean;
  
  /** Error count by severity */
  errorCounts: {
    critical: number;  // Financial/compliance errors
    major: number;     // EVM calculation errors
    minor: number;     // Rounding/formatting issues
  };
  
  /** Structured error list for repair prompt */
  errors: ComputationalError[];
  
  /** Suggested repair actions */
  repairActions: RepairAction[];
  
  /** Pre-formatted repair prompt section */
  repairPromptSection: string;
}

export interface ComputationalError {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  category: string;
  location: string;
  
  /** What the agent claimed */
  claimed: {
    text: string;
    value: number;
  };
  
  /** What the correct answer is */
  correct: {
    value: number;
    source: 'local' | 'wolfram';
    confidence: number;
    formula?: string;
  };
  
  /** Explanation for reflection */
  explanation: string;
}

export interface RepairAction {
  errorId: string;
  action: 'replace' | 'recalculate' | 'verify' | 'remove';
  instruction: string;
  correctValue: string;
}

/**
 * Generate repair feedback from validation report
 */
export function generateRepairFeedback(report: ValidationReport): RepairFeedback {
  const errors: ComputationalError[] = [];
  const repairActions: RepairAction[] = [];
  
  for (const claim of report.claims) {
    if (claim.status === 'INVALID') {
      const error = toComputationalError(claim);
      errors.push(error);
      repairActions.push(generateRepairAction(error));
    }
  }
  
  const errorCounts = {
    critical: errors.filter(e => e.severity === 'critical').length,
    major: errors.filter(e => e.severity === 'major').length,
    minor: errors.filter(e => e.severity === 'minor').length
  };
  
  return {
    hasComputationalErrors: errors.length > 0,
    errorCounts,
    errors,
    repairActions,
    repairPromptSection: formatRepairPromptSection(errors, repairActions)
  };
}

function toComputationalError(claim: ValidatedClaim): ComputationalError {
  const severity = determineSeverity(claim);
  
  return {
    id: claim.id || `err-${Math.random().toString(36).substr(2, 6)}`,
    severity,
    category: claim.category || 'unknown',
    location: claim.originalText.substring(0, 100),
    claimed: {
      text: claim.originalText,
      value: claim.claimedResult
    },
    correct: {
      value: claim.correctAnswer || claim.wolframComputedValue || claim.l1ComputedValue || 0,
      source: claim.wolframInvoked ? 'wolfram' : 'local',
      confidence: claim.wolframConfidence || 0.99,
      formula: claim.formula
    },
    explanation: generateExplanation(claim)
  };
}

function determineSeverity(claim: ValidatedClaim): 'critical' | 'major' | 'minor' {
  // Critical: Financial/compliance errors, large deviations
  if (claim.category === 'financial' || claim.category === 'defense') {
    return 'critical';
  }
  
  // Major: EVM errors
  if (claim.category === 'evm') {
    return 'major';
  }
  
  // Check deviation magnitude
  const deviation = Math.abs(claim.claimedResult - (claim.correctAnswer || 0)) / Math.abs(claim.correctAnswer || 1);
  if (deviation > 0.1) return 'major';  // >10% error
  if (deviation > 0.01) return 'minor'; // >1% error
  
  return 'minor';
}

function generateExplanation(claim: ValidatedClaim): string {
  const correct = claim.correctAnswer || claim.wolframComputedValue || claim.l1ComputedValue;
  const deviation = claim.claimedResult - (correct || 0);
  const deviationPct = ((deviation / Math.abs(correct || 1)) * 100).toFixed(2);
  
  let explanation = `The claimed value ${claim.claimedResult} differs from the correct value ${correct} `;
  explanation += `by ${deviation > 0 ? '+' : ''}${deviation.toFixed(4)} (${deviationPct}%). `;
  
  if (claim.formula) {
    explanation += `The correct formula is: ${claim.formula}. `;
  }
  
  if (claim.wolframInvoked) {
    explanation += `Verified by Wolfram Alpha (confidence: ${((claim.wolframConfidence || 0) * 100).toFixed(1)}%).`;
  }
  
  return explanation;
}

function generateRepairAction(error: ComputationalError): RepairAction {
  return {
    errorId: error.id,
    action: 'replace',
    instruction: `Replace "${error.claimed.value}" with "${error.correct.value}" in the ${error.category} calculation.`,
    correctValue: error.correct.value.toString()
  };
}

/**
 * Format errors into a repair prompt section following CE-07 and CE-11
 */
function formatRepairPromptSection(errors: ComputationalError[], actions: RepairAction[]): string {
  if (errors.length === 0) {
    return '';
  }
  
  let prompt = `\n## Computational Errors Detected\n\n`;
  prompt += `The following ${errors.length} computational error(s) must be corrected:\n\n`;
  
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const action = actions[i];
    
    prompt += `### Error ${i + 1}: ${error.category.toUpperCase()} [${error.severity.toUpperCase()}]\n`;
    prompt += `- **Location:** \`${error.location}...\`\n`;
    prompt += `- **Claimed:** ${error.claimed.value}\n`;
    prompt += `- **Correct:** ${error.correct.value} (source: ${error.correct.source})\n`;
    if (error.correct.formula) {
      prompt += `- **Formula:** ${error.correct.formula}\n`;
    }
    prompt += `- **Action:** ${action.instruction}\n\n`;
  }
  
  // CE-11: Explicit reflection requirement
  prompt += `## Reflection (REQUIRED - CE-11)\n\n`;
  prompt += `Before making corrections, analyze each error:\n`;
  prompt += `1. What assumption led to this calculation error?\n`;
  prompt += `2. What is the correct formula or method?\n`;
  prompt += `3. Are there similar calculations that need review?\n\n`;
  prompt += `Provide your analysis, then output the corrected content.\n`;
  
  return prompt;
}

// validators/computational/convergence-adapter.ts

import { ComputationalValidator, ValidationReport } from './index';
import { generateRepairFeedback, RepairFeedback } from './repair-feedback';
import { toEvidencePack, ComputationalEvidence } from './evidence-integration';

/**
 * Adapter for integrating ComputationalValidator with FORGE Convergence Engine
 */
export class ConvergenceAdapter {
  private validator: ComputationalValidator;
  
  constructor(validator: ComputationalValidator) {
    this.validator = validator;
  }
  
  /**
   * Validate content and return convergence-compatible result
   */
  async validateForConvergence(content: string): Promise<{
    passed: boolean;
    score: number;
    feedback: RepairFeedback;
    evidence: ComputationalEvidence;
  }> {
    const report = await this.validator.validateText(content);
    const feedback = generateRepairFeedback(report);
    const evidence = toEvidencePack(report);
    
    // Calculate score (0-1)
    const score = report.summary.total > 0
      ? report.summary.valid / report.summary.total
      : 1.0;
    
    return {
      passed: report.summary.invalid === 0,
      score,
      feedback,
      evidence
    };
  }
  
  /**
   * Hook into FORGE convergence Layer 1 (structural)
   * Computational validation runs as part of structural validation
   */
  async layer1Hook(content: string): Promise<{
    passed: boolean;
    errors: string[];
    repairHints: string[];
  }> {
    const result = await this.validateForConvergence(content);
    
    return {
      passed: result.passed,
      errors: result.feedback.errors.map(e => 
        `[${e.severity.toUpperCase()}] ${e.category}: ${e.claimed.value} should be ${e.correct.value}`
      ),
      repairHints: result.feedback.repairActions.map(a => a.instruction)
    };
  }
}
```

### Verification

```bash
# Test repair feedback generation
pnpm test -- --grep "repair-feedback"

# Test convergence integration
pnpm test -- --grep "convergence-adapter"

# Integration test with mock convergence engine
pnpm test:integration -- --grep "computational-convergence"
```

### Done When
- [ ] RepairFeedback matches CE-07 requirements
- [ ] Reflection prompt follows CE-11
- [ ] ConvergenceAdapter hooks work
- [ ] Error severity classification accurate
- [ ] Correct values propagate to repair loop

---

## Task 2.4: Dashboard Metrics

**Time:** 3 hours | **Tokens:** ~3K

### Purpose
Expose computational validation metrics for the FORGE Platform UI dashboard, including usage, cache efficiency, cost tracking, and error rates.

### Files to Create/Modify

```
validators/computational/
├── metrics.ts                 # NEW - Metrics collector
├── metrics-api.ts             # NEW - REST API endpoints
└── types.ts                   # MODIFY - Add metric types
```

### Implementation

```typescript
// validators/computational/metrics.ts

import { EventEmitter } from 'events';

/**
 * Metrics collector for computational validation
 * Integrates with OB-01 through OB-11 (Observability criteria)
 */
export interface ComputationalMetrics {
  // Counters (OB-02: prometheus_metrics_exported)
  counters: {
    claimsValidated: number;
    claimsValid: number;
    claimsInvalid: number;
    claimsSkipped: number;
    l1Passes: number;
    l1Failures: number;
    wolframInvocations: number;
    wolframSuccesses: number;
    wolframFailures: number;
    wolframTimeouts: number;
    cacheHits: number;
    cacheMisses: number;
  };
  
  // Gauges
  gauges: {
    cacheSize: number;
    budgetRemainingDaily: number;
    budgetRemainingMonthly: number;
    activeValidations: number;
  };
  
  // Histograms (latency distributions)
  histograms: {
    l1LatencyMs: number[];
    wolframLatencyMs: number[];
    totalLatencyMs: number[];
  };
  
  // Time-series (rolling window)
  timeSeries: {
    hourly: TimeSeriesPoint[];
    daily: TimeSeriesPoint[];
  };
}

export interface TimeSeriesPoint {
  timestamp: string;
  claims: number;
  valid: number;
  invalid: number;
  wolframCalls: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  costUsd: number;
}

export interface DashboardSummary {
  // Current status
  status: 'healthy' | 'degraded' | 'error';
  
  // Key metrics
  today: {
    claimsValidated: number;
    validRate: number;
    wolframCalls: number;
    cacheHitRate: number;
    avgLatencyMs: number;
    costUsd: number;
  };
  
  // Trends (vs yesterday)
  trends: {
    claimsChange: number;
    validRateChange: number;
    costChange: number;
  };
  
  // Alerts
  alerts: Alert[];
  
  // Budget status
  budget: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    projectedMonthlyUsage: number;
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

/**
 * Singleton metrics collector
 */
class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private metrics: ComputationalMetrics;
  private alerts: Alert[] = [];
  
  private constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.startHourlyAggregation();
  }
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  private initializeMetrics(): ComputationalMetrics {
    return {
      counters: {
        claimsValidated: 0,
        claimsValid: 0,
        claimsInvalid: 0,
        claimsSkipped: 0,
        l1Passes: 0,
        l1Failures: 0,
        wolframInvocations: 0,
        wolframSuccesses: 0,
        wolframFailures: 0,
        wolframTimeouts: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      gauges: {
        cacheSize: 0,
        budgetRemainingDaily: 100,
        budgetRemainingMonthly: 2000,
        activeValidations: 0
      },
      histograms: {
        l1LatencyMs: [],
        wolframLatencyMs: [],
        totalLatencyMs: []
      },
      timeSeries: {
        hourly: [],
        daily: []
      }
    };
  }
  
  // Record methods
  recordClaim(valid: boolean, l1Passed: boolean, wolframInvoked: boolean, latencyMs: number) {
    this.metrics.counters.claimsValidated++;
    if (valid) this.metrics.counters.claimsValid++;
    else this.metrics.counters.claimsInvalid++;
    
    if (l1Passed) this.metrics.counters.l1Passes++;
    else this.metrics.counters.l1Failures++;
    
    if (wolframInvoked) this.metrics.counters.wolframInvocations++;
    
    this.metrics.histograms.totalLatencyMs.push(latencyMs);
    
    this.emit('claim', { valid, l1Passed, wolframInvoked, latencyMs });
  }
  
  recordL1Latency(ms: number) {
    this.metrics.histograms.l1LatencyMs.push(ms);
  }
  
  recordWolframCall(success: boolean, latencyMs: number, cached: boolean) {
    if (success) this.metrics.counters.wolframSuccesses++;
    else this.metrics.counters.wolframFailures++;
    
    if (cached) this.metrics.counters.cacheHits++;
    else this.metrics.counters.cacheMisses++;
    
    this.metrics.histograms.wolframLatencyMs.push(latencyMs);
  }
  
  recordWolframTimeout() {
    this.metrics.counters.wolframTimeouts++;
  }
  
  updateBudget(dailyRemaining: number, monthlyRemaining: number) {
    this.metrics.gauges.budgetRemainingDaily = dailyRemaining;
    this.metrics.gauges.budgetRemainingMonthly = monthlyRemaining;
    
    // Check for budget alerts
    if (dailyRemaining < 10) {
      this.addAlert('warning', `Daily Wolfram budget low: ${dailyRemaining} queries remaining`);
    }
    if (monthlyRemaining < 100) {
      this.addAlert('critical', `Monthly Wolfram budget critical: ${monthlyRemaining} queries remaining`);
    }
  }
  
  updateCacheSize(size: number) {
    this.metrics.gauges.cacheSize = size;
  }
  
  private addAlert(severity: Alert['severity'], message: string) {
    const alert: Alert = {
      id: `alert-${Date.now()}`,
      severity,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    this.alerts.push(alert);
    this.emit('alert', alert);
  }
  
  acknowledgeAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) alert.acknowledged = true;
  }
  
  // Aggregation
  private startHourlyAggregation() {
    setInterval(() => {
      this.aggregateHourly();
    }, 60 * 60 * 1000); // Every hour
  }
  
  private aggregateHourly() {
    const c = this.metrics.counters;
    const point: TimeSeriesPoint = {
      timestamp: new Date().toISOString(),
      claims: c.claimsValidated,
      valid: c.claimsValid,
      invalid: c.claimsInvalid,
      wolframCalls: c.wolframInvocations,
      cacheHitRate: c.wolframInvocations > 0 
        ? c.cacheHits / c.wolframInvocations 
        : 1,
      avgLatencyMs: this.calculateAverage(this.metrics.histograms.totalLatencyMs),
      costUsd: (c.wolframInvocations - c.cacheHits) * 0.02
    };
    
    this.metrics.timeSeries.hourly.push(point);
    
    // Keep only last 24 hours
    if (this.metrics.timeSeries.hourly.length > 24) {
      this.metrics.timeSeries.hourly.shift();
    }
  }
  
  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  // Dashboard summary
  getDashboardSummary(): DashboardSummary {
    const c = this.metrics.counters;
    const g = this.metrics.gauges;
    
    const validRate = c.claimsValidated > 0 
      ? c.claimsValid / c.claimsValidated 
      : 1;
    const cacheHitRate = c.wolframInvocations > 0
      ? c.cacheHits / c.wolframInvocations
      : 1;
    const costUsd = (c.wolframInvocations - c.cacheHits) * 0.02;
    
    return {
      status: this.determineStatus(),
      today: {
        claimsValidated: c.claimsValidated,
        validRate,
        wolframCalls: c.wolframInvocations,
        cacheHitRate,
        avgLatencyMs: this.calculateAverage(this.metrics.histograms.totalLatencyMs),
        costUsd
      },
      trends: {
        claimsChange: 0, // TODO: Compare with yesterday
        validRateChange: 0,
        costChange: 0
      },
      alerts: this.alerts.filter(a => !a.acknowledged),
      budget: {
        dailyUsed: 100 - g.budgetRemainingDaily,
        dailyLimit: 100,
        monthlyUsed: 2000 - g.budgetRemainingMonthly,
        monthlyLimit: 2000,
        projectedMonthlyUsage: this.projectMonthlyUsage()
      }
    };
  }
  
  private determineStatus(): 'healthy' | 'degraded' | 'error' {
    const c = this.metrics.counters;
    const g = this.metrics.gauges;
    
    if (g.budgetRemainingMonthly < 50) return 'error';
    if (c.wolframTimeouts > 10) return 'degraded';
    if (c.wolframFailures / (c.wolframInvocations || 1) > 0.1) return 'degraded';
    
    return 'healthy';
  }
  
  private projectMonthlyUsage(): number {
    const dayOfMonth = new Date().getDate();
    const dailyRate = (2000 - this.metrics.gauges.budgetRemainingMonthly) / dayOfMonth;
    return Math.round(dailyRate * 30);
  }
  
  // Prometheus export (OB-02)
  toPrometheusFormat(): string {
    const c = this.metrics.counters;
    const g = this.metrics.gauges;
    
    return `
# HELP forge_computational_claims_total Total claims validated
# TYPE forge_computational_claims_total counter
forge_computational_claims_total{status="valid"} ${c.claimsValid}
forge_computational_claims_total{status="invalid"} ${c.claimsInvalid}
forge_computational_claims_total{status="skipped"} ${c.claimsSkipped}

# HELP forge_computational_l1_total L1 validation results
# TYPE forge_computational_l1_total counter
forge_computational_l1_total{result="pass"} ${c.l1Passes}
forge_computational_l1_total{result="fail"} ${c.l1Failures}

# HELP forge_computational_wolfram_total Wolfram API calls
# TYPE forge_computational_wolfram_total counter
forge_computational_wolfram_total{result="success"} ${c.wolframSuccesses}
forge_computational_wolfram_total{result="failure"} ${c.wolframFailures}
forge_computational_wolfram_total{result="timeout"} ${c.wolframTimeouts}

# HELP forge_computational_cache_total Cache operations
# TYPE forge_computational_cache_total counter
forge_computational_cache_total{result="hit"} ${c.cacheHits}
forge_computational_cache_total{result="miss"} ${c.cacheMisses}

# HELP forge_computational_budget_remaining Remaining API budget
# TYPE forge_computational_budget_remaining gauge
forge_computational_budget_remaining{period="daily"} ${g.budgetRemainingDaily}
forge_computational_budget_remaining{period="monthly"} ${g.budgetRemainingMonthly}

# HELP forge_computational_cache_size Current cache size
# TYPE forge_computational_cache_size gauge
forge_computational_cache_size ${g.cacheSize}
    `.trim();
  }
  
  // Get raw metrics for API
  getMetrics(): ComputationalMetrics {
    return { ...this.metrics };
  }
  
  // Reset (for testing)
  reset() {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
  }
}

export const metricsCollector = MetricsCollector.getInstance();

// validators/computational/metrics-api.ts

import { Router, Request, Response } from 'express';
import { metricsCollector } from './metrics';

const router = Router();

/**
 * GET /api/forge/computational/metrics
 * Returns dashboard summary
 */
router.get('/metrics', (req: Request, res: Response) => {
  res.json(metricsCollector.getDashboardSummary());
});

/**
 * GET /api/forge/computational/metrics/raw
 * Returns raw metrics (for debugging)
 */
router.get('/metrics/raw', (req: Request, res: Response) => {
  res.json(metricsCollector.getMetrics());
});

/**
 * GET /api/forge/computational/metrics/prometheus
 * Returns Prometheus-format metrics
 */
router.get('/metrics/prometheus', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.toPrometheusFormat());
});

/**
 * POST /api/forge/computational/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  metricsCollector.acknowledgeAlert(req.params.id);
  res.json({ success: true });
});

export { router as metricsRouter };
```

### Verification

```bash
# Test metrics collection
pnpm test -- --grep "metrics"

# Test Prometheus export
curl http://localhost:3000/api/forge/computational/metrics/prometheus

# Test dashboard endpoint
curl http://localhost:3000/api/forge/computational/metrics | jq
```

### Done When
- [ ] Prometheus metrics exported (OB-02)
- [ ] Dashboard summary API working
- [ ] Budget tracking accurate
- [ ] Alert system functional
- [ ] Time series aggregation working
- [ ] Cache hit rate tracked

---

## Phase 2 Completion Checklist

- [ ] Task 2.1: Claim patterns for EVM and defense calculations
- [ ] Task 2.2: Evidence pack integration
- [ ] Task 2.3: Repair loop integration
- [ ] Task 2.4: Dashboard metrics
- [ ] All tests passing
- [ ] Integration test with FORGE convergence engine
- [ ] Documentation updated

**Next:** Phase 3 - Production Optimization
