# Epic 10: Platform UI Dashboard - Atomic Task Breakdown

**Total Tasks:** 12 | **Tokens:** 50K | **Time:** 10 days (2 weeks)

---

## Phase 10.1: Application Setup

### Task 10.1.1: Initialize Next.js 14 application
**Files:** packages/platform-ui/*, next.config.js
**Criteria:** App runs, App Router configured

### Task 10.1.2: Set up Tailwind CSS + shadcn/ui
**Files:** tailwind.config.js, components/ui/*
**Criteria:** Styling works, shadcn components available

### Task 10.1.3: Create application shell layout
**Files:** src/app/layout.tsx, components/Sidebar.tsx
**Criteria:** Sidebar navigation, responsive design

---

## Phase 10.2: Project Management

### Task 10.2.1: Create Projects list page
**Files:** src/app/projects/page.tsx
**Criteria:** Lists projects, create button

### Task 10.2.2: Create Project detail page
**Files:** src/app/projects/[id]/page.tsx
**Criteria:** Shows project info, tabs

### Task 10.2.3: Create Project CRUD operations
**Files:** src/lib/api/projects.ts
**Criteria:** Create, read, update, delete

---

## Phase 10.3: Convergence UI

### Task 10.3.1: Create Convergence wizard page
**Files:** src/app/generate/page.tsx
**Criteria:** Multi-step: select file, contract, options

### Task 10.3.2: Create ConvergenceProgress component
**Files:** src/components/ConvergenceProgress.tsx
**Criteria:** Real-time progress, iterations view

---

## Phase 10.4: Evidence & Deploy

### Task 10.4.1: Create Evidence Pack viewer
**Files:** src/app/evidence/[id]/page.tsx
**Criteria:** Shows all sections, download

### Task 10.4.2: Create Deployment UI
**Files:** src/app/deploy/page.tsx
**Criteria:** Environment select, progress, history

---

## Phase 10.5: Dashboard & Polish

### Task 10.5.1: Create Dashboard with metrics
**Files:** src/app/page.tsx, components/MetricsChart.tsx
**Criteria:** Charts, recent activity

### Task 10.5.2: Add authentication (NextAuth)
**Files:** src/app/api/auth/[...nextauth]/route.ts
**Criteria:** Login, session, protected routes

---

## Completion Checklist
- [ ] Application shell works
- [ ] Project management works
- [ ] Convergence UI works
- [ ] Evidence viewer works
- [ ] Deployment UI works
- [ ] Authentication works
