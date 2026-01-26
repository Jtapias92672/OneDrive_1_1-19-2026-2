# Epic 8: Evidence Packs - Atomic Task Breakdown

**Token Budget:** 35K (LIMIT: 35K) ✅ SAFE  
**Tasks:** 8  
**Estimated Time:** 3 days  
**Dependencies:** Epic 4 (Convergence)

---

## Success Criteria Alignment

| Component | Reference | Alignment |
|-----------|-----------|-----------|
| **06_EVIDENCE_PACK** | `forge-success-criteria/06_EVIDENCE_PACK.md` | **PRIMARY** - All types and schemas |
| **05_CONVERGENCE_ENGINE** | `forge-success-criteria/05_CONVERGENCE_ENGINE.md` | Iteration history format |
| **09_DATA_PROTECTION** | `forge-success-criteria/09_DATA_PROTECTION.md` | PII redaction before storage |
| **11_OBSERVABILITY** | `forge-success-criteria/11_OBSERVABILITY.md` | Metrics integration |

**Acceptance Tests:** Inherit from 06_EVIDENCE_PACK criteria EP-01 through EP-10

---

## Overview

Epic 8 implements compliance evidence pack generation for audit trails, test reports, coverage reports, and CMMC evidence templates. **All schemas aligned with `forge-success-criteria/schemas/evidence-pack.schema.json`.**

---

## Phase 8.1: Package Setup

### Task 8.1.1: Create evidence-pack package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 06_EVIDENCE_PACK § File Structure

**Files to CREATE:**
- `packages/evidence-pack/src/schema/index.ts`
- `packages/evidence-pack/src/reports/index.ts`
- `packages/evidence-pack/src/compliance/index.ts`

**Done When:** Package structure created

---

### Task 8.1.2: Define evidence schema

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § Output Schema (CRITICAL ALIGNMENT)

**Files to CREATE:**
- `packages/evidence-pack/src/schema/types.ts`

**Purpose:** Types MUST match `forge-success-criteria/schemas/evidence-pack.schema.json` exactly.

**Implementation:**

```typescript
// packages/evidence-pack/src/schema/types.ts
// CANONICAL SOURCE: forge-success-criteria/schemas/evidence-pack.schema.json
// DO NOT MODIFY without updating the schema file first

/**
 * Evidence Pack - Complete audit artifact for FORGE convergence process
 * @see 06_EVIDENCE_PACK.md for acceptance criteria
 */
export interface EvidencePack {
  /** UUID v4 format */
  pack_id: string;
  
  /** Reference to originating task */
  task_id: string;
  
  /** ISO8601 timestamp */
  created_at: string;
  
  /** Contract and requester metadata */
  metadata: EvidenceMetadata;
  
  /** Timing information */
  timing: EvidenceTiming;
  
  /** Final convergence result */
  result: EvidenceResult;
  
  /** Per-iteration validation history */
  iterations: EvidenceIteration[];
  
  /** Budget utilization */
  budget: EvidenceBudget;
  
  /** Tamper-evidence signature */
  integrity: EvidenceIntegrity;
}

/** FROM 06_EVIDENCE_PACK § EP-04: Contract version recorded */
export interface EvidenceMetadata {
  contract_id: string;
  contract_version: string;  // Semver format
  contract_hash: string;     // SHA256 of contract used
  requester?: string;
  purpose?: string;
}

/** FROM 06_EVIDENCE_PACK § EP-06: Timestamps present */
export interface EvidenceTiming {
  started_at: string;   // ISO8601
  completed_at: string; // ISO8601
  total_duration_ms: number;
}

/** FROM 06_EVIDENCE_PACK § EP-05: Output hash included */
export interface EvidenceResult {
  status: 'SUCCESS' | 'STAGNATION' | 'BUDGET_EXHAUSTED' | 'TIMEOUT';
  final_score: number;  // 0.0 - 1.0
  passed: boolean;
  output_hash: string;  // SHA256, 64 hex chars
}

/** FROM 05_CONVERGENCE_ENGINE § Iteration History */
export interface EvidenceIteration {
  iteration_number: number;
  timestamp: string;  // ISO8601
  scores: {
    structural: number;
    semantic: number;
    qualitative: number;
    overall: number;
  };
  errors?: Array<{
    layer: 'structural' | 'semantic' | 'qualitative';
    path: string;
    message: string;
  }>;
  qualitative_reasoning?: Array<{
    criterion: string;
    reasoning: string;
    score: number;  // 1-5
    confidence: number;  // 0.0-1.0
  }>;
}

/** FROM 06_EVIDENCE_PACK § Budget tracking */
export interface EvidenceBudget {
  iterations_used: number;
  iterations_max: number;
  tokens_used: number;
  tokens_max: number;
}

/** FROM 06_EVIDENCE_PACK § EP-07: Tamper evidence */
export interface EvidenceIntegrity {
  signature: string;  // HMAC-SHA256
  algorithm: 'HMAC-SHA256';
  signed_fields: string[];
}

// ============================================================================
// Report Types (for report generation)
// ============================================================================

export interface TestReport {
  report_id: string;
  generated_at: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
  };
  test_results: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration_ms: number;
    error?: string;
  }>;
}

export interface CoverageReport {
  report_id: string;
  generated_at: string;
  summary: {
    lines: { covered: number; total: number; percentage: number };
    branches: { covered: number; total: number; percentage: number };
    functions: { covered: number; total: number; percentage: number };
  };
  files: Array<{
    path: string;
    lines: { covered: number; total: number };
    uncovered_lines: number[];
  }>;
}

export interface AuditEntry {
  timestamp: string;  // ISO8601
  actor: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  // FROM 09_DATA_PROTECTION: No PII in audit entries
  pii_redacted: boolean;
}
```

