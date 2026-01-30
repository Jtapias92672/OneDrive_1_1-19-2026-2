# CC Directive: Phase 5 - Dashboard Wiring
## Priority: HIGH | Sequence: After Testing Dashboard Module

**Prerequisite:** Testing Dashboard Module COMPLETE (commit 5bfb73e)
**Reference:** Vertical slice infrastructure in `packages/platform-ui/src/vertical-slice.ts`
**Tests Before:** 992 passing

---

## SESSION REQUIREMENTS

```bash
cat CLAUDE.md | head -50
cat .forge/skills/MANIFEST.md | head -30
```

**Confirm:**
```
=== SESSION START ===
Turn: 0
Protocols: CLAUDE.md ✅, MANIFEST.md ✅
Slop tests: After every code gen
Task: Phase 5 - Dashboard Wiring (connect UI to pipeline)
```

---

## OBJECTIVE

Connect the FORGE adaptive dashboard to the vertical slice pipeline so that:
1. "Import from Figma" button triggers real Figma→React→Mendix generation
2. Progress indicators show pipeline status during execution
3. Results display in dashboard when complete
4. Generated files are accessible for download

**Key Infrastructure Already Built:**
- `src/vertical-slice.ts` — Complete E2E proof script (Phases 1-4)
- `src/lib/integrations/figma/` — FigmaClient, FigmaParser
- `src/lib/generation/react-generator.ts` — ReactGenerator
- `src/lib/generation/mendix-generator.ts` — MendixGenerator
- `src/app/dashboard/page.tsx` — Main dashboard component

---

## DELIVERABLES

### 1. Pipeline Service (Backend)

**Location:** `packages/platform-ui/src/lib/api/pipeline/`

```typescript
// pipeline-types.ts
export interface PipelineConfig {
  figmaFileKey: string;
  figmaToken?: string; // If not using env
  outputFormat: 'react' | 'mendix' | 'both';
  useTailwind: boolean;
}

export interface PipelineStatus {
  runId: string;
  status: 'IDLE' | 'FETCHING' | 'PARSING' | 'GENERATING_REACT' | 'GENERATING_MENDIX' | 'VERIFYING' | 'COMPLETE' | 'FAILED';
  progress: number; // 0-100
  currentStep: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

export interface PipelineResult {
  runId: string;
  success: boolean;
  source: {
    fileKey: string;
    fileName: string;
    lastModified: string;
  };
  output: {
    reactComponents: number;
    mendixPages: number;
    mendixWidgets: number;
    scssLines: number;
  };
  files: GeneratedFile[];
  evidencePackId?: string;
}

export interface GeneratedFile {
  path: string;
  type: 'react' | 'mendix-page' | 'mendix-widget' | 'mendix-style' | 'json';
  size: number;
  downloadUrl: string;
}
```

```typescript
// pipeline-service.ts
import { FigmaClient } from '../../integrations/figma/figma-client';
import { FigmaParser } from '../../integrations/figma/figma-parser';
import { ReactGenerator } from '../../generation/react-generator';
import { MendixGenerator } from '../../generation/mendix-generator';
import { PipelineConfig, PipelineStatus, PipelineResult } from './pipeline-types';

export class PipelineService {
  private runs: Map<string, PipelineStatus> = new Map();

  async startPipeline(config: PipelineConfig): Promise<string> {
    const runId = `run-${Date.now()}`;
    this.runs.set(runId, {
      runId,
      status: 'FETCHING',
      progress: 0,
      currentStep: 'Connecting to Figma API...',
      startTime: new Date().toISOString(),
    });

    // Run pipeline async
    this.executePipeline(runId, config);
    return runId;
  }

  getStatus(runId: string): PipelineStatus | undefined {
    return this.runs.get(runId);
  }

  private async executePipeline(runId: string, config: PipelineConfig): Promise<void> {
    try {
      // Step 1: Fetch from Figma
      this.updateStatus(runId, 'FETCHING', 10, 'Fetching design from Figma...');
      const client = new FigmaClient({ accessToken: config.figmaToken || process.env.FIGMA_TOKEN! });
      const figmaFile = await client.getFile(config.figmaFileKey);

      // Step 2: Parse
      this.updateStatus(runId, 'PARSING', 30, 'Parsing Figma components...');
      const parser = new FigmaParser();
      const parsedDesign = parser.parse(figmaFile);

      // Step 3: Generate React
      if (config.outputFormat === 'react' || config.outputFormat === 'both') {
        this.updateStatus(runId, 'GENERATING_REACT', 50, 'Generating React components...');
        const reactGenerator = new ReactGenerator({ useTailwind: config.useTailwind });
        const reactComponents = reactGenerator.generate(parsedDesign);
        // Save files...
      }

      // Step 4: Generate Mendix
      if (config.outputFormat === 'mendix' || config.outputFormat === 'both') {
        this.updateStatus(runId, 'GENERATING_MENDIX', 70, 'Generating Mendix pages...');
        const mendixGenerator = new MendixGenerator({ moduleName: 'Generated', splitWidgets: true });
        const mendixOutput = mendixGenerator.generate(parsedDesign);
        // Save files...
      }

      // Step 5: Verify
      this.updateStatus(runId, 'VERIFYING', 90, 'Verifying outputs...');
      // Verification logic...

      // Complete
      this.updateStatus(runId, 'COMPLETE', 100, 'Pipeline complete');

    } catch (error) {
      this.updateStatus(runId, 'FAILED', 0, `Error: ${(error as Error).message}`);
    }
  }

  private updateStatus(runId: string, status: PipelineStatus['status'], progress: number, currentStep: string): void {
    const existing = this.runs.get(runId);
    if (existing) {
      this.runs.set(runId, { ...existing, status, progress, currentStep });
    }
  }
}
```

