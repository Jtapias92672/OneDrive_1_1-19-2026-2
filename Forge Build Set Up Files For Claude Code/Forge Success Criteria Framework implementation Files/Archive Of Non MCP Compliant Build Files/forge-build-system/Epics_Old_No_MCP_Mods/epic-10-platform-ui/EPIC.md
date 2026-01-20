# Epic 10: Platform UI Dashboard

**Duration:** 10 days  
**Token Budget:** 50K tokens (SPLIT: 2 sessions × 25K)  
**Status:** Not Started  
**Dependencies:** All previous epics (UI integrates everything)

---

## Epic Goal

Build the web-based Platform UI that provides a unified interface for managing FORGE projects, triggering convergence, viewing evidence packs, and deploying applications.

---

## Session Split Strategy

**Session 10A (25K):** US-10.1 through US-10.3 (Core app, project management, convergence UI)  
**Session 10B (25K):** US-10.4 through US-10.6 (Evidence viewer, deployment UI, dashboard)

---

## User Stories

### US-10.1: Platform Application Shell
**As a** platform user, **I want** a modern web application **So that** I can access all FORGE features.

**Acceptance Criteria:**
- [ ] Next.js 14 with App Router
- [ ] Authentication (NextAuth.js)
- [ ] Responsive sidebar navigation
- [ ] Dark/light mode support
- [ ] Loading states and error boundaries

### US-10.2: Project Management
**As a** platform user, **I want** to manage projects **So that** I can organize my work.

**Acceptance Criteria:**
- [ ] Create/edit/delete projects
- [ ] Project dashboard with stats
- [ ] Figma file uploads
- [ ] Contract assignment
- [ ] Team member access

### US-10.3: Convergence UI
**As a** platform user, **I want** to trigger and monitor convergence **So that** I can generate code from designs.

**Acceptance Criteria:**
- [ ] Start new convergence session
- [ ] Select Figma file and contract
- [ ] Real-time progress display
- [ ] Iteration-by-iteration view
- [ ] Cancel/retry controls

### US-10.4: Evidence Pack Viewer
**As an** auditor, **I want** to view evidence packs in the UI **So that** I can audit convergence sessions.

**Acceptance Criteria:**
- [ ] List all evidence packs with search/filter
- [ ] Detail view with all sections
- [ ] Iteration timeline visualization
- [ ] Download options (PDF, ZIP)
- [ ] Integrity verification UI

### US-10.5: Deployment UI
**As a** platform user, **I want** to deploy generated code from the UI **So that** I can ship applications.

**Acceptance Criteria:**
- [ ] Environment selection
- [ ] Pre-deployment diff view
- [ ] Deployment progress streaming
- [ ] Deployment history
- [ ] Rollback controls

### US-10.6: Analytics Dashboard
**As a** platform operator, **I want** a dashboard with key metrics **So that** I can monitor platform health.

**Acceptance Criteria:**
- [ ] Convergence success rate chart
- [ ] Cost over time chart
- [ ] Token usage breakdown
- [ ] Recent activity feed
- [ ] System health indicators

---

## Key Components

```typescript
// Core Layout
packages/platform-ui/src/app/layout.tsx        // Root layout with sidebar
packages/platform-ui/src/components/Sidebar.tsx // Navigation

// Project Management
packages/platform-ui/src/app/projects/page.tsx           // Project list
packages/platform-ui/src/app/projects/[id]/page.tsx      // Project detail
packages/platform-ui/src/components/ProjectCard.tsx      // Project card

// Convergence UI
packages/platform-ui/src/app/convergence/new/page.tsx    // New session
packages/platform-ui/src/components/ConvergenceProgress.tsx
packages/platform-ui/src/components/IterationRow.tsx

// Evidence Viewer
packages/platform-ui/src/app/evidence/page.tsx           // Pack list
packages/platform-ui/src/app/evidence/[id]/page.tsx      // Pack detail
packages/platform-ui/src/components/IterationTimeline.tsx

// Deployment UI
packages/platform-ui/src/app/deployments/new/page.tsx    // New deployment
packages/platform-ui/src/components/DeploymentProgress.tsx

// Dashboard
packages/platform-ui/src/app/page.tsx                    // Main dashboard
packages/platform-ui/src/components/MetricsChart.tsx
```

---

## Key Deliverables

```
packages/platform-ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard
│   │   ├── projects/
│   │   ├── convergence/
│   │   ├── evidence/
│   │   ├── deployments/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ConvergenceProgress.tsx
│   │   ├── IterationTimeline.tsx
│   │   ├── DeploymentProgress.tsx
│   │   └── MetricsChart.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   └── hooks/
├── public/
├── tailwind.config.js
└── package.json
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query (server state), Zustand (client state)
- **Auth:** NextAuth.js
- **Charts:** Recharts
- **Real-time:** Server-Sent Events or WebSocket

---

## Completion Criteria

- [ ] Application shell with authentication
- [ ] Project CRUD operations working
- [ ] Convergence UI with real-time progress
- [ ] Evidence pack viewer with all sections
- [ ] Deployment UI with progress streaming
- [ ] Dashboard with charts and metrics
- [ ] Responsive design (mobile-friendly)
- [ ] Dark/light mode working

---

## Handoff Context for Epic 12

**What Epic 12 needs:**
- Platform UI running for E2E tests
- All pages accessible and functional
- API endpoints for all features

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 10: Platform UI"
cd packages/platform-ui

[ -f "src/app/layout.tsx" ] || { echo "❌ layout.tsx missing"; exit 1; }
[ -f "src/app/page.tsx" ] || { echo "❌ dashboard missing"; exit 1; }
[ -d "src/app/projects" ] || { echo "❌ projects route missing"; exit 1; }
[ -d "src/app/convergence" ] || { echo "❌ convergence route missing"; exit 1; }
[ -d "src/app/evidence" ] || { echo "❌ evidence route missing"; exit 1; }

pnpm build || { echo "❌ Build failed"; exit 1; }
pnpm test || { echo "❌ Tests failed"; exit 1; }

echo "✅ Epic 10 verification complete"
```
