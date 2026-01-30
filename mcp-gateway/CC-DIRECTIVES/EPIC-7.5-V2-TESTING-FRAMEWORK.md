# FORGE Testing Framework - Epic 7.5 v2

**Date:** 2026-01-28
**Version:** 2.1 - Formal Test Hierarchy + Functional Verification

---

## TESTING PHILOSOPHY

> "Focus on code functionality, verify and validate as a guiding light, not the number of tests"

**Success = Capabilities proven working, NOT coverage percentages**

---

## FORMAL TEST HIERARCHY

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FULL REGRESSION TEST                            │
│  (Extensive E2E + All Unit Tests + All Story Test Cases)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    E2E TESTS (System Level)                     │   │
│   │    - Grows more complex each Sprint as code develops            │   │
│   │    - Run by Tester                                              │   │
│   │    - Tests complete user workflows end-to-end                   │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                                                                 │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │            STORY TEST CASES (Per Story)                 │   │   │
│   │   │    - Created each Sprint by Tester                      │   │   │
│   │   │    - Tests acceptance criteria for each story           │   │   │
│   │   ├─────────────────────────────────────────────────────────┤   │   │
│   │   │                                                         │   │   │
│   │   │   ┌─────────────────────────────────────────────────┐   │   │   │
│   │   │   │          UNIT TESTS (Per Story)                 │   │   │   │
│   │   │   │    - Created each Sprint by Developer           │   │   │   │
│   │   │   │    - Tests individual functions/methods         │   │   │   │
│   │   │   └─────────────────────────────────────────────────┘   │   │   │
│   │   │                                                         │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TEST TYPES DEFINED

### 1. Unit Tests
**Owner:** Developer
**Frequency:** Every Story, Every Sprint
**Scope:** Individual functions, methods, classes
**Location:** `__tests__/*.test.ts`, `tests/unit/*.test.ts`

```typescript
// Example: Unit test for service-builder
describe('ServiceBuilder.buildCreateMethod', () => {
  it('should generate create method with transaction when useTransactions: true', () => {
    const output = builder.buildCreateMethod(entity, { useTransactions: true });
    expect(output).toContain('$transaction');
  });
});
```

### 2. Story Test Cases
**Owner:** Tester
**Frequency:** Every Story, Every Sprint
**Scope:** Acceptance criteria for user stories
**Location:** `tests/stories/*.test.ts`

```typescript
// Example: Story test for "As a user, I can generate a controller"
describe('Story: Generate Controller from Entity', () => {
  it('should generate CRUD endpoints for User entity', () => {
    const entity = { name: 'User', fields: [...] };
    const controller = generator.generateController(entity);

    // Acceptance criteria verification
    expect(controller).toContainEndpoint('GET /users');
    expect(controller).toContainEndpoint('POST /users');
    expect(controller).toContainEndpoint('PUT /users/:id');
    expect(controller).toContainEndpoint('DELETE /users/:id');
  });
});
```

### 3. E2E Tests (System Level)
**Owner:** Tester
**Frequency:** Every Sprint (grows in complexity)
**Scope:** Complete user workflows, system integration
**Location:** `tests/e2e/*.test.ts`

```typescript
// Example: E2E test for code generation pipeline
describe('E2E: Figma to Deployed Code', () => {
  it('should complete full generation pipeline', async () => {
    // 1. Parse Figma design
    const design = await figmaClient.getFile('file-id');

    // 2. Generate React components
    const components = await reactGenerator.generate(design);
    expect(components).toBeValidTypeScript();

    // 3. Generate Mendix artifacts
    const mendix = await mendixGenerator.generate(design);
    expect(mendix.pages).toHaveLength(7);

    // 4. Verify deployment readiness
    expect(components).toPassLinting();
    expect(mendix).toBeDeployable();
  });
});
```

### 4. Smoke Test
**Definition:** Limited E2E test
**Purpose:** Quick verification that critical paths work
**When:** After deployment, before full regression

```typescript
describe('Smoke: Critical Paths', () => {
  it('should parse a Figma file', async () => { ... });
  it('should generate React component', async () => { ... });
  it('should connect to database', async () => { ... });
});
```

