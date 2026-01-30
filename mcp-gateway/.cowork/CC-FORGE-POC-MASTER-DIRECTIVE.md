# FORGE POC MASTER DIRECTIVE

**Project:** FORGE B-D Platform - Full Scrum Automation
**Confidence Level:** 97%+
**Total Estimated Effort:** 261 hours (~6.5 weeks)
**Created:** 2026-01-27

---

## EXECUTIVE SUMMARY

This master directive orchestrates the completion of FORGE POC objectives through three epics that close all identified gaps. Each epic follows existing codebase patterns with 97%+ confidence.

---

## POC OBJECTIVES STATUS

| Objective | Description | Before | After | Gap Closed |
|-----------|-------------|--------|-------|------------|
| **2** | Figma → Jira → Code → Deploy → Close | 15% | 100% | Epic 13 |
| **3** | Back-end logic (Standard + Forge) | 25% | 100% | Epic 14 |
| **4** | AWS EC2/Lambda deployment | 75% | 100% | Epic 15 |

---

## EPIC SUMMARY

| Epic | Name | Effort | Priority | Directive |
|------|------|--------|----------|-----------|
| **13** | Jira Integration | 41h | CRITICAL | `CC-EPIC-13-JIRA-INTEGRATION-DIRECTIVE.md` |
| **14** | Backend Code Generation | 160h | CRITICAL | `CC-EPIC-14-BACKEND-CODEGEN-DIRECTIVE.md` |
| **15** | EC2 Infrastructure | 60h | MEDIUM | `CC-EPIC-15-EC2-INFRASTRUCTURE-DIRECTIVE.md` |

---

## EXECUTION SCHEDULE

### Week 1: Epic 13 - Jira Integration (41 hours)

| Day | Phase | Hours | Deliverables |
|-----|-------|-------|--------------|
| Mon | Phase 1: Types | 4h | `jira-types.ts` |
| Tue-Wed | Phase 2: Client | 12h | `jira-client.ts`, `MockJiraClient` |
| Thu | Phase 3: Workflow | 10h | `jira-workflow-manager.ts` |
| Fri | Phase 4: Tests | 10h | `jira-client.test.ts` |
| Fri | Phase 5: Integration | 5h | Exports, CARS integration |

**Checkpoint:**
- [ ] All Jira tests pass
- [ ] Workflow manager creates/updates/closes tickets
- [ ] CARS risk matrix includes Jira operations

---

### Weeks 2-5: Epic 14 - Backend Code Generation (160 hours)

| Week | Phases | Hours | Deliverables |
|------|--------|-------|--------------|
| W2 | Types, Utils | 20h | `types.ts`, `name-utils.ts`, `code-formatter.ts` |
| W3 | Prisma, Controller | 50h | `prisma-schema-builder.ts`, `controller-builder.ts` |
| W4 | Service, Route, Middleware | 55h | `service-builder.ts`, `route-builder.ts`, `middleware-builder.ts` |
| W5 | Generator, Tests, Integration | 35h | `generator.ts`, all tests, exports |

**Checkpoint:**
- [ ] Generates valid Prisma schema
- [ ] Generates Express controllers with CRUD
- [ ] Generates service layer with Prisma
- [ ] All 100+ tests pass

---

### Week 6: Epic 15 - EC2 Infrastructure (60 hours)

| Day | Phase | Hours | Deliverables |
|-----|-------|-------|--------------|
| Mon-Wed | Phase 1: ASG Module | 24h | `modules/ec2-asg/` |
| Thu-Fri | Phase 2: ALB Module | 18h | `modules/alb/` |
| Mon | Phase 3: RDS Module | 18h | `modules/rds/` |

**Checkpoint:**
- [ ] `terraform validate` passes
- [ ] ASG deploys with 2 instances
- [ ] ALB routes traffic correctly
- [ ] RDS Multi-AZ configured

---

## CRITICAL PATH DEPENDENCIES

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRITICAL PATH                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐                                                        │
│  │ Epic 13  │ ← Can start immediately                               │
│  │ Jira     │   (No dependencies on other epics)                    │
│  └──────────┘                                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────┐                                                        │
│  │ Epic 14  │ ← Can start immediately (parallel with 13)            │
│  │ Backend  │   (No dependencies on other epics)                    │
│  │ CodeGen  │                                                        │
│  └──────────┘                                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────┐                                                        │
│  │ Epic 15  │ ← Can start immediately (parallel with 13, 14)        │
│  │ EC2 Infra│   (No dependencies on other epics)                    │
│  └──────────┘                                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────┐                                                        │
│  │ Epic 12  │ ← Depends on Epic 13, 14 for E2E testing              │
│  │ E2E Tests│   (Previously created directive)                      │
│  └──────────┘                                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Parallelization Opportunity:**
- Epics 13, 14, 15 have NO dependencies on each other
- Can be executed in parallel if multiple developers available
- Sequential execution: ~6.5 weeks
- Parallel execution: ~4 weeks (with 2 developers)

---

## CONFIDENCE ANALYSIS

### Pattern Alignment (97%+)

| Pattern Source | Applied To | Confidence |
|----------------|------------|------------|
| `figma-client.ts` | Jira Client | 100% |
| `mendix-client.ts` | Jira Workflow | 100% |
| `aws/s3-client.ts` | Mock patterns | 100% |
| `react-generator/` | Express Generator | 100% |
| `modules/vpc/` | EC2 ASG Module | 100% |
| `modules/lambda/` | ALB/RDS Modules | 100% |

