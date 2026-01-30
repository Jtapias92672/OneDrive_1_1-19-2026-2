# VERTICAL SLICE DIRECTIVE
## Priority: CRITICAL | Type: Implementation | V&V: Epic 7.5

---

## SESSION START REQUIREMENTS

**Before ANY work, execute:**
```bash
cat CLAUDE.md | head -50
cat .forge/skills/MANIFEST.md | head -30
```

**Confirm in first response:**
```
=== SESSION START ===
Turn: 0
Protocols: CLAUDE.md ✅, MANIFEST.md ✅
10-turn rule: Acknowledged
Slop tests: Will run after code gen
Task: Vertical Slice - Real Figma → React Pipeline
```

**Load Required Skills:**
```bash
cat .forge/skills/verification-quality-library.skill | head -100
cat .forge/skills/api-contracts.skill | head -50
```

---

## TOKEN GUIDELINES (MANDATORY)

| Type | Limit | Enforcement |
|------|-------|-------------|
| Response to user | <500 preferred, <800 max | Hard stop at 800 |
| Code blocks | Focused, single-purpose | No mega-files |
| Command output | See table below | Always tail/head |

### Command Output Guardrails

| Command | Max Lines | Pattern |
|---------|-----------|---------|
| `npm test` | 20 lines | `\| tail -20` |
| `npm run build` | 15 lines | `\| tail -15` |
| `curl` output | 30 lines | `\| head -30` |
| File reads | 100 lines | Use line ranges |
| `git diff` | stat only | `--stat` |

**VIOLATION = CONTEXT BLOWOUT = SESSION DEATH**

### Turn Counting

Track in **every response**: `[Turn N/10]`

At Turn 10: STOP → Execute compaction → Reset to Turn 0

---

## CREDENTIAL SECURITY (CRITICAL)

### Figma API Token
```bash
# Set as environment variable - NEVER hardcode in source files
export FIGMA_TOKEN="figd_YOUR_TOKEN_HERE"
```

### Token Handling Rules

| ✅ DO | ❌ DO NOT |
|-------|-----------|
| Use `process.env.FIGMA_TOKEN` | Hardcode token in source |
| Validate token exists at startup | Commit tokens to git |
| Log "token present: yes/no" | Log actual token value |
| Store in `.env` (gitignored) | Store in any tracked file |

### Required .env Setup
```bash
# Create .env file (already in .gitignore)
echo 'FIGMA_TOKEN=figd_YOUR_TOKEN_HERE' >> .env

# Install dotenv if not present
npm install dotenv --save-dev
```

### Code Pattern for Token Access
```typescript
import 'dotenv/config';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

if (!FIGMA_TOKEN) {
  throw new Error('FIGMA_TOKEN environment variable required. See .env.example');
}

// Log presence, not value
console.log(`Figma token configured: ${FIGMA_TOKEN ? 'yes' : 'no'}`);
```

---

## THE PROBLEM

Current state of `figma-client.ts`:
```typescript
async getFile(fileKey: string): Promise<FigmaFile> {
  // TODO: Implement real API call
  throw new Error('Not implemented: Real Figma API integration pending');
}
```

**870 tests pass against MockFigmaClient. Zero real API calls exist.**

---

## THE MISSION

**ONE workflow, end-to-end, with REAL data:**

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT                                                          │
│  Figma File: POC_Test_Design                                    │
│  File Key: 6GefaVgI8xnuDIHhSbfzsJ                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Real Figma API Call                                    │
│  GET https://api.figma.com/v1/files/6GefaVgI8xnuDIHhSbfzsJ      │
│  Header: X-Figma-Token: ${process.env.FIGMA_TOKEN}              │
│                                                                 │
│  PROOF: Console logs actual API response metadata               │
│  PROOF: JSON file saved with real component tree                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Real Parsing                                           │
│  Input: Figma API response (real JSON)                          │
│  Output: Parsed component structure                             │
│                                                                 │
│  PROOF: Logs show actual component names from the file          │
│  PROOF: No hardcoded/mock data in output                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Real Code Generation                                   │
│  Input: Parsed components                                       │
│  Output: React components (.tsx files)                          │
│                                                                 │
│  PROOF: Generated files match actual Figma component names      │
│  PROOF: Styles extracted from actual Figma properties           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT                                                         │
│  Location: /Users/jtapiasme.com/Documents/React/code export/    │
│  Files: Real .tsx components generated from POC_Test_Design     │
└─────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION STEPS

### Step 1: Fix figma-client.ts

**File:** `packages/platform-ui/src/lib/integrations/figma/figma-client.ts`

Replace stub methods with real HTTP calls:

```typescript
import 'dotenv/config';

export class FigmaClient implements IFigmaClient {
  private config: FigmaClientConfig;
  private baseUrl: string;

  constructor(config: FigmaClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.figma.com/v1';

    if (!config.accessToken) {
      throw new Error('Figma access token required');
    }
  }

  async getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile> {
    const url = new URL(`${this.baseUrl}/files/${fileKey}`);

    if (options?.version) url.searchParams.set('version', options.version);
    if (options?.depth) url.searchParams.set('depth', options.depth.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'X-Figma-Token': this.config.accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Figma API ${response.status}: ${error}`);
    }

    return response.json() as Promise<FigmaFile>;
  }

  // Implement remaining methods similarly...
}
```

### Step 2: Create vertical-slice.ts

**File:** `packages/platform-ui/src/vertical-slice.ts`

```typescript
#!/usr/bin/env npx ts-node
/**
 * FORGE Vertical Slice - Proof of Real Integration
 * Run: FIGMA_TOKEN=xxx npx ts-node src/vertical-slice.ts
 */