### 5. Sanity Test
**Definition:** Partial E2E test
**Purpose:** Check all major parts of system work
**When:** Before release candidate

```typescript
describe('Sanity: Major System Parts', () => {
  describe('Figma Integration', () => { ... });
  describe('Code Generation', () => { ... });
  describe('Deployment', () => { ... });
  describe('Governance', () => { ... });
});
```

### 6. Full Regression Test
**Definition:** ALL tests combined
**Contents:**
- ✅ All Unit Tests
- ✅ All Story Test Cases
- ✅ Extensive E2E Tests
- ✅ Smoke Tests
- ✅ Sanity Tests

**When:** Before major release, after significant changes

---

## FUNCTIONAL VERIFICATION APPROACH

### Principle
Every test must verify **capability**, not just **coverage**.

### For Code Generators

| Generator | Capability | Config | Expected Output |
|-----------|------------|--------|-----------------|
| controller-builder | Hard delete | `useSoftDelete: false` | `.delete(id)` not `.softDelete(id)` |
| controller-builder | No validation | `validationLibrary: 'none'` | `create(req.body)` not `.parse()` |
| route-builder | Default auth | `authMethod: 'jwt'` | `authenticate` middleware |
| service-builder | No transactions | `useTransactions: false` | No `$transaction` wrapper |
| service-builder | Hard delete | `useSoftDelete: false` | No `deletedAt` filters |

### Verification Method

```typescript
describe('Capability: Hard Delete', () => {
  it('should generate .delete() call when useSoftDelete is false', () => {
    const builder = new ControllerBuilder({ useSoftDelete: false });
    const output = builder.build(testEntity);

    // FUNCTIONAL verification - prove the capability works
    expect(output).toContain('.delete(id)');
    expect(output).not.toContain('.softDelete(id)');
    expect(output).not.toContain('deletedAt');

    // Bonus: Verify generated code is valid TypeScript
    expect(() => ts.transpile(output)).not.toThrow();
  });
});
```

---

## FORGE TEST SUITE STRUCTURE

```
mcp-gateway/
├── tests/
│   ├── unit/                    # Unit tests (Developer)
│   │   ├── jwt-validation.test.ts
│   │   ├── secret-metrics.test.ts
│   │   └── ...
│   ├── stories/                 # Story test cases (Tester) [TO CREATE]
│   │   ├── generate-controller.story.test.ts
│   │   └── ...
│   ├── e2e/                     # E2E tests (Tester) [TO CREATE]
│   │   ├── figma-to-code.e2e.test.ts
│   │   ├── full-pipeline.e2e.test.ts
│   │   └── ...
│   ├── smoke/                   # Smoke tests [TO CREATE]
│   │   └── critical-paths.smoke.test.ts
│   └── sanity/                  # Sanity tests [TO CREATE]
│       └── system-health.sanity.test.ts
├── packages/
│   ├── express-generator/
│   │   └── __tests__/           # Package unit tests
│   └── platform-ui/
│       └── src/__tests__/       # UI unit tests
```

---

## CURRENT TEST STATUS

### Verified Passing (Epic 7.5 v2)

| Suite | Tests | Status |
|-------|-------|--------|
| mcp-gateway (unit) | 1090 | ✅ PASS |
| express-generator | 242 | ✅ PASS |
| platform-ui | 1225 | ✅ PASS |
| tests/unit | 1000 | ✅ PASS |
| **TOTAL** | **3557** | **✅ ALL PASS** |

### Functional Verification Status

| Component | Branch Coverage | Capabilities Verified |
|-----------|-----------------|----------------------|
| service-builder.ts | 100% | ✅ All config combinations |
| middleware-builder.ts | 100% | ✅ All config combinations |
| prisma-builder.ts | 91.66% | ⚠️ Needs verification |
| controller-builder.ts | 78.57% | ❌ Missing non-zod, hard-delete |
| route-builder.ts | 81.81% | ❌ Missing auth middleware, no-description |

### Missing Test Types

