# Epic 12: End-to-End Testing & Demo

**Duration:** 5 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** All previous epics (this is the capstone)

---

## Epic Goal

Validate the complete FORGE B-D Platform with end-to-end tests proving the full flow works: Figma → Convergence → Generated Code → Tests → Deployed Application. Prepare demo environment and materials.

---

## User Stories

### US-12.1: Complete Flow E2E Test
**As a** platform developer  
**I want** E2E tests proving the full flow works  
**So that** I can confidently ship the platform

**Acceptance Criteria:**
- [ ] Test: Figma file → Parsed design
- [ ] Test: Parsed design → Converged React code
- [ ] Test: Generated code → Passing tests
- [ ] Test: Generated code → Deployed to AWS
- [ ] Complete flow under 30 minutes
- [ ] Token usage under 80K tokens

**E2E Test Suite:**
```typescript
// tests/e2e/complete-flow.spec.ts
import { test, expect } from '@playwright/test';
import { FigmaParser } from '@forge/figma-parser';
import { ForgeC } from '@forge/forge-c';
import { ReactGenerator } from '@forge/react-generator';
import { DeploymentExecutor } from '@forge/infrastructure';

test.describe('Complete FORGE Flow', () => {
  test('Figma → Deployed App in under 30 minutes', async () => {
    const startTime = Date.now();
    let totalTokens = 0;
    
    // Step 1: Parse Figma file
    console.log('Step 1: Parsing Figma file...');
    const parser = new FigmaParser();
    const design = await parser.parse({
      type: 'file',
      path: './fixtures/cmmc-dashboard.figma.json',
    });
    
    expect(design.pages.length).toBeGreaterThan(0);
    expect(design.components.length).toBeGreaterThan(0);
    console.log(`  ✓ Parsed ${design.pages.length} pages, ${design.components.length} components`);
    
    // Step 2: Run convergence for React code
    console.log('Step 2: Running convergence...');
    const forge = new ForgeC({
      providers: [{ type: 'anthropic', model: 'claude-sonnet-4-20250514' }],
    });
    
    const convergenceResult = await forge.converge({
      contractId: 'react-component-v1',
      input: { design },
      options: { maxIterations: 5 },
    });
    
    expect(convergenceResult.status).toBe('converged');
    totalTokens += convergenceResult.tokenUsage.total;
    console.log(`  ✓ Converged in ${convergenceResult.iterations} iterations`);
    console.log(`  ✓ Tokens used: ${convergenceResult.tokenUsage.total.toLocaleString()}`);
    
    // Step 3: Generate React code
    console.log('Step 3: Generating React code...');
    const generator = new ReactGenerator();
    const generated = await generator.generate(design, {
      typescript: true,
      tailwind: true,
      generateTests: true,
    });
    
    expect(generated.components.length).toBeGreaterThan(0);
    console.log(`  ✓ Generated ${generated.components.length} components`);
    
    // Step 4: Run generated tests
    console.log('Step 4: Running generated tests...');
    const testResult = await runGeneratedTests(generated);
    
    expect(testResult.passed).toBe(true);
    expect(testResult.coverage).toBeGreaterThan(80);
    console.log(`  ✓ Tests passed: ${testResult.passedCount}/${testResult.totalCount}`);
    console.log(`  ✓ Coverage: ${testResult.coverage}%`);
    
    // Step 5: Deploy to AWS (staging)
    console.log('Step 5: Deploying to AWS...');
    const deployer = new DeploymentExecutor();
    const deployResult = await deployer.deploy(generated, {
      environment: 'staging',
      dryRun: process.env.DRY_RUN === 'true',
    });
    
    expect(deployResult.status).toBe('success');
    console.log(`  ✓ Deployed to: ${deployResult.outputs?.url}`);
    
    // Validate time and token constraints
    const totalTime = (Date.now() - startTime) / 1000 / 60; // minutes
    
    console.log('\n=== Summary ===');
    console.log(`Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Deployment URL: ${deployResult.outputs?.url}`);
    
    expect(totalTime).toBeLessThan(30);
    expect(totalTokens).toBeLessThan(80000);
  });
});
```

