# Epic 12 Initialization: E2E Testing & Demo

**Read Time:** 2 minutes | **Context Load:** ~8K tokens

---

## What Was Built (Epic 11: Integrations)

- ✅ **Figma Integration**: OAuth, file fetching, webhooks
- ✅ **GitHub Integration**: Repo creation, code push, PRs
- ✅ **Slack Integration**: Notifications, interactive messages
- ✅ **Integration Manager**: Central registry, credential storage

---

## Your Mission (Epic 12)

**VALIDATE EVERYTHING.** Test the complete flow end-to-end:

```
Figma Design → Parse → Generate → Test → Deploy → Live App
```

Also: Prepare demo environment and materials.

---

## What You're Validating

| Epic | What to Test |
|------|--------------|
| 2 | Contract loading and validation |
| 3 | ForgeC orchestration |
| 4 | Convergence loop (iterations, cost, time) |
| 5 | Figma parsing accuracy |
| 6 | React generation correctness |
| 7 | Generated tests pass |
| 8 | Evidence pack completeness |
| 9 | AWS deployment success |
| 10 | Platform UI functionality |
| 11 | External integrations work |

---

## DO NOT

- ❌ Fix bugs in other packages (document them)
- ❌ Build new features
- ❌ Run all tests in one massive session
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `tests/e2e/` test suite
- ✅ Write complete flow test (Figma → AWS)
- ✅ Write performance benchmarks
- ✅ Write load tests (10 concurrent)
- ✅ Set up demo environment
- ✅ Create demo script (15 min)
- ✅ ONE test/task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 50K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-12-e2e-testing/TASKS.md`
2. Start: Task 12.1.1 (Create E2E test infrastructure)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Complete Flow Test

```typescript
test('Figma → Deployed App in under 30 minutes', async () => {
  const startTime = Date.now();
  let totalTokens = 0;
  
  // Step 1: Parse Figma file
  const design = await parser.parse(figmaFileUrl);
  expect(design.components.length).toBeGreaterThan(0);
  
  // Step 2: Run convergence
  const result = await forge.converge({
    contractId: 'react-component-v1',
    input: { design },
  });
  expect(result.status).toBe('converged');
  totalTokens += result.tokenUsage.total;
  
  // Step 3: Generate code
  const generated = await generator.generate(design);
  expect(generated.components.length).toBeGreaterThan(0);
  
  // Step 4: Run tests
  const testResult = await runTests(generated);
  expect(testResult.passed).toBe(true);
  
  // Step 5: Deploy
  const deployment = await deployer.deploy('staging');
  expect(deployment.status).toBe('success');
  
  // Validate constraints
  const totalTime = (Date.now() - startTime) / 1000 / 60;
  expect(totalTime).toBeLessThan(30);
  expect(totalTokens).toBeLessThan(80000);
});
```

---

## Success Criteria

After Epic 12:

- ✅ Complete flow test passes
- ✅ Performance meets targets (<30 min, <80K tokens)
- ✅ 10 concurrent sessions succeed
- ✅ Demo environment functional
- ✅ Demo video recorded

---

## Demo Script Outline (15 min)

1. **Opening (2 min)**: Problem statement, value prop
2. **Import Design (1 min)**: Figma → Platform
3. **Configure (1 min)**: Select contract
4. **Generate (2 min)**: Watch convergence
5. **Review Code (2 min)**: Show components
6. **Run Tests (1 min)**: Show coverage
7. **Deploy (2 min)**: Watch deployment
8. **Evidence (2 min)**: Show compliance pack
9. **Live App (1 min)**: Open deployed app
10. **Close (1 min)**: Questions, next steps

---

## 🎉 After Epic 12: FORGE B-D Platform Complete!

You'll have built:
- Contract-driven generation engine
- Figma → React code pipeline
- Automated testing generation
- Compliance evidence packs
- AWS deployment automation
- Full platform UI
- External integrations
- E2E validation suite

**Total: ~620K tokens across ~114 fresh sessions**
**All sessions stayed in peak performance zone (<15K tokens)**