import 'dotenv/config';
import { FigmaClient } from './lib/integrations/figma/figma-client';
import * as fs from 'fs';
import * as path from 'path';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = '6GefaVgI8xnuDIHhSbfzsJ';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './vertical-slice-output';

async function main() {
  // Validate token (presence only, never log value)
  if (!FIGMA_TOKEN) {
    console.error('ERROR: FIGMA_TOKEN environment variable required');
    console.error('Set via: export FIGMA_TOKEN=your_token');
    process.exit(1);
  }
  console.log('Token configured: yes');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           FORGE VERTICAL SLICE - REAL DATA TEST            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Real API Call
  console.log('STEP 1: Calling Figma API...');
  const client = new FigmaClient({ accessToken: FIGMA_TOKEN });

  const figmaFile = await client.getFile(FILE_KEY);
  console.log(`  ✓ Retrieved: "${figmaFile.name}"`);
  console.log(`  ✓ Last modified: ${figmaFile.lastModified}`);
  console.log(`  ✓ Components: ${Object.keys(figmaFile.components || {}).length}`);

  // Save proof
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'figma-api-response.json'),
    JSON.stringify(figmaFile, null, 2)
  );
  console.log('  ✓ Saved: figma-api-response.json\n');

  // Step 2: Parse
  console.log('STEP 2: Parsing document...');
  const frames = findFrames(figmaFile.document);
  console.log(`  ✓ Found ${frames.length} top-level frames`);
  frames.slice(0, 5).forEach(f => console.log(`    - ${f.name}`));

  // Step 3: Generate
  console.log('\nSTEP 3: Generating React components...');
  for (const frame of frames) {
    const name = sanitize(frame.name);
    const code = generateComponent(frame);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.tsx`), code);
    console.log(`  ✓ Generated: ${name}.tsx`);
  }

  console.log('\n✅ VERTICAL SLICE COMPLETE');
  console.log(`Output: ${OUTPUT_DIR}`);
}

function findFrames(node: any): any[] {
  const frames: any[] = [];
  function traverse(n: any) {
    if (n.type === 'FRAME' || n.type === 'COMPONENT') frames.push(n);
    else if (n.children) n.children.forEach(traverse);
  }
  if (node.children?.[0]?.children) node.children[0].children.forEach(traverse);
  return frames;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^(\d)/, '_$1') || 'Component';
}

function generateComponent(frame: any): string {
  const name = sanitize(frame.name);
  const { width = 400, height = 300 } = frame.absoluteBoundingBox || {};
  return `// Generated from Figma: "${frame.name}"
import React from 'react';

export const ${name}: React.FC = () => (
  <div style={{ width: ${Math.round(width)}, height: ${Math.round(height)} }}>
    <h2>${frame.name}</h2>
  </div>
);

export default ${name};
`;
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
```

### Step 3: Run and Verify

```bash
# From packages/platform-ui/
npx ts-node src/vertical-slice.ts 2>&1 | tail -30
```

---

## VERIFICATION & VALIDATION (Epic 7.5)

**After implementation, run full V&V:**

### 1. Slop Tests (Mandatory after code gen)
```bash
bash .forge/slop-tests.sh
```

### 2. Unit Tests
```bash
npm run test:unit 2>&1 | tail -20
```

### 3. Build Verification
```bash
npm run build 2>&1 | tail -15
```

### 4. Epic 7.5 Testing Taxonomy
```bash
# Run verification script
bash .forge/scripts/verify-testing-taxonomy.sh 2>&1 | tail -30
```

### 5. Full Test Suite
```bash
npm run test:regression 2>&1 | tail -20
```

---

## ACCEPTANCE CRITERIA

| Criterion | How to Verify | Pass/Fail |
|-----------|---------------|-----------|
| Token secured | `grep -r "figd_" src/` returns nothing | |
| API call works | `figma-api-response.json` has real data | |
| Parsing works | Console shows component names from POC_Test_Design | |
| Generation works | `.tsx` files exist with matching names | |
| Slop tests pass | `bash .forge/slop-tests.sh` exits 0 | |
| TypeScript compiles | `npx tsc --noEmit` exits 0 | |
| Tests pass | `npm test` exits 0 | |

---

## COMPLETION REPORT FORMAT

When complete, provide:

```
=== Verification Report ===
Task: Vertical Slice - Real Figma → React Pipeline
Protocol: verification-quality-library.skill

Build: ✅/❌
Tests: N/N passing
Slop Tests: ✅/❌

Capabilities Proven:
1. Real Figma API call: [evidence]
2. Real parsing: [evidence]
3. Real code generation: [evidence]
4. Token security: [evidence]

Files Created/Modified:
- figma-client.ts (real implementation)
- vertical-slice.ts (proof script)
- [generated .tsx files]

Commit: [hash]
Status: COMPLETE/NEEDS WORK/BLOCKED
```

---

## SKILLS REFERENCE

**Load before starting:**
- `.forge/skills/verification-quality-library.skill` - V&V patterns
- `.forge/skills/api-contracts.skill` - API integration patterns
- `.forge/skills/deterministic-scripts.skill` - Script patterns

**Consult for issues:**
- `.forge/skills/4-phase-root-cause.skill` - Debug failures
- `.forge/LESSONS_LEARNED.md` - Past mistakes to avoid

---

## WHAT SUCCESS LOOKS LIKE

Joe runs:
```bash
export FIGMA_TOKEN=xxx
npx ts-node src/vertical-slice.ts
```

And sees:
1. Real file name from Figma API (not mock)
2. Real component count (not hardcoded)
3. Real `.tsx` files generated
4. Files compile and could render

**Not tests. Not mocks. Real working software.**
