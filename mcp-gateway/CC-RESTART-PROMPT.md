# SESSION RESTART — FORGE (Fresh Chat)

## Previous Session Summary
- **Last Commit:** 90013ef - fix(dashboard): Add HTML Files option and fix Adjust Settings flow
- **Completed:** Conversational POC Orchestrator, HTML Files option, Adjust Settings flow
- **Dashboard:** http://localhost:3000/dashboard/forge-cowork (working)

## Context Files (Read First)
```bash
cat CLAUDE.md | head -100
cat TICKET.md
git status --short
```

## Uncommitted Work
- `tests/unit/jwt-validation.test.ts` — JWT fix in progress (DO NOT LOSE)

## Immediate Tasks

### 1. Commit Uncommitted Work (if tests pass)
```bash
git diff tests/unit/jwt-validation.test.ts | head -30
npm run test:gateway -- --testPathPattern=jwt 2>&1 | tail -15
```
If passing, commit: `git add tests/unit/jwt-validation.test.ts && git commit -m "fix(tests): JWT validation test ESM compatibility"`

### 2. Fix service-builder.ts Branch Coverage (66% → 85%)
Test ALL config combinations in `packages/express-generator/__tests__/builders/service-builder.test.ts`:
- `{ useTransactions: false, useSoftDelete: true }`
- `{ useTransactions: true, useSoftDelete: false }`
- `{ useTransactions: false, useSoftDelete: false }`

### 3. Run Epic 7.5 v2 Verification
```bash
npm run test:gateway 2>&1 | tail -20
cd packages/express-generator && npm run test:coverage 2>&1 | tail -30
```

## Success Criteria
- ✅ JWT validation test passing (not skipped)
- ✅ service-builder.ts branch coverage ≥ 85%
- ✅ All ~2300+ tests passing

## Protocol Reminders
- Turn counting: [Turn N/10]
- Output limits: `| tail -20` on all commands
- Update TICKET.md at session end