| Type | Status | Action Required |
|------|--------|-----------------|
| Unit Tests | ✅ Complete | Maintain per sprint |
| Story Test Cases | ❌ Not structured | Create `tests/stories/` |
| E2E Tests | ❌ Incomplete | Create `tests/e2e/` |
| Smoke Tests | ❌ Missing | Create `tests/smoke/` |
| Sanity Tests | ❌ Missing | Create `tests/sanity/` |
| Full Regression | ❌ Not defined | Create runner script |

---

## COMMANDS

### Run Individual Test Types

```bash
# Unit tests
npm run test:gateway

# Express generator tests
cd packages/express-generator && npm test

# Platform UI tests
npm test

# All tests (current)
npm run test:gateway && npm test && cd packages/express-generator && npm test
```

### Proposed Full Regression Command

```bash
# Full regression (to be created)
npm run test:regression

# Which runs:
# 1. npm run test:unit        (all unit tests)
# 2. npm run test:stories     (all story test cases)
# 3. npm run test:e2e         (all E2E tests)
# 4. npm run test:smoke       (smoke tests)
# 5. npm run test:sanity      (sanity tests)
```

---

## NEXT STEPS

### Priority 1: Create Test Structure
```bash
mkdir -p tests/stories tests/e2e tests/smoke tests/sanity
```

### Priority 2: Add Story Test Cases
- Map each user story to acceptance criteria tests
- Create `tests/stories/*.story.test.ts`

### Priority 3: Add E2E Tests
- Full pipeline: Figma → React → Mendix
- Code generation: Entity → Controller/Service/Routes
- Deployment: Generate → Build → Deploy

### Priority 4: Create Regression Runner
```json
// package.json
{
  "scripts": {
    "test:regression": "npm run test:unit && npm run test:stories && npm run test:e2e"
  }
}
```

---

## SUCCESS CRITERIA

**Epic 7.5 v2 Complete When:**

1. ✅ All 3557 unit tests passing
2. ✅ Functional verification for all code generators
3. ⏳ Story test cases created for key features
4. ⏳ E2E tests covering full pipeline
5. ⏳ Smoke/Sanity tests defined
6. ⏳ Full regression script operational

**NOT Success:**
- "Coverage is X%"
- "Y tests passing"

**IS Success:**
- "Controller generates valid hard-delete code" (proven with output)
- "Full pipeline produces deployable Mendix artifacts" (E2E verified)
- "JWT validation rejects forged signatures" (functional test)

---

## INFRASTRUCTURE CROSS-CHECKS (Added 2026-01-29)

> "Built infrastructure must be USED, not just EXIST."

### Lesson Learned
On 2026-01-29, we discovered CC was bypassing built infrastructure:
- MCP servers defined but not used
- Agent patterns documented but not invoked
- Security controls defined but disabled in dev mode
- External integrations referenced but not implemented

### Cross-Check Categories

#### 1. MCP Server & Agent Usage
| Check | Expected | How to Verify |
|-------|----------|---------------|
| Explore agent used for multi-file tasks | Yes | Review CC logs for Task tool usage |
| General-purpose agent for complex debug | Yes | Check agent delegation in transcripts |
| Mayor-Worker pattern for orchestration | Yes | Verify agent hierarchy in execution |
| Token limits respected | <150k per session | Monitor context usage |

**Automated Check:**
```bash
# Verify MCP config exists and is used
cat .mcp.json 2>/dev/null && echo "MCP config: EXISTS" || echo "MCP config: MISSING"

# Check for agent usage in recent session
grep -r "Task tool\|Explore agent" .claude/transcripts/ | tail -5
```

#### 2. Security Controls Status
| Control | Default | Dev Mode | Production | Status |
|---------|---------|----------|------------|--------|
| OAuth 2.1 + PKCE | enabled | **disabled** | enabled | ⚠️ CHECK |
| Sandbox Execution | enabled | **disabled** | enabled | ⚠️ CHECK |
| Supply Chain Scan | enabled | **disabled** | enabled | ⚠️ CHECK |
| Tool Signatures | enabled | **disabled** | enabled | ⚠️ CHECK |
| Input Sanitization | enabled | enabled | enabled | ✅ OK |
| Audit Logging | enabled | enabled | enabled | ✅ OK |