**Validation:** Run against JSON Schema
```bash
npx ajv validate -s forge-success-criteria/schemas/evidence-pack.schema.json -d test-pack.json
```

**Done When:** Types match schema, compile correctly

---

## Phase 8.2: Report Generation

### Task 8.2.1: Implement test execution reports

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § EP-01, EP-02

**Files to CREATE:**
- `packages/evidence-pack/src/reports/test-report.ts`

**Features:** Generate test execution summary with pass/fail aligned with Evidence Pack iterations.

**Implementation:**

```typescript
// packages/evidence-pack/src/reports/test-report.ts
import { TestReport } from '../schema/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
}

export function generateTestReport(results: TestResult[]): TestReport {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0),
  };

  return {
    report_id: uuidv4(),
    generated_at: new Date().toISOString(),
    summary,
    test_results: results,
  };
}

/**
 * Convert Evidence Pack iterations to test report format
 * @see 06_EVIDENCE_PACK § EP-01: Complete iteration history
 */
export function iterationsToTestReport(iterations: Array<{
  iteration_number: number;
  scores: { overall: number };
  errors?: Array<{ message: string }>;
}>): TestReport {
  const results: TestResult[] = iterations.map((iter, idx) => ({
    name: `Iteration ${iter.iteration_number}`,
    status: iter.scores.overall >= 0.95 ? 'passed' : 'failed',
    duration_ms: 0,  // Would need timing per iteration
    error: iter.errors?.map(e => e.message).join('; '),
  }));

  return generateTestReport(results);
}
```

**Done When:** Test reports generated with Evidence Pack compatibility

---

### Task 8.2.2: Implement coverage reports

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § EP-02 (all validation scores)

**Files to CREATE:**
- `packages/evidence-pack/src/reports/coverage-report.ts`

**Features:** Generate code coverage reports.

**Implementation:**

```typescript
// packages/evidence-pack/src/reports/coverage-report.ts
import { CoverageReport } from '../schema/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface FileCoverage {
  path: string;
  lines: { covered: number; total: number };
  branches: { covered: number; total: number };
  functions: { covered: number; total: number };
  uncovered_lines: number[];
}

export function generateCoverageReport(files: FileCoverage[]): CoverageReport {
  const totals = files.reduce(
    (acc, file) => ({
      lines: { 
        covered: acc.lines.covered + file.lines.covered, 
        total: acc.lines.total + file.lines.total 
      },
      branches: { 
        covered: acc.branches.covered + file.branches.covered, 
        total: acc.branches.total + file.branches.total 
      },
      functions: { 
        covered: acc.functions.covered + file.functions.covered, 
        total: acc.functions.total + file.functions.total 
      },
    }),
    { 
      lines: { covered: 0, total: 0 }, 
      branches: { covered: 0, total: 0 }, 
      functions: { covered: 0, total: 0 } 
    }
  );

  const percentage = (covered: number, total: number) => 
    total > 0 ? Math.round((covered / total) * 100) : 0;

  return {
    report_id: uuidv4(),
    generated_at: new Date().toISOString(),
    summary: {
      lines: { ...totals.lines, percentage: percentage(totals.lines.covered, totals.lines.total) },
      branches: { ...totals.branches, percentage: percentage(totals.branches.covered, totals.branches.total) },
      functions: { ...totals.functions, percentage: percentage(totals.functions.covered, totals.functions.total) },
    },
    files: files.map(f => ({
      path: f.path,
      lines: f.lines,
      uncovered_lines: f.uncovered_lines,
    })),
  };
}
```