```typescript
// pipeline-routes.ts
// POST /api/pipeline/start - Start pipeline with config
// GET /api/pipeline/status/:runId - Get pipeline status
// GET /api/pipeline/result/:runId - Get pipeline result
// GET /api/pipeline/download/:runId/:fileId - Download generated file
// POST /api/pipeline/cancel/:runId - Cancel running pipeline
```

### 2. Dashboard Components

**Location:** `packages/platform-ui/src/components/pipeline/`

| Component | Purpose |
|-----------|---------|
| `FigmaImportCard.tsx` | "Import from Figma" UI with file key input |
| `PipelineProgressPanel.tsx` | Real-time progress indicator |
| `PipelineResultsPanel.tsx` | Display generated files with download links |
| `OutputPreview.tsx` | Preview generated React/Mendix code |

### 3. FigmaImportCard Component

```typescript
// FigmaImportCard.tsx
'use client';

import React, { useState } from 'react';

interface FigmaImportCardProps {
  onStartPipeline: (fileKey: string) => void;
  isRunning: boolean;
}

export function FigmaImportCard({ onStartPipeline, isRunning }: FigmaImportCardProps) {
  const [fileKey, setFileKey] = useState('');
  const [outputFormat, setOutputFormat] = useState<'react' | 'mendix' | 'both'>('both');

  const handleSubmit = () => {
    if (fileKey.trim()) {
      onStartPipeline(fileKey.trim());
    }
  };

  // Extract file key from Figma URL if pasted
  const handleInputChange = (value: string) => {
    // Handle both raw keys and full Figma URLs
    const match = value.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    setFileKey(match ? match[1] : value);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-teal-600 overflow-hidden mb-5">
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3.5 border-b border-teal-200">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FigmaIcon className="w-5 h-5 text-teal-600" />
          Import from Figma
        </h3>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-700 mb-1.5 block">
            Figma File Key or URL
          </label>
          <input
            type="text"
            value={fileKey}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste Figma URL or file key..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            disabled={isRunning}
          />
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-700 mb-1.5 block">
            Output Format
          </label>
          <div className="flex gap-2">
            {(['react', 'mendix', 'both'] as const).map((format) => (
              <button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                  outputFormat === format
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                disabled={isRunning}
              >
                {format === 'both' ? 'React + Mendix' : format}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!fileKey.trim() || isRunning}
          className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <LoaderIcon className="w-4 h-4 animate-spin" />
              Pipeline Running...
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              Generate Components
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

### 4. PipelineProgressPanel Component

```typescript
// PipelineProgressPanel.tsx
'use client';

import React from 'react';
import { PipelineStatus } from '../../lib/api/pipeline/pipeline-types';

interface PipelineProgressPanelProps {
  status: PipelineStatus | null;
}

const STEPS = [
  { id: 'FETCHING', label: 'Fetch from Figma', icon: '🔗' },
  { id: 'PARSING', label: 'Parse Design', icon: '🔍' },
  { id: 'GENERATING_REACT', label: 'Generate React', icon: '⚛️' },
  { id: 'GENERATING_MENDIX', label: 'Generate Mendix', icon: '🏗️' },
  { id: 'VERIFYING', label: 'Verify Output', icon: '✅' },
  { id: 'COMPLETE', label: 'Complete', icon: '🎉' },
];