**Startup Verification Script:**
```typescript
// Add to server.ts startup
const REQUIRED_CONTROLS = ['oauth', 'sandbox', 'supplyChain'];
const config = gateway.getConfig();

console.log('\n=== SECURITY CONTROLS STATUS ===');
REQUIRED_CONTROLS.forEach(ctrl => {
  const enabled = config.security?.[ctrl]?.enabled;
  console.log(`${ctrl}: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  if (process.env.NODE_ENV === 'production' && !enabled) {
    throw new Error(`CRITICAL: ${ctrl} disabled in production!`);
  }
});
```

#### 3. External Integration Verification
| Integration | Status | Cross-Check |
|-------------|--------|-------------|
| Figma API | ⚠️ MOCKED | Test with real Figma URL |
| AWS Bedrock | ❌ DISCONNECTED | Verify connectivity |
| Wolfram API | ❌ NOT IMPLEMENTED | Reference exists, code missing |
| Mendix Export | ⚠️ MOCKED | Test actual deployment |

**Integration Test:**
```typescript
describe('External Integrations', () => {
  it('should connect to Figma API', async () => {
    const client = new FigmaClient({ accessToken: process.env.FIGMA_TOKEN });
    const response = await client.getFile('test-file-id');
    expect(response).not.toContain('mock');
  });

  it('should reach AWS Bedrock', async () => {
    const response = await bedrockClient.ping();
    expect(response.status).toBe('connected');
  });
});
```

#### 4. Agent Pattern Enforcement
| Pattern | Location | Usage Check |
|---------|----------|-------------|
| Mayor-Worker | `.forge/skills/mayor-worker-pattern/` | Main orchestrator delegates to workers |
| Worker Isolation | `.forge/skills/worker-isolation/` | Workers have limited context |
| Hook Protocol | `.forge/skills/hook-protocol/` | Git-backed task persistence |
| Forge Convoy | `.forge/skills/forge-convoy/` | Parallel work bundling |

**Pattern Validation:**
```bash
# Verify patterns are loaded and used
grep -r "mayor\|worker\|convoy" src/agents/ | wc -l
# Expected: >0 if patterns integrated
```

### Pre-Session Checklist

Before starting any CC session, verify:

```markdown
## Infrastructure Pre-Flight Check

- [ ] MCP servers configured (`.mcp.json` exists)
- [ ] Agent patterns available (`.forge/skills/` populated)
- [ ] Security controls match environment
- [ ] External integrations tested (not mocked)
- [ ] Token budget estimated (<150k for session)

## Session Discipline

- [ ] Use Explore agent for 5+ file searches
- [ ] Use general-purpose agent for debugging
- [ ] Restart at ~150k tokens
- [ ] Create handoff summary before restart
```

### Post-Session Validation

After completing a session:

```markdown
## Infrastructure Usage Audit

- [ ] Agents were used for complex tasks (not manual reads)
- [ ] MCP servers were invoked (not bypassed)
- [ ] Security controls remained enabled
- [ ] Token limit was respected
- [ ] Handoff documentation created
```

### Critical Anti-Patterns

| Anti-Pattern | Problem | Detection |
|--------------|---------|-----------|
| Manual file reads instead of Explore | Context bloat | >10 Read calls without Task |
| Disabled security in dev | Production risk | Config shows enabled=false |
| Mocked integrations passing | False confidence | Tests pass but E2E fails |
| Token exhaustion | Quality degradation | Responses slow/repetitive |
| No agent delegation | Single point of failure | No Task tool usage |

### Success Criteria (Infrastructure)

**Epic 7.5 v2 Infrastructure Complete When:**

1. ⏳ MCP servers actively used for all file operations
2. ⏳ Agent patterns integrated into gateway code
3. ⏳ Security controls enforced in all environments
4. ⏳ External integrations tested with real APIs
5. ⏳ Token management documented and followed
6. ⏳ Session restart protocol operational

---

*Epic 7.5 v2 Testing Framework - Functional Verification First*