**Done When:** Coverage reports generated

---

### Task 8.2.3: Implement validation reports

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § EP-02, EP-03 (reasoning traces)

**Files to CREATE:**
- `packages/evidence-pack/src/reports/validation-report.ts`

**Features:** Generate validation result summaries from Evidence Pack data.

**Implementation:**

```typescript
// packages/evidence-pack/src/reports/validation-report.ts
import { EvidenceIteration } from '../schema/types.js';

export interface ValidationReport {
  report_id: string;
  generated_at: string;
  iterations_summary: {
    total: number;
    converged: boolean;
    final_score: number;
  };
  layer_breakdown: {
    structural: { pass_rate: number; avg_score: number };
    semantic: { pass_rate: number; avg_score: number };
    qualitative: { pass_rate: number; avg_score: number };
  };
  error_summary: Array<{
    layer: string;
    message: string;
    occurrences: number;
  }>;
  // FROM 06_EVIDENCE_PACK § EP-03: Reasoning traces included
  qualitative_insights: Array<{
    criterion: string;
    final_score: number;
    reasoning_excerpt: string;
  }>;
}

export function generateValidationReport(
  iterations: EvidenceIteration[],
  target_score: number = 0.95
): ValidationReport {
  const { v4: uuidv4 } = require('uuid');
  
  const lastIteration = iterations[iterations.length - 1];
  const converged = lastIteration?.scores.overall >= target_score;
  
  // Calculate layer averages
  const avgScore = (layer: 'structural' | 'semantic' | 'qualitative') => {
    const scores = iterations.map(i => i.scores[layer]);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };
  
  const passRate = (layer: 'structural' | 'semantic' | 'qualitative', threshold: number = 0.8) => {
    const passed = iterations.filter(i => i.scores[layer] >= threshold).length;
    return passed / iterations.length;
  };
  
  // Aggregate errors
  const errorMap = new Map<string, { layer: string; count: number }>();
  for (const iter of iterations) {
    for (const error of iter.errors ?? []) {
      const key = `${error.layer}:${error.message}`;
      const existing = errorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorMap.set(key, { layer: error.layer, count: 1 });
      }
    }
  }
  
  // Extract qualitative insights from final iteration
  const qualitativeInsights = (lastIteration?.qualitative_reasoning ?? []).map(qr => ({
    criterion: qr.criterion,
    final_score: qr.score,
    reasoning_excerpt: qr.reasoning.slice(0, 200) + (qr.reasoning.length > 200 ? '...' : ''),
  }));

  return {
    report_id: uuidv4(),
    generated_at: new Date().toISOString(),
    iterations_summary: {
      total: iterations.length,
      converged,
      final_score: lastIteration?.scores.overall ?? 0,
    },
    layer_breakdown: {
      structural: { pass_rate: passRate('structural'), avg_score: avgScore('structural') },
      semantic: { pass_rate: passRate('semantic'), avg_score: avgScore('semantic') },
      qualitative: { pass_rate: passRate('qualitative'), avg_score: avgScore('qualitative') },
    },
    error_summary: Array.from(errorMap.entries()).map(([key, val]) => ({
      layer: val.layer,
      message: key.split(':')[1],
      occurrences: val.count,
    })),
    qualitative_insights,
  };
}
```

**Done When:** Validation reports generated with reasoning traces

---

## Phase 8.3: Compliance

### Task 8.3.1: Implement CMMC evidence templates

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § Security/Compliance Notes

**Files to CREATE:**
- `packages/evidence-pack/src/compliance/cmmc-templates.ts`

**Features:** CMMC 2.0 evidence document templates.

**Implementation:**

