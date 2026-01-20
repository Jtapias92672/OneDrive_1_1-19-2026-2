# Epic 11: Integrations - Atomic Task Breakdown

**Token Budget:** 40K (LIMIT: 40K) ✅ SAFE  
**Tasks:** 10  
**Estimated Time:** 5 days  
**Dependencies:** Epic 10b (Platform UI Features)

---

## Overview

Epic 11 implements third-party integrations including GitHub, Jira, Linear, Slack, Teams, and a webhook system for extensibility.

---

## Phase 11.1: Package Setup

### Task 11.1.1: Create integrations package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/integrations/src/github/index.ts`
- `packages/integrations/src/jira/index.ts`
- `packages/integrations/src/notifications/index.ts`
- `packages/integrations/src/webhooks/index.ts`

**Done When:** Package structure created

---

### Task 11.1.2: Define integration interface

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/integrations/src/types.ts`

**Key Types:** Integration, IntegrationConfig, IntegrationEvent

**Done When:** Types compile correctly

---

## Phase 11.2: Source Control

### Task 11.2.1: Implement GitHub PR creation

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/github/pr-creator.ts`
- `packages/integrations/src/github/client.ts`

**Features:** Create PRs with generated code

**Done When:** PR creation works

---

### Task 11.2.2: Implement GitHub Actions integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/github/actions.ts`
- `packages/integrations/src/github/workflow-templates.ts`

**Features:** Trigger workflows, status checks

**Done When:** Actions integration works

---

## Phase 11.3: Project Management

### Task 11.3.1: Implement Jira integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/jira/client.ts`
- `packages/integrations/src/jira/issue-sync.ts`

**Features:** Create/update issues, sync status

**Done When:** Jira sync works

---

### Task 11.3.2: Implement Linear integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/linear/client.ts`
- `packages/integrations/src/linear/issue-sync.ts`

**Features:** Create/update Linear issues

**Done When:** Linear sync works

---

## Phase 11.4: Notifications

### Task 11.4.1: Implement Slack integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/notifications/slack.ts`

**Features:** Send notifications, interactive messages

**Done When:** Slack notifications work

---

### Task 11.4.2: Implement Microsoft Teams integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/notifications/teams.ts`

**Features:** Send adaptive cards

**Done When:** Teams notifications work

---

## Phase 11.5: Extensibility

### Task 11.5.1: Implement webhook system

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/webhooks/webhook-manager.ts`
- `packages/integrations/src/webhooks/event-emitter.ts`

**Features:** Custom webhooks, event routing

**Done When:** Webhook system works

---

### Task 11.5.2: Implement CLI tool

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/integrations/src/cli/forge-cli.ts`
- `packages/integrations/src/index.ts`

**Features:** Command-line interface for FORGE

**Done When:** CLI tool works and all exports available

---

## Epic 11 Completion Checklist

- [ ] All 10 tasks complete
- [ ] GitHub PR creation works
- [ ] Jira/Linear sync works
- [ ] Slack/Teams notifications work
- [ ] Webhook system functional
- [ ] CLI tool operational

**Next:** Epic 12 - E2E Testing