---

### US-12.2: Performance Benchmarks
**As a** platform operator  
**I want** performance benchmarks  
**So that** I know the platform meets requirements

**Acceptance Criteria:**
- [ ] Measure convergence time per contract type
- [ ] Measure token usage per iteration
- [ ] Measure deployment time
- [ ] Track cost per generation
- [ ] Compare against baseline

**Benchmark Suite:**
```typescript
// tests/e2e/performance.spec.ts
test.describe('Performance Benchmarks', () => {
  const benchmarks: Benchmark[] = [];
  
  test('ECR contract convergence benchmark', async () => {
    const result = await runBenchmark({
      contractId: 'ecr-v1',
      iterations: 5,
    });
    
    benchmarks.push(result);
    
    expect(result.avgIterations).toBeLessThan(4);
    expect(result.avgTokens).toBeLessThan(20000);
    expect(result.avgDuration).toBeLessThan(60000); // 60 seconds
  });
  
  test('React component convergence benchmark', async () => {
    const result = await runBenchmark({
      contractId: 'react-component-v1',
      iterations: 5,
    });
    
    benchmarks.push(result);
    
    expect(result.avgIterations).toBeLessThan(5);
    expect(result.avgTokens).toBeLessThan(30000);
    expect(result.avgDuration).toBeLessThan(90000); // 90 seconds
  });
  
  test.afterAll(async () => {
    // Generate benchmark report
    await generateBenchmarkReport(benchmarks);
  });
});
```

---

### US-12.3: Load Testing
**As a** platform operator  
**I want** load tests  
**So that** I know the platform handles concurrent users

**Acceptance Criteria:**
- [ ] 10 concurrent convergence sessions
- [ ] No failures under load
- [ ] Graceful degradation
- [ ] Resource usage monitoring

**Load Test:**
```typescript
// tests/e2e/load.spec.ts
test.describe('Load Testing', () => {
  test('handles 10 concurrent convergence sessions', async () => {
    const sessions = Array(10).fill(null).map((_, i) => ({
      id: `load-test-${i}`,
      contractId: 'test-contract-v1',
      input: { index: i },
    }));
    
    const results = await Promise.all(
      sessions.map(session => 
        forge.converge(session).catch(e => ({ error: e.message }))
      )
    );
    
    const successful = results.filter(r => !('error' in r));
    const failed = results.filter(r => 'error' in r);
    
    console.log(`Successful: ${successful.length}/10`);
    console.log(`Failed: ${failed.length}/10`);
    
    expect(successful.length).toBeGreaterThanOrEqual(8); // 80% success rate
  });
});
```

---

### US-12.4: Demo Environment Setup
**As a** sales team member  
**I want** a demo environment ready  
**So that** I can show the platform to prospects

**Acceptance Criteria:**
- [ ] Staging environment with sample data
- [ ] Pre-loaded CMMC dashboard design
- [ ] Demo user accounts
- [ ] Reset capability
- [ ] Isolated from production

**Demo Setup Script:**
```bash
#!/bin/bash
# scripts/setup-demo.sh

echo "🚀 Setting up FORGE demo environment..."

# Deploy demo infrastructure
cd packages/infrastructure
pnpm cdk deploy DemoStack --require-approval never

# Seed database with sample data
cd ../platform-ui
pnpm prisma db seed --preview-feature

# Upload sample Figma files
echo "Uploading sample designs..."
node scripts/upload-demo-designs.js

# Create demo users
echo "Creating demo accounts..."
node scripts/create-demo-users.js

# Generate pre-built evidence packs
echo "Generating sample evidence packs..."
node scripts/generate-demo-evidence.js

echo "✅ Demo environment ready!"
echo "URL: https://demo.forge-platform.com"
echo "Login: demo@forge-platform.com / DemoPassword123!"
```

---

### US-12.5: Demo Script & Video
**As a** sales team member  
**I want** a demo script and video  
**So that** I can consistently demo the platform

**Acceptance Criteria:**
- [ ] Written demo script (15 minutes)
- [ ] Recorded demo video
- [ ] Highlight key value props
- [ ] Show complete flow
- [ ] Address common objections