```typescript
// packages/evidence-pack/src/compliance/cmmc-templates.ts
// ALIGNED WITH: forge-success-criteria/06_EVIDENCE_PACK.md § Compliance Alignment

export interface CMMCEvidenceTemplate {
  practice_id: string;
  practice_name: string;
  level: 1 | 2 | 3;
  domain: string;
  evidence_type: 'policy' | 'procedure' | 'artifact' | 'log';
  description: string;
  required_fields: string[];
}

// CMMC 2.0 Level 2 practices relevant to FORGE
export const CMMC_TEMPLATES: CMMCEvidenceTemplate[] = [
  {
    practice_id: 'AC.L2-3.1.1',
    practice_name: 'Authorized Access Control',
    level: 2,
    domain: 'Access Control',
    evidence_type: 'log',
    description: 'Limit system access to authorized users',
    required_fields: ['user_id', 'action', 'timestamp', 'resource', 'authorization_status'],
  },
  {
    practice_id: 'AU.L2-3.3.1',
    practice_name: 'System Auditing',
    level: 2,
    domain: 'Audit and Accountability',
    evidence_type: 'log',
    description: 'Create and retain system audit logs',
    required_fields: ['timestamp', 'event_type', 'user_id', 'outcome', 'details'],
  },
  {
    practice_id: 'AU.L2-3.3.2',
    practice_name: 'Audit Review',
    level: 2,
    domain: 'Audit and Accountability',
    evidence_type: 'artifact',
    description: 'Review and analyze audit logs',
    required_fields: ['review_date', 'reviewer', 'findings', 'actions_taken'],
  },
  {
    practice_id: 'CM.L2-3.4.1',
    practice_name: 'Configuration Baselines',
    level: 2,
    domain: 'Configuration Management',
    evidence_type: 'artifact',
    description: 'Establish and maintain baseline configurations',
    required_fields: ['system_id', 'baseline_version', 'date_established', 'components'],
  },
  {
    practice_id: 'SC.L2-3.13.1',
    practice_name: 'Boundary Protection',
    level: 2,
    domain: 'System and Communications Protection',
    evidence_type: 'artifact',
    description: 'Monitor communications at system boundaries',
    required_fields: ['boundary_id', 'monitoring_method', 'events_captured'],
  },
];

export interface CMMCEvidenceDocument {
  document_id: string;
  template: CMMCEvidenceTemplate;
  generated_at: string;
  evidence_pack_ref: string;  // Link to EvidencePack.pack_id
  data: Record<string, unknown>;
  attestation: {
    attested_by: string;
    attested_at: string;
    statement: string;
  };
}

export function generateCMMCEvidence(
  template: CMMCEvidenceTemplate,
  evidencePackId: string,
  data: Record<string, unknown>,
  attestedBy: string
): CMMCEvidenceDocument {
  const { v4: uuidv4 } = require('uuid');
  
  // Validate required fields
  for (const field of template.required_fields) {
    if (!(field in data)) {
      throw new Error(`Missing required field for ${template.practice_id}: ${field}`);
    }
  }

  return {
    document_id: uuidv4(),
    template,
    generated_at: new Date().toISOString(),
    evidence_pack_ref: evidencePackId,
    data,
    attestation: {
      attested_by: attestedBy,
      attested_at: new Date().toISOString(),
      statement: `I attest that this evidence accurately represents the state of ${template.practice_name} as of the date indicated.`,
    },
  };
}
```

**Done When:** CMMC templates created

---

### Task 8.3.2: Implement audit trail

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 06_EVIDENCE_PACK § EP-06, EP-07, 09_DATA_PROTECTION § DP-06

**Files to CREATE:**
- `packages/evidence-pack/src/compliance/audit-trail.ts`

**Features:** Maintain chronological audit log with tamper evidence.

**Implementation:**

