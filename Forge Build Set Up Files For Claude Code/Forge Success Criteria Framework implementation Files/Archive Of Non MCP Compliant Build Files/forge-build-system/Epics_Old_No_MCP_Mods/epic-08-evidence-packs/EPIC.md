# Epic 8: Evidence Pack Builder

**Duration:** 3 days  
**Token Budget:** 40K tokens  
**Status:** Not Started  
**Dependencies:** Epic 4 (Convergence), Epic 7 (Test Generation)

---

## Epic Goal

Build the Evidence Pack system that creates auditable, compliance-ready documentation of every FORGE convergence session. This is the "proof" that satisfies GRC requirements.

---

## User Stories

### US-8.1: Evidence Collection During Convergence
**As a** compliance officer  
**I want** every convergence step recorded  
**So that** I have a complete audit trail

**Acceptance Criteria:**
- [ ] Capture all iteration inputs/outputs
- [ ] Record validation results
- [ ] Track token usage and costs
- [ ] Store timestamps for each step
- [ ] Maintain chain of custody

**Evidence Collector:**
```typescript
// packages/evidence-pack/src/collector.ts
export interface EvidenceRecord {
  timestamp: Date;
  type: EvidenceType;
  data: unknown;
  hash: string;  // SHA-256 of data for integrity
}

export type EvidenceType = 
  | 'session_start'
  | 'iteration_input'
  | 'llm_request'
  | 'llm_response'
  | 'validation_result'
  | 'iteration_complete'
  | 'session_complete';

export class EvidenceCollector {
  private records: EvidenceRecord[] = [];
  
  record(type: EvidenceType, data: unknown): void {
    const serialized = JSON.stringify(data);
    const hash = this.computeHash(serialized);
    
    this.records.push({
      timestamp: new Date(),
      type,
      data,
      hash,
    });
  }
  
  recordIteration(iteration: IterationRecord): void {
    this.record('iteration_input', {
      prompt: iteration.prompt,
      previousOutput: iteration.previousOutput,
    });
    
    this.record('llm_request', {
      model: iteration.model,
      maxTokens: iteration.maxTokens,
      temperature: iteration.temperature,
    });
    
    this.record('llm_response', {
      rawOutput: iteration.rawOutput,
      tokensUsed: iteration.tokensUsed,
      latencyMs: iteration.latencyMs,
    });
    
    this.record('validation_result', {
      valid: iteration.validation.valid,
      errors: iteration.validation.errors,
      warnings: iteration.validation.warnings,
    });
    
    this.record('iteration_complete', {
      iterationNumber: iteration.number,
      status: iteration.validation.valid ? 'passed' : 'failed',
    });
  }
  
  getRecords(): EvidenceRecord[] {
    return [...this.records];
  }
  
  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

---

### US-8.2: Evidence Pack Structure
**As a** auditor  
**I want** evidence organized in a standard format  
**So that** I can efficiently review convergence sessions

**Acceptance Criteria:**
- [ ] Standard directory structure
- [ ] Manifest file with index
- [ ] Human-readable summary
- [ ] Machine-readable data
- [ ] Cryptographic integrity verification

**Evidence Pack Structure:**
```typescript
// packages/evidence-pack/src/types.ts
export interface EvidencePack {
  version: '1.0.0';
  sessionId: string;
  contractId: string;
  projectId: string;
  
  metadata: EvidenceMetadata;
  summary: ExecutiveSummary;
  iterations: IterationEvidence[];
  validation: ValidationEvidence;
  artifacts: Artifact[];
  
  integrity: IntegrityManifest;
}

export interface EvidenceMetadata {
  createdAt: Date;
  completedAt: Date;
  environment: EnvironmentInfo;
  actor: ActorInfo;
  contractVersion: string;
}

export interface ExecutiveSummary {
  status: 'converged' | 'failed';
  iterationsRequired: number;
  totalTokens: number;
  totalCost: number;
  totalDuration: string;
  keyFindings: string[];
}