export function PipelineProgressPanel({ status }: PipelineProgressPanelProps) {
  if (!status) return null;

  const currentIndex = STEPS.findIndex(s => s.id === status.status);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Pipeline Progress</h3>
        <span className="text-xs font-medium text-teal-600">{status.progress}%</span>
      </div>
      <div className="p-4">
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-teal-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isCurrent ? 'bg-teal-50 border border-teal-200' :
                  isComplete ? 'bg-green-50' : 'bg-slate-50'
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className={`text-sm ${
                  isCurrent ? 'font-semibold text-teal-700' :
                  isComplete ? 'text-green-700' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
                {isComplete && <CheckIcon className="w-4 h-4 text-green-500 ml-auto" />}
                {isCurrent && <LoaderIcon className="w-4 h-4 text-teal-600 animate-spin ml-auto" />}
              </div>
            );
          })}
        </div>

        {/* Current Step Detail */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600">{status.currentStep}</p>
        </div>

        {/* Error Display */}
        {status.status === 'FAILED' && status.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{status.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## IMPLEMENTATION STEPS

### Step 1: Types & Service (Turn 1-3)

```bash
mkdir -p packages/platform-ui/src/lib/api/pipeline
mkdir -p packages/platform-ui/src/components/pipeline
```

Create:
- `pipeline-types.ts`
- `pipeline-service.ts`
- `pipeline-routes.ts`
- `pipeline-routes.test.ts`

### Step 2: API Routes (Turn 4-5)

Wire routes to Next.js API:
- `src/app/api/pipeline/start/route.ts`
- `src/app/api/pipeline/status/[runId]/route.ts`
- `src/app/api/pipeline/result/[runId]/route.ts`

### Step 3: UI Components (Turn 6-8)

Create:
- `FigmaImportCard.tsx` + test
- `PipelineProgressPanel.tsx` + test
- `PipelineResultsPanel.tsx` + test
- `OutputPreview.tsx` + test

### Step 4: Dashboard Integration (Turn 9-10)

- Add FigmaImportCard to right panel of dashboard
- Wire to pipeline API
- Add polling for status updates
- Display results panel when complete

---

## INTEGRATION POINTS

Wire to existing infrastructure:

| Existing File | Usage |
|---------------|-------|
| `src/vertical-slice.ts` | Reference implementation (adapt for service) |
| `src/lib/integrations/figma/figma-client.ts` | Figma API access |
| `src/lib/integrations/figma/figma-parser.ts` | Parse Figma response |
| `src/lib/generation/react-generator.ts` | Generate React |
| `src/lib/generation/mendix-generator.ts` | Generate Mendix |
| `src/app/dashboard/page.tsx` | Add import card |

---

## ACCEPTANCE CRITERIA

| Criterion | Verification |
|-----------|--------------|
| Import card renders | Card visible in dashboard with input field |
| Pipeline starts | POST /api/pipeline/start returns runId |
| Progress updates | Status polling shows real-time updates |
| Results display | Generated files listed with download links |
| Real Figma data | Uses actual Figma API (requires FIGMA_TOKEN) |
| Tests added | Component tests for all new components |
| Build passes | `npm run build` exits 0 |
| V&V passes | `bash .forge/scripts/verify-testing-taxonomy.sh` exits 0 |

---

## V&V CHECKLIST

```bash
# After each step
bash .forge/slop-tests.sh
npm run build 2>&1 | tail -15
npm test 2>&1 | tail -20
npx tsc --noEmit
```

---

## ENVIRONMENT REQUIREMENTS

Ensure `.env` has:
```
FIGMA_TOKEN=your_figma_token
FIGMA_FILE_KEY=default_file_key (optional)
```

The pipeline should gracefully handle missing tokens by showing an error message in the UI.

---

## COMMIT PATTERN

```
feat(pipeline): Add pipeline service and types
feat(pipeline): Add API routes for pipeline execution
feat(pipeline): Add FigmaImportCard component
feat(pipeline): Add progress and results panels
feat(pipeline): Wire dashboard to pipeline API
```

---

## COMPLETION REPORT FORMAT

```
=== Verification Report ===
Task: Phase 5 - Dashboard Wiring
Protocol: verification-quality-library.skill

Build: ✅/❌
Tests: N/N passing (was 992)
Slop Tests: ✅/❌

Capabilities Proven:
1. Import card: [renders, accepts file key]
2. Pipeline API: [endpoints working]
3. Progress tracking: [real-time updates]
4. Results display: [files downloadable]

Files Created:
- pipeline-types.ts
- pipeline-service.ts
- pipeline-routes.ts
- FigmaImportCard.tsx
- PipelineProgressPanel.tsx
- PipelineResultsPanel.tsx
- [test files]

Commit: [hash]
Status: COMPLETE/NEEDS WORK/BLOCKED
```

---

## NOTES

- This phase wires existing, proven infrastructure to the UI
- The vertical-slice.ts script proves the pipeline works E2E
- Focus is on UI integration, not pipeline logic changes
- Real Figma API calls require valid FIGMA_TOKEN

---

*Directive created: 2026-01-27*
*Cowork Session Recovery*