```typescript
// packages/evidence-pack/src/compliance/audit-trail.ts
// ALIGNED WITH: forge-success-criteria/06_EVIDENCE_PACK.md § Integrity, 09_DATA_PROTECTION.md § Audit Logging

import { createHmac } from 'crypto';
import { AuditEntry, EvidenceIntegrity } from '../schema/types.js';
import { privacyFilter } from './privacy-utils.js';

export class AuditTrail {
  private entries: AuditEntry[] = [];
  private readonly secretKey: Buffer;

  constructor(secretKey: string) {
    this.secretKey = Buffer.from(secretKey, 'hex');
  }

  /**
   * Add entry to audit trail
   * FROM 09_DATA_PROTECTION § EP-10: No raw PII
   */
  addEntry(entry: Omit<AuditEntry, 'timestamp' | 'pii_redacted'>): void {
    // Redact PII from details
    const redactedDetails = this.redactPII(entry.details);
    
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
      details: redactedDetails,
      pii_redacted: true,
    });
  }

  private redactPII(details: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        redacted[key] = privacyFilter(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactPII(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  /**
   * Generate integrity signature for Evidence Pack
   * FROM 06_EVIDENCE_PACK § EP-07: Tamper evidence
   */
  generateIntegrity(packId: string, outputHash: string, finalScore: number): EvidenceIntegrity {
    const signedFields = ['pack_id', 'output_hash', 'final_score', 'entries_count'];
    
    const dataToSign = JSON.stringify({
      pack_id: packId,
      output_hash: outputHash,
      final_score: finalScore,
      entries_count: this.entries.length,
    }, null, 0);  // Canonical JSON (no formatting)

    const signature = createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    return {
      signature,
      algorithm: 'HMAC-SHA256',
      signed_fields: signedFields,
    };
  }

  /**
   * Verify integrity of an Evidence Pack
   */
  verifyIntegrity(
    integrity: EvidenceIntegrity,
    packId: string,
    outputHash: string,
    finalScore: number,
    entriesCount: number
  ): boolean {
    const dataToSign = JSON.stringify({
      pack_id: packId,
      output_hash: outputHash,
      final_score: finalScore,
      entries_count: entriesCount,
    }, null, 0);

    const expectedSignature = createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return createHmac('sha256', this.secretKey)
      .update(integrity.signature)
      .digest('hex') === createHmac('sha256', this.secretKey)
      .update(expectedSignature)
      .digest('hex');
  }

  clear(): void {
    this.entries = [];
  }
}

// Privacy utility (simplified - would import from 09_DATA_PROTECTION implementation)
function privacyFilter(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
}

export { privacyFilter };
```

**Done When:** Audit trail works with tamper evidence and PII redaction

---

### Task 8.3.3: Implement ZIP export

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 06_EVIDENCE_PACK § EP-08 (JSON serializable), EP-09 (retrievable)

**Files to CREATE:**
- `packages/evidence-pack/src/compliance/zip-export.ts`
- `packages/evidence-pack/src/index.ts`

**Features:** Package all evidence into ZIP archive.

**Implementation:**

```typescript
// packages/evidence-pack/src/compliance/zip-export.ts
import JSZip from 'jszip';
import { EvidencePack, TestReport, CoverageReport, CMMCEvidenceDocument } from '../schema/types.js';
import { ValidationReport } from '../reports/validation-report.js';

export interface EvidenceBundle {
  evidencePack: EvidencePack;
  testReport?: TestReport;
  coverageReport?: CoverageReport;
  validationReport?: ValidationReport;
  cmmcDocuments?: CMMCEvidenceDocument[];
}

/**
 * Export evidence bundle as ZIP archive
 * FROM 06_EVIDENCE_PACK § EP-08: JSON serializable
 */
export async function exportToZip(bundle: EvidenceBundle): Promise<Buffer> {
  const zip = new JSZip();
  
  // Main evidence pack (JSON)
  zip.file(
    'evidence-pack.json',
    JSON.stringify(bundle.evidencePack, null, 2)
  );
  
  // Manifest
  const manifest = {
    pack_id: bundle.evidencePack.pack_id,
    task_id: bundle.evidencePack.task_id,
    created_at: bundle.evidencePack.created_at,
    contents: ['evidence-pack.json'],
    integrity: bundle.evidencePack.integrity,
  };
  
  // Optional reports
  if (bundle.testReport) {
    zip.file('reports/test-report.json', JSON.stringify(bundle.testReport, null, 2));
    manifest.contents.push('reports/test-report.json');
  }
  
  if (bundle.coverageReport) {
    zip.file('reports/coverage-report.json', JSON.stringify(bundle.coverageReport, null, 2));
    manifest.contents.push('reports/coverage-report.json');
  }
  
  if (bundle.validationReport) {
    zip.file('reports/validation-report.json', JSON.stringify(bundle.validationReport, null, 2));
    manifest.contents.push('reports/validation-report.json');
  }
  
  // CMMC documents
  if (bundle.cmmcDocuments && bundle.cmmcDocuments.length > 0) {
    for (const doc of bundle.cmmcDocuments) {
      const filename = `cmmc/${doc.template.practice_id}.json`;
      zip.file(filename, JSON.stringify(doc, null, 2));
      manifest.contents.push(filename);
    }
  }
  
  // Add manifest
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Extract evidence bundle from ZIP archive
 * FROM 06_EVIDENCE_PACK § EP-09: Retrievable by task_id
 */
export async function importFromZip(zipBuffer: Buffer): Promise<EvidenceBundle> {
  const zip = await JSZip.loadAsync(zipBuffer);
  
  const evidencePackJson = await zip.file('evidence-pack.json')?.async('string');
  if (!evidencePackJson) {
    throw new Error('Invalid evidence bundle: missing evidence-pack.json');
  }
  
  const bundle: EvidenceBundle = {
    evidencePack: JSON.parse(evidencePackJson),
  };
  
  // Load optional reports
  const testReportJson = await zip.file('reports/test-report.json')?.async('string');
  if (testReportJson) bundle.testReport = JSON.parse(testReportJson);
  
  const coverageReportJson = await zip.file('reports/coverage-report.json')?.async('string');
  if (coverageReportJson) bundle.coverageReport = JSON.parse(coverageReportJson);
  
  const validationReportJson = await zip.file('reports/validation-report.json')?.async('string');
  if (validationReportJson) bundle.validationReport = JSON.parse(validationReportJson);
  
  // Load CMMC documents
  const cmmcFiles = Object.keys(zip.files).filter(f => f.startsWith('cmmc/'));
  if (cmmcFiles.length > 0) {
    bundle.cmmcDocuments = [];
    for (const filename of cmmcFiles) {
      const content = await zip.file(filename)?.async('string');
      if (content) bundle.cmmcDocuments.push(JSON.parse(content));
    }
  }
  
  return bundle;
}
```

