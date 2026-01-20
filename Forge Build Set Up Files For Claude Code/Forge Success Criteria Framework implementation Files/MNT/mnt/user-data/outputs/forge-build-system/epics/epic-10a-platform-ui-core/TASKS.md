# Epic 10a: Platform UI Core - Atomic Task Breakdown

**Token Budget:** 25K (LIMIT: 25K) ✅ SPLIT  
**Tasks:** 8  
**Estimated Time:** 4 days  
**Dependencies:** Epic 4 (Convergence), Epic 6 (React Generator), Epic 9 (Infrastructure)

---

## Overview

Epic 10a implements the core Platform UI using Next.js 14, including the app shell, navigation, and primary pages for contract management.

---

## Phase 10a.1: Setup

### Task 10a.1.1: Initialize Next.js 14 app

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/platform-ui/package.json`
- `packages/platform-ui/next.config.js`
- `packages/platform-ui/tsconfig.json`
- `packages/platform-ui/src/app/layout.tsx`
- `packages/platform-ui/src/app/page.tsx`

**Features:** App Router, TypeScript, server components

**Done When:** Next.js app runs

---

### Task 10a.1.2: Configure Tailwind + shadcn/ui

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/platform-ui/tailwind.config.ts`
- `packages/platform-ui/src/styles/globals.css`
- `packages/platform-ui/components.json`

**Features:** Tailwind CSS, shadcn/ui components

**Done When:** Styling works

---

## Phase 10a.2: Layout

### Task 10a.2.1: Create app shell

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/platform-ui/src/components/layout/app-shell.tsx`
- `packages/platform-ui/src/components/layout/header.tsx`
- `packages/platform-ui/src/components/layout/sidebar.tsx`

**Features:** Responsive layout, collapsible sidebar

**Done When:** App shell renders

---

### Task 10a.2.2: Create navigation

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/platform-ui/src/components/layout/nav-menu.tsx`
- `packages/platform-ui/src/components/layout/breadcrumbs.tsx`

**Features:** Navigation menu, breadcrumbs

**Done When:** Navigation works

---

### Task 10a.2.3: Create dashboard page

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/platform-ui/src/app/dashboard/page.tsx`
- `packages/platform-ui/src/components/dashboard/stats-cards.tsx`
- `packages/platform-ui/src/components/dashboard/recent-activity.tsx`

**Features:** Stats overview, recent sessions

**Done When:** Dashboard displays

---

## Phase 10a.3: Core Pages

### Task 10a.3.1: Create contract editor

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/platform-ui/src/app/contracts/[id]/page.tsx`
- `packages/platform-ui/src/components/contracts/contract-editor.tsx`
- `packages/platform-ui/src/components/contracts/yaml-editor.tsx`

**Features:** YAML editing, validation preview

**Done When:** Contract editor works

---

### Task 10a.3.2: Create contract library

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/platform-ui/src/app/contracts/page.tsx`
- `packages/platform-ui/src/components/contracts/contract-list.tsx`
- `packages/platform-ui/src/components/contracts/contract-card.tsx`

**Features:** List view, search, filtering

**Done When:** Contract library displays

---

### Task 10a.3.3: Create settings page

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/platform-ui/src/app/settings/page.tsx`
- `packages/platform-ui/src/components/settings/provider-config.tsx`
- `packages/platform-ui/src/components/settings/preferences.tsx`

**Features:** Provider API keys, preferences

**Done When:** Settings page works

---

## Epic 10a Completion Checklist

- [ ] All 8 tasks complete
- [ ] Next.js app runs
- [ ] App shell with navigation
- [ ] Dashboard displays stats
- [ ] Contract editor works
- [ ] Settings configurable

**Next:** Epic 10b - Platform UI Features