export interface IterationEvidence {
  number: number;
  timestamp: Date;
  input: {
    promptHash: string;
    promptLength: number;
  };
  output: {
    responseHash: string;
    responseLength: number;
    parsedSuccessfully: boolean;
  };
  validation: {
    passed: boolean;
    errorCount: number;
    warningCount: number;
    details: ValidationDetail[];
  };
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

export interface IntegrityManifest {
  algorithm: 'SHA-256';
  rootHash: string;  // Merkle root of all evidence
  fileHashes: Record<string, string>;
  signature?: string;  // Optional digital signature
}
```

**Directory Structure:**
```
evidence-pack-{session-id}/
├── manifest.json           # Index and integrity data
├── summary.md              # Human-readable summary
├── metadata.json           # Session metadata
├── iterations/
│   ├── 001/
│   │   ├── input.json
│   │   ├── output.json
│   │   └── validation.json
│   ├── 002/
│   └── ...
├── validation/
│   ├── final-result.json
│   └── validator-details/
├── artifacts/
│   ├── generated-code/
│   ├── test-results/
│   └── screenshots/
└── integrity.json          # Hash manifest
```

---

### US-8.3: Evidence Pack Generator
**As a** platform operator  
**I want** evidence packs generated automatically  
**So that** no manual documentation is needed

**Acceptance Criteria:**
- [ ] Generate from convergence session
- [ ] Include all artifacts
- [ ] Create summary report
- [ ] Compute integrity hashes
- [ ] Package as ZIP or directory

**Pack Generator:**
```typescript
// packages/evidence-pack/src/generator.ts
export class EvidencePackGenerator {
  async generate(session: ForgeSession, result: ConvergenceResult): Promise<EvidencePack> {
    const collector = session.evidence;
    const records = collector.getRecords();
    
    // Build iteration evidence
    const iterations = this.buildIterationEvidence(session.iterations);
    
    // Build validation evidence
    const validation = this.buildValidationEvidence(result);
    
    // Collect artifacts
    const artifacts = await this.collectArtifacts(session, result);
    
    // Generate summary
    const summary = this.generateSummary(session, result);
    
    // Build pack
    const pack: EvidencePack = {
      version: '1.0.0',
      sessionId: session.id,
      contractId: session.contractId,
      projectId: session.projectId,
      metadata: this.buildMetadata(session),
      summary,
      iterations,
      validation,
      artifacts,
      integrity: { algorithm: 'SHA-256', rootHash: '', fileHashes: {} },
    };
    
    // Compute integrity
    pack.integrity = this.computeIntegrity(pack);
    
    return pack;
  }
  
  private generateSummary(session: ForgeSession, result: ConvergenceResult): ExecutiveSummary {
    const totalTokens = session.iterations.reduce(
      (sum, i) => sum + i.tokensUsed.input + i.tokensUsed.output, 0
    );
    
    const totalCost = session.iterations.reduce(
      (sum, i) => sum + this.estimateCost(i.tokensUsed), 0
    );
    
    return {
      status: result.status === 'converged' ? 'converged' : 'failed',
      iterationsRequired: result.iterations,
      totalTokens,
      totalCost,
      totalDuration: this.formatDuration(
        session.completedAt.getTime() - session.startedAt.getTime()
      ),
      keyFindings: this.extractKeyFindings(session),
    };
  }
  
  private computeIntegrity(pack: EvidencePack): IntegrityManifest {
    const fileHashes: Record<string, string> = {};
    
    // Hash each section
    fileHashes['metadata.json'] = this.hashObject(pack.metadata);
    fileHashes['summary.json'] = this.hashObject(pack.summary);
    
    for (let i = 0; i < pack.iterations.length; i++) {
      fileHashes[`iterations/${i}.json`] = this.hashObject(pack.iterations[i]);
    }
    
    fileHashes['validation.json'] = this.hashObject(pack.validation);
    
    // Compute Merkle root
    const rootHash = this.computeMerkleRoot(Object.values(fileHashes));
    
    return {
      algorithm: 'SHA-256',
      rootHash,
      fileHashes,
    };
  }
}
```

---

### US-8.4: Evidence Pack Export Formats
**As a** compliance officer  
**I want** evidence in multiple formats  
**So that** I can use it in different systems

**Acceptance Criteria:**
- [ ] JSON export (machine-readable)
- [ ] Markdown report (human-readable)
- [ ] PDF report (formal documentation)
- [ ] ZIP archive (portable)
- [ ] S3-compatible upload

**Export Formatters:**
```typescript
// packages/evidence-pack/src/exporters/index.ts
export interface EvidenceExporter {
  export(pack: EvidencePack): Promise<ExportResult>;
}

// packages/evidence-pack/src/exporters/markdown.ts
export class MarkdownExporter implements EvidenceExporter {
  async export(pack: EvidencePack): Promise<ExportResult> {
    const content = this.generateMarkdown(pack);
    return { format: 'markdown', content, filename: 'evidence-report.md' };
  }
  