```typescript
// packages/evidence-pack/src/index.ts
// Main package exports

// Schema types (ALIGNED WITH forge-success-criteria/schemas/evidence-pack.schema.json)
export * from './schema/types.js';

// Report generators
export { generateTestReport, iterationsToTestReport } from './reports/test-report.js';
export { generateCoverageReport } from './reports/coverage-report.js';
export { generateValidationReport } from './reports/validation-report.js';

// Compliance
export { CMMC_TEMPLATES, generateCMMCEvidence } from './compliance/cmmc-templates.js';
export { AuditTrail } from './compliance/audit-trail.js';
export { exportToZip, importFromZip } from './compliance/zip-export.js';

// Re-export types for convenience
export type {
  EvidencePack,
  EvidenceMetadata,
  EvidenceTiming,
  EvidenceResult,
  EvidenceIteration,
  EvidenceBudget,
  EvidenceIntegrity,
  TestReport,
  CoverageReport,
  AuditEntry,
  CMMCEvidenceTemplate,
  CMMCEvidenceDocument,
} from './schema/types.js';
```

**Verification:**
```bash
cd packages/evidence-pack && pnpm build
npx ajv validate -s ../../forge-success-criteria/schemas/evidence-pack.schema.json -d test-output.json
```

**Done When:** ZIP export works and all exports available, schema validation passes

---

## Epic 8 Completion Checklist

Before moving to Epic 9:

- [ ] All 8 tasks marked [x] in progress.md
- [ ] Types match `forge-success-criteria/schemas/evidence-pack.schema.json` (Task 8.1.2)
- [ ] Test reports include iteration data (06_EVIDENCE_PACK § EP-01)
- [ ] All validation scores captured (06_EVIDENCE_PACK § EP-02)
- [ ] Reasoning traces included (06_EVIDENCE_PACK § EP-03)
- [ ] Contract version recorded (06_EVIDENCE_PACK § EP-04)
- [ ] Output hash present and verifiable (06_EVIDENCE_PACK § EP-05)
- [ ] All timestamps ISO8601 (06_EVIDENCE_PACK § EP-06)
- [ ] Tamper evidence with HMAC-SHA256 (06_EVIDENCE_PACK § EP-07)
- [ ] JSON serializable round-trip (06_EVIDENCE_PACK § EP-08)
- [ ] No raw PII in exports (09_DATA_PROTECTION alignment)
- [ ] ZIP export packages everything

**Schema Validation:**
```bash
# Validate generated evidence pack against schema
node -e "
const pack = require('./test-evidence-pack.json');
const Ajv = require('ajv');
const schema = require('../../forge-success-criteria/schemas/evidence-pack.schema.json');
const ajv = new Ajv();
const valid = ajv.validate(schema, pack);
console.log('Schema valid:', valid);
if (!valid) console.log(ajv.errors);
"
```

**Commit:** `git commit -m "Epic 8: Evidence Packs - aligned with 06_EVIDENCE_PACK schema"`

**Next:** Epic 9 - Infrastructure