### Risk Factors

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Jira API changes | Low | Medium | Use REST API v3 (stable) |
| Prisma schema edge cases | Medium | Low | Extensive test fixtures |
| Terraform provider updates | Low | Low | Pin provider versions |
| Dependency conflicts | Low | Medium | Lock package versions |

---

## VERIFICATION PROTOCOL

### After Each Epic

1. **Run Test Suite**
   ```bash
   npm test -- --coverage
   ```
   - All tests must pass
   - Coverage targets must be met

2. **TypeScript Validation**
   ```bash
   npx tsc --noEmit
   ```
   - Zero type errors

3. **Terraform Validation** (Epic 15)
   ```bash
   terraform init && terraform validate
   ```
   - Zero configuration errors

4. **Git Commit**
   ```
   git add -A
   git commit -m "Epic XX: [Phase] - [Summary]"
   ```

---

## SUCCESS METRICS

### Before Epics 13-15

```
POC Objective 2 (Scrum Workflow):    15% ❌
POC Objective 3 (Backend Logic):     25% ❌
POC Objective 4 (Deployment):        75% ⚠️
───────────────────────────────────────────
Tests:                               1099 passing
Jira Integration:                    0%
Backend Code Generation:             0%
EC2 Infrastructure:                  0%
```

### After Epics 13-15

```
POC Objective 2 (Scrum Workflow):    100% ✅
POC Objective 3 (Backend Logic):     100% ✅
POC Objective 4 (Deployment):        100% ✅
───────────────────────────────────────────
Tests:                               1300+ passing (+200)
Jira Integration:                    100% ✅
Backend Code Generation:             100% ✅
EC2 Infrastructure:                  100% ✅
```

---

## CC EXECUTION COMMANDS

### Start Epic 13 (Jira Integration)

```
Read ~/Downloads/CC-EPIC-13-JIRA-INTEGRATION-DIRECTIVE.md and implement Epic 13 - Jira Integration

Follow EXACT patterns from existing Figma/Mendix/AWS clients.
Target: +40 tests, 97%+ confidence.
Commit after each phase.
```

### Start Epic 14 (Backend Code Generation)

```
Read ~/Downloads/CC-EPIC-14-BACKEND-CODEGEN-DIRECTIVE.md and implement Epic 14 - Backend Code Generation

Follow EXACT patterns from React Generator.
Target: +100 tests, 97%+ confidence.
This is a multi-week epic - commit after each phase.
```

### Start Epic 15 (EC2 Infrastructure)

```
Read ~/Downloads/CC-EPIC-15-EC2-INFRASTRUCTURE-DIRECTIVE.md and implement Epic 15 - EC2 Infrastructure

Follow EXACT patterns from existing Terraform modules (VPC, Lambda, Bedrock).
Target: 3 new modules, terraform validate passes.
```

### Run Epic 12 (E2E Tests - AFTER Epics 13-14)

```
Read ~/Downloads/CC-EPIC-12-E2E-INTEGRATION-DIRECTIVE.md and implement Epic 12 - E2E Integration Tests

This depends on Epic 13 (Jira) and Epic 14 (Backend CodeGen) being complete.
Target: +50 E2E tests proving full pipeline.
```

---

## RECOMMENDED EXECUTION ORDER

### Option A: Sequential (Single Developer)

```
Week 1:     Epic 13 (Jira)           ────────────────►
Weeks 2-5:  Epic 14 (Backend)        ────────────────────────────────────────►
Week 6:     Epic 15 (EC2)            ────────────────►
Week 7:     Epic 12 (E2E Tests)      ────────────────►

Total: ~7 weeks
```

### Option B: Parallel (Two Developers)

```
Developer 1:
Week 1:     Epic 13 (Jira)           ────────────────►
Weeks 2-5:  Epic 14 (Backend)        ────────────────────────────────────────►

Developer 2:
Week 1-2:   Epic 15 (EC2)            ────────────────────►
Week 3:     Epic 12 (E2E Tests)      ────────────────► (partial, expand week 5)

Total: ~5 weeks
```

---

## FILES CREATED

| File | Location | Purpose |
|------|----------|---------|
| `CC-EPIC-13-JIRA-INTEGRATION-DIRECTIVE.md` | `~/Downloads/` | Jira client & workflow |
| `CC-EPIC-14-BACKEND-CODEGEN-DIRECTIVE.md` | `~/Downloads/` | Express/Prisma generator |
| `CC-EPIC-15-EC2-INFRASTRUCTURE-DIRECTIVE.md` | `~/Downloads/` | ASG/ALB/RDS Terraform |
| `CC-FORGE-POC-MASTER-DIRECTIVE.md` | `~/Downloads/` | This file |
| `FORGE-POC-GAP-ANALYSIS-EPIC-7.5-v2.md` | `~/Downloads/` | Gap analysis report |

---

## CONCLUSION

The FORGE POC can achieve all stated objectives (2, 3, 4) with 97%+ confidence by implementing Epics 13, 14, and 15. The directives provide:

1. **Exact code patterns** extracted from existing codebase
2. **File-level specifications** for every deliverable
3. **Verification checklists** for each phase
4. **Test coverage targets** to ensure quality

Total estimated effort: **261 hours (~6.5 weeks sequential)**

The POC will be **functionally complete** after these epics, with:
- Full Jira workflow automation
- Backend code generation from data models
- EC2/RDS production deployment capability

---

*FORGE POC Master Directive - Version 1.0*
*Created by Cowork Gap Analysis + Deep Pattern Extraction*