**Demo Script Outline:**
```markdown
# FORGE B-D Platform Demo Script (15 minutes)

## Opening (2 min)
- "Let me show you how FORGE transforms your Figma designs into deployed, 
   compliant applications in under 30 minutes."
- Show the dashboard with recent projects

## Problem Statement (2 min)
- "Today, going from design to production takes weeks and involves multiple handoffs."
- "Each handoff introduces errors, compliance gaps, and delays."

## Live Demo (8 min)

### Step 1: Import Design (1 min)
- Open pre-loaded CMMC dashboard Figma file
- Click "Import from Figma"
- Show parsed components and tokens

### Step 2: Configure Convergence (1 min)
- Select "React + TypeScript" contract
- Show contract requirements
- Click "Start Convergence"

### Step 3: Watch Convergence (2 min)
- Show real-time progress
- Point out iteration improvements
- Highlight validation feedback

### Step 4: Review Generated Code (2 min)
- Show component structure
- Highlight TypeScript types
- Show accessibility attributes
- Show generated tests

### Step 5: Deploy (2 min)
- Click "Deploy to Staging"
- Show deployment progress
- Open deployed application

## Evidence Pack (2 min)
- "Now here's the magic for compliance..."
- Show evidence pack with complete audit trail
- Highlight iteration history
- Show integrity verification

## Closing (1 min)
- "Questions?"
- "Would you like to try it with one of your designs?"
```

---

## Key Deliverables

```
tests/e2e/
├── complete-flow.spec.ts    # Full Figma → AWS test
├── performance.spec.ts      # Benchmark tests
├── load.spec.ts             # Concurrent load tests
├── fixtures/
│   ├── cmmc-dashboard.figma.json
│   └── sample-contracts/
└── playwright.config.ts

demo/
├── scripts/
│   ├── setup-demo.sh
│   ├── reset-demo.sh
│   └── upload-demo-designs.js
├── demo-script.md
├── demo-video/
│   └── forge-demo-15min.mp4
└── sample-data/
    ├── designs/
    ├── evidence-packs/
    └── users.json
```

---

## Completion Criteria

- [ ] Complete flow test passes (Figma → Deployed app in <30 min)
- [ ] Performance meets targets (80K tokens, $5 cost)
- [ ] Load test passes (10 concurrent, no failures)
- [ ] Demo environment ready with CMMC dashboard
- [ ] 15-minute demo video recorded
- [ ] All epics integrated and working

---

## Final Platform Summary

After Epic 12, the FORGE B-D Platform delivers:

| Component | Status | Purpose |
|-----------|--------|---------|
| Answer Contract Engine | ✅ | Define output requirements |
| FORGE C Orchestrator | ✅ | LLM coordination |
| Convergence Engine | ✅ | Iterative refinement |
| Figma Parser | ✅ | Design extraction |
| React Generator | ✅ | Code generation |
| Test Generator | ✅ | Automated testing |
| Evidence Pack Builder | ✅ | Compliance documentation |
| Infrastructure | ✅ | AWS deployment |
| Platform UI | ✅ | Web interface |
| Integrations | ✅ | Figma, Jira, GitHub, Slack |
| E2E Tests | ✅ | Validation suite |

**Total Build Time:** 12 weeks  
**Total Token Budget:** ~610K tokens across all sessions

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 12: E2E Testing"

# Run complete E2E test
pnpm test:e2e || { echo "❌ E2E tests failed"; exit 1; }

# Run performance benchmarks
pnpm test:benchmark || { echo "❌ Benchmarks failed"; exit 1; }

# Verify demo environment
curl -s https://demo.forge-platform.com/health | jq .status | grep -q "ok" || {
  echo "❌ Demo environment not healthy"
  exit 1
}

# Check demo assets
[ -f "demo/demo-script.md" ] || { echo "❌ Demo script missing"; exit 1; }
[ -f "demo/demo-video/forge-demo-15min.mp4" ] || { echo "❌ Demo video missing"; exit 1; }

echo "✅ Epic 12 verification complete"
echo ""
echo "🎉 FORGE B-D Platform build complete!"
```