  private generateMarkdown(pack: EvidencePack): string {
    return `
# Evidence Pack: ${pack.sessionId}

## Executive Summary

| Metric | Value |
|--------|-------|
| Status | ${pack.summary.status} |
| Iterations | ${pack.summary.iterationsRequired} |
| Total Tokens | ${pack.summary.totalTokens.toLocaleString()} |
| Total Cost | $${pack.summary.totalCost.toFixed(4)} |
| Duration | ${pack.summary.totalDuration} |

### Key Findings
${pack.summary.keyFindings.map(f => `- ${f}`).join('\n')}

## Session Metadata

- **Session ID:** ${pack.sessionId}
- **Contract ID:** ${pack.contractId}
- **Project ID:** ${pack.projectId}
- **Started:** ${pack.metadata.createdAt}
- **Completed:** ${pack.metadata.completedAt}

## Iteration Details

${pack.iterations.map(i => this.formatIteration(i)).join('\n\n')}

## Validation Results

${this.formatValidation(pack.validation)}

## Integrity Verification

- **Algorithm:** ${pack.integrity.algorithm}
- **Root Hash:** \`${pack.integrity.rootHash}\`

---
*Generated by FORGE B-D Platform*
    `.trim();
  }
}

// packages/evidence-pack/src/exporters/pdf.ts
export class PDFExporter implements EvidenceExporter {
  async export(pack: EvidencePack): Promise<ExportResult> {
    const markdown = new MarkdownExporter().generateMarkdown(pack);
    const pdf = await this.markdownToPDF(markdown);
    return { format: 'pdf', content: pdf, filename: 'evidence-report.pdf' };
  }
}
```

---

### US-8.5: Evidence Search & Retrieval
**As a** auditor  
**I want** to search across evidence packs  
**So that** I can find specific sessions quickly

**Acceptance Criteria:**
- [ ] Index evidence packs for search
- [ ] Search by contract, project, date
- [ ] Filter by status, cost, iterations
- [ ] Full-text search in summaries
- [ ] API for programmatic access

**Search Interface:**
```typescript
// packages/evidence-pack/src/search.ts
export interface EvidenceSearchQuery {
  contractId?: string;
  projectId?: string;
  dateRange?: { from: Date; to: Date };
  status?: 'converged' | 'failed';
  minIterations?: number;
  maxIterations?: number;
  fullText?: string;
}

export class EvidenceSearchService {
  async search(query: EvidenceSearchQuery): Promise<EvidencePackSummary[]> {
    const results = await this.index.search(query);
    return results.map(r => this.toSummary(r));
  }
  
  async getById(sessionId: string): Promise<EvidencePack | null> {
    return this.storage.load(sessionId);
  }
  
  async verifyIntegrity(sessionId: string): Promise<IntegrityVerification> {
    const pack = await this.getById(sessionId);
    if (!pack) return { valid: false, reason: 'not_found' };
    
    const recomputed = this.recomputeIntegrity(pack);
    const matches = recomputed.rootHash === pack.integrity.rootHash;
    
    return {
      valid: matches,
      reason: matches ? 'verified' : 'hash_mismatch',
      details: this.compareHashes(pack.integrity, recomputed),
    };
  }
}
```

---

## Key Deliverables

```
packages/evidence-pack/
├── src/
│   ├── index.ts
│   ├── collector.ts        # Evidence collection during convergence
│   ├── generator.ts        # Pack generation
│   ├── types.ts            # Type definitions
│   ├── exporters/
│   │   ├── json.ts
│   │   ├── markdown.ts
│   │   ├── pdf.ts
│   │   └── zip.ts
│   ├── search.ts           # Search & retrieval
│   └── integrity.ts        # Hash computation
├── __tests__/
├── templates/
│   └── report.hbs
└── package.json
```

---

## Completion Criteria

- [ ] Evidence collection during convergence
- [ ] Pack generation with all sections
- [ ] Export to JSON, Markdown, PDF, ZIP
- [ ] Integrity verification working
- [ ] Search across packs
- [ ] Integration: Generate pack from ECR convergence session

---

## Handoff Context for Epic 10

**What Epic 10 needs:**
- Import: `import { EvidencePackGenerator, EvidencePack } from '@forge/evidence-pack'`
- Display packs in Platform UI
- Download functionality
- Search interface

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 8: Evidence Packs"
cd packages/evidence-pack

[ -f "src/collector.ts" ] || { echo "❌ collector.ts missing"; exit 1; }
[ -f "src/generator.ts" ] || { echo "❌ generator.ts missing"; exit 1; }
[ -f "src/exporters/pdf.ts" ] || { echo "❌ PDF exporter missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Epic 8 verification complete"
```
