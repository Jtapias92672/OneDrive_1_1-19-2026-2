# Epic 11 Initialization: External Integrations

**Read Time:** 2 minutes | **Context Load:** ~6K tokens

---

## What Was Built (Epic 10: Platform UI)

- ✅ **Next.js Application**: App Router, TypeScript
- ✅ **Project Management**: CRUD pages
- ✅ **Generation Wizard**: Multi-step flow
- ✅ **Evidence Viewer**: Pack display + download
- ✅ **Deployment UI**: Progress + history
- ✅ **Dashboard**: Metrics + activity

---

## Your Mission (Epic 11)

Build **External Integrations** for the platform:
- **Figma**: OAuth, file browsing, webhooks
- **GitHub**: Repo creation, code push, PRs
- **Slack**: Notifications, interactive messages
- **Jira**: Issue creation (optional)

**Each integration is INDEPENDENT.** Build one at a time.

---

## DO NOT

- ❌ Load Platform UI code (just integrate via API)
- ❌ Build all integrations in one session
- ❌ Store credentials in code (use env vars)
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/integrations/` package
- ✅ Build OAuth flows for each service
- ✅ Build API clients with error handling
- ✅ Build webhook handlers
- ✅ ONE integration per day, ONE task per session
- ✅ EXIT session after each task

---

## Token Budget

- **Per-task:** 4-6K tokens
- **Epic total:** 40K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-11-integrations/TASKS.md`
2. Start: Task 11.1.1 (Create IntegrationManager class)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Integration Structure

```typescript
// Each integration follows same pattern
interface Integration {
  id: string;
  name: string;
  
  // OAuth
  getAuthUrl(): string;
  handleCallback(code: string): Promise<Credentials>;
  
  // Health
  healthCheck(): Promise<HealthResult>;
}

// Usage
const figma = await integrations.get<FigmaClient>('figma', userId);
const files = await figma.getFiles();
```

---

## Priority Order

1. **Figma** (required for core flow)
2. **GitHub** (required for code output)
3. **Slack** (nice to have)
4. **Jira** (optional)

Build Figma and GitHub first. Slack and Jira if time permits.

---

## What Epic 12 Needs From You

E2E tests will use these integrations:

```typescript
// Test complete flow with real Figma file
const figma = await integrations.get('figma', testUser);
const design = await figma.getFile(testFileKey);
```
