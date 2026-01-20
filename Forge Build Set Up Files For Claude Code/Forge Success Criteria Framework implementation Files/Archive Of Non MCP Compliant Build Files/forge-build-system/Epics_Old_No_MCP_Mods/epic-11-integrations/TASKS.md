# Epic 11: External Integrations - Atomic Task Breakdown

**Total Tasks:** 10 | **Tokens:** 40K | **Time:** 5 days

---

## Phase 11.1: Package Setup

### Task 11.1.1: Create integrations package structure
**Files:** package.json, tsconfig.json, src/index.ts
**Criteria:** Package builds

### Task 11.1.2: Create IntegrationManager class
**Files:** src/manager.ts
**Criteria:** Registry, credential storage, health checks

---

## Phase 11.2: Figma Integration

### Task 11.2.1: Create FigmaIntegration (OAuth)
**Files:** src/figma/oauth.ts
**Criteria:** OAuth flow, token storage

### Task 11.2.2: Create Figma file browser
**Files:** src/figma/browser.ts
**Criteria:** List files, select for import

---

## Phase 11.3: GitHub Integration

### Task 11.3.1: Create GitHubIntegration (OAuth)
**Files:** src/github/oauth.ts
**Criteria:** OAuth flow, token storage

### Task 11.3.2: Create GitHub repo operations
**Files:** src/github/client.ts
**Criteria:** Create repo, push code, create PR

---

## Phase 11.4: Slack Integration

### Task 11.4.1: Create SlackIntegration (OAuth)
**Files:** src/slack/oauth.ts
**Criteria:** OAuth flow, token storage

### Task 11.4.2: Create Slack notification client
**Files:** src/slack/client.ts
**Criteria:** Send messages, blocks, interactive

---

## Phase 11.5: Export & Test

### Task 11.5.1: Create integration health checks
**Files:** src/health.ts
**Criteria:** All integrations have health check

### Task 11.5.2: Export package
**Files:** src/index.ts
**Criteria:** All APIs exported, tests pass

---

## Completion Checklist
- [ ] Figma OAuth works
- [ ] GitHub repo creation works
- [ ] Slack notifications work
- [ ] Health checks work
