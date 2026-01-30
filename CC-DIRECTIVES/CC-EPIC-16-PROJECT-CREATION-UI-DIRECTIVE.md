# CC-EPIC-16-PROJECT-CREATION-UI-DIRECTIVE

**Epic:** 16 - Persona-Aware Project Creation UI
**Confidence Level:** 97%+
**Estimated Effort:** 80 hours (2 weeks)
**Priority:** HIGH (Connects persona infrastructure to full Scrum pipeline)
**Dependencies:** Epic 13 (Jira) ✅, Epic 15 (Persona Foundation) ✅

---

## EXECUTIVE SUMMARY

Build persona-aware project creation wizards that connect the existing Persona Foundation System to the **FULL FORGE SCRUM AUTOMATION PIPELINE**:

```
FORGE COMPLETE WORKFLOW
───────────────────────────────────────────────────────────────────
1. Figma Design Input → Parse design
2. Create Jira Tickets → Epic 13 integration
3. Create Automated Tests → Unit + E2E (TDD approach)
4. Generate Code → React, Express, Prisma, or ANY target
5. Deploy to Sandbox → Lambda, EC2, or container
6. Run Automated Tests → Verify tests pass
7. Close Jira Tickets → On success
───────────────────────────────────────────────────────────────────
```

**FORGE is NOT limited to Mendix** - it generates working frontend AND backend software using Scrum processes.

Each persona (P0-P3) receives a tailored project creation experience based on their skill level, intent, and compliance requirements.

---

## EXISTING INFRASTRUCTURE (Epic 15 - VERIFIED ✅)

### Persona Definitions Available
| Persona | Code | Profile | UI Strategy |
|---------|------|---------|-------------|
| **P0** | `beginner` | New to AI tools | Guided wizard, step-by-step |
| **P1** | `disappointed` | Past AI frustration | Template-first, proven patterns |
| **P2** | `hesitant` | Compliance-focused | Security-gated, audit trails |
| **P3** | `frontier` | Capability-calibrated | Complexity analysis, hybrid workflows |

### Services Available
- `onboarding-service.ts` - Intent classification
- `profile-service.ts` - User profile + dashboard config
- `component-priority.ts` - UI component ordering
- `capability-types.ts` - P3 task analysis structures

### Key Types Available
```typescript
// From persona/types.ts
PersonaType: 'beginner' | 'disappointed' | 'hesitant' | 'frontier' | 'unclassified'
ForgeUserProfile: { personaType, skillScores, compliance, ... }
TaskAnalysisResult: { complexityScore, recommendedWorkflow, ... }
FrontierZone: 'ai-alone' | 'hybrid' | 'human-alone'
```

---

## SCRUM WORKFLOW INTEGRATION (CRITICAL)

### The Complete FORGE Pipeline

Project creation MUST integrate with the full Scrum automation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FORGE SCRUM AUTOMATION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER INPUT                                                                 │
│  ──────────                                                                 │
│  ┌──────────────┐                                                           │
│  │ Figma Design │ ──► FigmaClient ──► FigmaParser ──► Parsed Design        │
│  └──────────────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  JIRA INTEGRATION (Epic 13)                                                │
│  ──────────────────────────                                                │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ JiraClient.createIssue() ──► Create tickets for:             │          │
│  │   • Component generation tasks                                │          │
│  │   • Test creation tasks                                       │          │
│  │   • Deployment tasks                                          │          │
│  │   • Review tasks                                              │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                   │
│         ▼                                                                   │
│  CODE GENERATION                                                           │
│  ───────────────                                                           │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ FRONTEND:                                                     │          │
│  │   ReactGenerator ──► .tsx components + Tailwind               │          │
│  │                                                               │          │
│  │ BACKEND (Epic 14):                                            │          │
│  │   ExpressGenerator ──► Controllers, Services, Routes          │          │
│  │   PrismaSchemaBuilder ──► schema.prisma                       │          │
│  │                                                               │          │
│  │ TESTS (TDD - Generate FIRST):                                 │          │
│  │   TestGenerator ──► .test.ts files (unit + E2E)               │          │
│  │                                                               │          │
│  │ LOW-CODE (Optional):                                          │          │
│  │   MendixGenerator ──► Pages, Widgets, SCSS                    │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                   │
│         ▼                                                                   │
│  DEPLOYMENT (Epic 15 - Infrastructure)                                     │
│  ─────────────────────────────────────                                     │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ S3Client.upload() ──► Store artifacts                         │          │
│  │ Terraform/Lambda ──► Deploy to sandbox                        │          │
│  │ HealthCheck ──► Verify deployment                             │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                   │
│         ▼                                                                   │
│  TEST EXECUTION                                                            │
│  ──────────────                                                            │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ Jest ──► Run unit tests                                       │          │
│  │ Playwright/Cypress ──► Run E2E tests                          │          │
│  │ Report ──► Collect results                                    │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                   │
│         ▼                                                                   │
│  JIRA CLOSURE                                                              │
│  ────────────                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ IF tests pass:                                                │          │
│  │   JiraWorkflowManager.closeTicketOnCompletion()               │          │
│  │   ──► Transition all tickets to "Done"                        │          │
│  │   ──► Add evidence/comments                                   │          │
│  │                                                               │          │
│  │ IF tests fail:                                                │          │
│  │   JiraWorkflowManager.transitionIssue() ──► "Blocked"         │          │
│  │   ──► Add failure details                                     │          │
│  │   ──► Trigger retry or human review                           │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Services to Integrate

| Service | Epic | Integration Point |
|---------|------|-------------------|
| `JiraClient` | 13 | Create/update/close tickets |
| `JiraWorkflowManager` | 13 | Automate ticket transitions |
| `FigmaClient` | — | Parse design input |
| `ReactGenerator` | — | Generate frontend code |
| `ExpressGenerator` | 14 | Generate backend code |
| `PrismaSchemaBuilder` | 14 | Generate database schema |
| `PipelineService` | — | Orchestrate generation |
| `S3Client` | 11 | Store artifacts |
| `DeployService` | 15 | Deploy to sandbox |

---

## FILE STRUCTURE (EXACT)

```
packages/platform-ui/src/
├── components/
│   └── project-creation/
│       ├── index.ts                           # Barrel exports
│       ├── ProjectCreationWizard.tsx          # Main router (300 lines)
│       ├── types.ts                           # Project creation types (150 lines)
│       ├── hooks/
│       │   ├── useProjectCreation.ts          # State management (200 lines)
│       │   └── useTemplates.ts                # Template fetching (100 lines)
│       ├── wizards/
│       │   ├── P0BeginnerWizard.tsx           # Guided wizard (400 lines)
│       │   ├── P1TemplateWizard.tsx           # Template-first (350 lines)
│       │   ├── P2ComplianceWizard.tsx         # Security-gated (450 lines)
│       │   └── P3FrontierWizard.tsx           # Capability-calibrated (400 lines)
│       ├── steps/
│       │   ├── FigmaInputStep.tsx             # Figma file/URL input (200 lines)
│       │   ├── TemplateSelectStep.tsx         # Template selection (250 lines)
│       │   ├── ConfigurationStep.tsx          # Project configuration (300 lines)
│       │   ├── ComplianceGateStep.tsx         # P2 compliance checks (250 lines)
│       │   ├── ComplexityAnalysisStep.tsx     # P3 task analysis (300 lines)
│       │   └── GenerationStep.tsx             # Start generation (200 lines)
│       └── __tests__/
│           ├── ProjectCreationWizard.test.tsx (400 lines)
│           ├── P0BeginnerWizard.test.tsx      (300 lines)
│           ├── P1TemplateWizard.test.tsx      (300 lines)
│           ├── P2ComplianceWizard.test.tsx    (350 lines)
│           └── P3FrontierWizard.test.tsx      (350 lines)
├── lib/
│   └── project-creation/
│       ├── index.ts                           # Service exports
│       ├── project-service.ts                 # CRUD operations (200 lines)
│       ├── template-service.ts                # Template management (150 lines)
│       ├── complexity-analyzer.ts             # P3 task analysis (200 lines)
│       └── __tests__/
│           ├── project-service.test.ts        (200 lines)
│           └── complexity-analyzer.test.ts    (150 lines)
└── app/
    └── projects/
        ├── new/
        │   └── page.tsx                       # /projects/new route (100 lines)
        └── [id]/
            └── page.tsx                       # /projects/:id route (150 lines)
```

---

## PHASE 1: TYPE DEFINITIONS (6 hours)

### File: `components/project-creation/types.ts`

```typescript
/**
 * Project Creation Types
 * Epic 16: Persona-Aware Project Creation UI
 */

import { PersonaType, ComplianceContext, FrontierZone } from '@/lib/persona/types';

// ============================================================================
// Project Types
// ============================================================================

export type ProjectType =
  | 'website'           // Landing pages, marketing sites
  | 'dashboard'         // Admin panels, analytics dashboards
  | 'webapp'            // Full web applications
  | 'component-library' // Reusable component sets
  | 'prototype';        // Quick prototypes

export type ProjectSource =
  | 'figma'             // Figma file input
  | 'template'          // Pre-built template
  | 'scratch';          // Start from scratch (P0 only)

export type ProjectStatus =
  | 'draft'             // Not started
  | 'configuring'       // In wizard
  | 'pending-approval'  // P2: Awaiting compliance approval
  | 'generating'        // Pipeline running
  | 'completed'         // Generation complete
  | 'failed';           // Generation failed

// ============================================================================
// Project Definition
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  source: ProjectSource;
  status: ProjectStatus;

  // Creator context
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  personaAtCreation: PersonaType;

  // Input configuration
  figmaInput?: FigmaInputConfig;
  templateId?: string;
  configuration: ProjectConfiguration;

  // P2: Compliance
  compliance?: ProjectComplianceConfig;
  approvalId?: string;

  // P3: Capability
  complexityAnalysis?: ComplexityAnalysisResult;
  recommendedWorkflow?: FrontierZone;

  // Output
  generationJobId?: string;
  outputDirectory?: string;
  generatedFiles?: GeneratedFileRef[];
}

export interface FigmaInputConfig {
  fileKey: string;
  fileUrl?: string;
  accessToken?: string;           // Encrypted reference
  selectedFrames?: string[];       // Specific frame IDs
  entireFile: boolean;
}

export interface ProjectConfiguration {
  // Output settings - FORGE supports multiple targets
  outputFormat: OutputFormat;
  typescript: boolean;
  stylingApproach: 'tailwind' | 'css-modules' | 'styled-components';

// Output formats supported by FORGE
export type OutputFormat =
  | 'react-only'              // Frontend only (React + Tailwind)
  | 'react-express'           // Full-stack (React + Express + Prisma)
  | 'react-mendix'            // Low-code (React + Mendix)
  | 'express-api'             // API only (Express + Prisma)
  | 'full-stack';             // Complete (React + Express + Prisma + Tests)

  // Component settings
  componentLibrary?: 'none' | 'shadcn' | 'chakra' | 'material';
  generateTests: boolean;
  generateStories: boolean;

  // Naming
  namingConvention: 'PascalCase' | 'camelCase' | 'kebab-case';

  // P1: Reliability settings
  useProvenPatterns?: boolean;
  iterationBudget?: number;

  // P2: Compliance settings
  dataClassification?: DataClassification;
  requireAuditTrail?: boolean;
  requireApproval?: boolean;

  // P3: Capability settings
  aiInvolvementLevel?: 'ai-lead' | 'hybrid' | 'human-lead';
  confidenceThreshold?: number;
}

// ============================================================================
// P2 Compliance Types
// ============================================================================

export type DataClassification =
  | 'public'         // Tier 1: Public data
  | 'internal'       // Tier 2: Internal business
  | 'confidential'   // Tier 3: Confidential/PII
  | 'restricted';    // Tier 4: Highly restricted

export interface ProjectComplianceConfig {
  dataClassification: DataClassification;
  complianceFrameworks: ('SOC2' | 'HIPAA' | 'CMMC' | 'GDPR' | 'ISO27001' | 'FedRAMP')[];
  requiresApproval: boolean;
  approver?: string;
  auditTrailEnabled: boolean;
  evidencePackEnabled: boolean;
}

export interface ComplianceApprovalRequest {
  projectId: string;
  requestedBy: string;
  requestedAt: Date;
  dataClassification: DataClassification;
  complianceFrameworks: string[];
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// ============================================================================
// P3 Complexity Types
// ============================================================================

export interface ComplexityAnalysisResult {
  overallScore: number;           // 1-5 complexity scale
  factors: ComplexityFactor[];
  recommendedWorkflow: FrontierZone;
  confidenceEstimate: number;     // 0-100
  warnings: string[];
  recommendations: string[];
}

export interface ComplexityFactor {
  name: string;
  score: number;                  // 1-5
  weight: number;                 // 0-1
  description: string;
}

// ============================================================================
// Template Types
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  thumbnail?: string;

  // P1: Reliability metrics
  successRate: number;            // 0-100%
  averageIterations: number;
  totalUses: number;

  // Configuration preset
  defaultConfiguration: Partial<ProjectConfiguration>;

  // Figma reference (if applicable)
  figmaTemplateKey?: string;

  // Categorization
  tags: string[];
  personaRecommended: PersonaType[];
  complexity: 1 | 2 | 3 | 4 | 5;
}

// ============================================================================
// Wizard State Types
// ============================================================================

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  stepHistory: string[];

  // Draft project
  draft: Partial<Project>;

  // Validation
  errors: Record<string, string>;
  warnings: Record<string, string>;

  // Progress
  canProceed: boolean;
  canGoBack: boolean;
  isSubmitting: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<WizardStepProps>;
  validation?: (draft: Partial<Project>) => ValidationResult;
  optional?: boolean;
  personaSpecific?: PersonaType[];
}

export interface WizardStepProps {
  draft: Partial<Project>;
  updateDraft: (updates: Partial<Project>) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// ============================================================================
// Generated Output Types
// ============================================================================

export interface GeneratedFileRef {
  path: string;
  type: 'component' | 'style' | 'test' | 'story' | 'config';
  lines: number;
  hash: string;
}
```

### Verification Checklist - Phase 1
- [ ] All types align with existing persona types
- [ ] P2 compliance types match ComplianceContext from persona
- [ ] P3 complexity types match capability-types.ts
- [ ] Template types include P1 reliability metrics

---

## PHASE 2: PROJECT SERVICE (8 hours)

### File: `lib/project-creation/project-service.ts`

```typescript
/**
 * Project Service
 * Epic 16: Persona-Aware Project Creation UI
 */

import {
  Project,
  ProjectStatus,
  WizardState,
  ValidationResult,
} from '@/components/project-creation/types';
import { getProfile } from '@/lib/persona/profile-service';
import { PersonaType } from '@/lib/persona/types';

// ============================================================================
// In-Memory Store (MVP)
// ============================================================================

const projectStore = new Map<string, Project>();
let projectCounter = 0;

// ============================================================================
// Project CRUD
// ============================================================================

export async function createProject(
  userId: string,
  draft: Partial<Project>
): Promise<Project> {
  // Get user persona
  const profileResponse = await getProfile(userId);
  const persona = profileResponse?.profile.personaType || 'unclassified';

  // Generate ID
  projectCounter++;
  const id = `proj_${Date.now()}_${projectCounter}`;

  // Create project
  const project: Project = {
    id,
    name: draft.name || 'Untitled Project',
    description: draft.description,
    type: draft.type || 'webapp',
    source: draft.source || 'figma',
    status: 'draft',
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    personaAtCreation: persona,
    figmaInput: draft.figmaInput,
    templateId: draft.templateId,
    configuration: draft.configuration || getDefaultConfiguration(persona),
    compliance: draft.compliance,
    complexityAnalysis: draft.complexityAnalysis,
    recommendedWorkflow: draft.recommendedWorkflow,
  };

  projectStore.set(id, project);
  return project;
}

export async function getProject(projectId: string): Promise<Project | null> {
  return projectStore.get(projectId) || null;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> {
  const project = projectStore.get(projectId);
  if (!project) return null;

  const updated = {
    ...project,
    ...updates,
    updatedAt: new Date(),
  };

  projectStore.set(projectId, updated);
  return updated;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  return projectStore.delete(projectId);
}

export async function listProjects(userId: string): Promise<Project[]> {
  return Array.from(projectStore.values())
    .filter((p) => p.createdBy === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// ============================================================================
// Default Configuration by Persona
// ============================================================================

export function getDefaultConfiguration(persona: PersonaType): Project['configuration'] {
  const base = {
    outputFormat: 'react-mendix' as const,
    typescript: true,
    stylingApproach: 'tailwind' as const,
    componentLibrary: 'shadcn' as const,
    generateTests: false,
    generateStories: false,
    namingConvention: 'PascalCase' as const,
  };

  switch (persona) {
    case 'beginner':
      return {
        ...base,
        generateTests: false,
        generateStories: false,
        // Simplest configuration
      };

    case 'disappointed':
      return {
        ...base,
        useProvenPatterns: true,
        iterationBudget: 3,
        generateTests: true,
        // Focus on reliability
      };

    case 'hesitant':
      return {
        ...base,
        generateTests: true,
        requireAuditTrail: true,
        requireApproval: true,
        // Compliance-focused
      };

    case 'frontier':
      return {
        ...base,
        generateTests: true,
        generateStories: true,
        aiInvolvementLevel: 'hybrid',
        confidenceThreshold: 70,
        // Full capability
      };

    default:
      return base;
  }
}

// ============================================================================
// Validation
// ============================================================================

export function validateProjectDraft(
  draft: Partial<Project>,
  persona: PersonaType
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Name required
  if (!draft.name || draft.name.trim().length === 0) {
    errors.name = 'Project name is required';
  }

  // Figma input validation
  if (draft.source === 'figma') {
    if (!draft.figmaInput?.fileKey) {
      errors.figmaInput = 'Figma file key is required';
    }
  }

  // Template validation
  if (draft.source === 'template') {
    if (!draft.templateId) {
      errors.templateId = 'Please select a template';
    }
  }

  // P2: Compliance validation
  if (persona === 'hesitant') {
    if (!draft.compliance?.dataClassification) {
      errors.dataClassification = 'Data classification is required for compliance';
    }
    if (draft.compliance?.dataClassification === 'restricted' && !draft.compliance?.approver) {
      warnings.approver = 'Restricted data may require additional approval';
    }
  }

  // P3: Complexity validation
  if (persona === 'frontier') {
    if (!draft.complexityAnalysis) {
      warnings.complexity = 'Complexity analysis recommended before proceeding';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Pipeline Integration
// ============================================================================

export async function startGeneration(projectId: string): Promise<{
  jobId: string;
  status: 'started' | 'queued' | 'error';
  message?: string;
}> {
  const project = await getProject(projectId);
  if (!project) {
    return { jobId: '', status: 'error', message: 'Project not found' };
  }

  // Update status
  await updateProject(projectId, { status: 'generating' });

  // In production: Call pipeline service
  // For MVP: Return mock job ID
  const jobId = `job_${Date.now()}`;

  await updateProject(projectId, {
    status: 'generating',
    generationJobId: jobId,
  });

  return { jobId, status: 'started' };
}
```

### Verification Checklist - Phase 2
- [ ] CRUD operations follow existing service patterns
- [ ] Default configurations are persona-specific
- [ ] Validation includes persona-specific rules
- [ ] Pipeline integration stubbed for MVP

---

## PHASE 3: COMPLEXITY ANALYZER (P3) (8 hours)

### File: `lib/project-creation/complexity-analyzer.ts`

```typescript
/**
 * Complexity Analyzer
 * Epic 16: Persona-Aware Project Creation UI
 *
 * P3 (Frontier) users get task complexity analysis before starting.
 */

import {
  ComplexityAnalysisResult,
  ComplexityFactor,
  FigmaInputConfig,
  ProjectConfiguration,
} from '@/components/project-creation/types';
import { FrontierZone } from '@/lib/persona/types';

// ============================================================================
// Complexity Factors
// ============================================================================

interface AnalysisInput {
  figmaInput?: FigmaInputConfig;
  frameCount?: number;
  componentCount?: number;
  interactionCount?: number;
  hasAnimations?: boolean;
  hasResponsiveBreakpoints?: boolean;
  hasAccessibility?: boolean;
  configuration: ProjectConfiguration;
}

export function analyzeComplexity(input: AnalysisInput): ComplexityAnalysisResult {
  const factors: ComplexityFactor[] = [];

  // Factor 1: Component Count
  const componentScore = scoreComponentCount(input.componentCount || 0);
  factors.push({
    name: 'Component Count',
    score: componentScore,
    weight: 0.25,
    description: getComponentDescription(componentScore),
  });

  // Factor 2: Interaction Complexity
  const interactionScore = scoreInteractions(input.interactionCount || 0, input.hasAnimations);
  factors.push({
    name: 'Interaction Complexity',
    score: interactionScore,
    weight: 0.20,
    description: getInteractionDescription(interactionScore),
  });

  // Factor 3: Responsive Requirements
  const responsiveScore = input.hasResponsiveBreakpoints ? 4 : 2;
  factors.push({
    name: 'Responsive Requirements',
    score: responsiveScore,
    weight: 0.15,
    description: responsiveScore >= 4
      ? 'Multiple breakpoints require careful testing'
      : 'Single breakpoint simplifies implementation',
  });

  // Factor 4: Accessibility
  const a11yScore = input.hasAccessibility ? 4 : 2;
  factors.push({
    name: 'Accessibility Requirements',
    score: a11yScore,
    weight: 0.15,
    description: a11yScore >= 4
      ? 'Full accessibility requires human verification'
      : 'Basic accessibility can be automated',
  });

  // Factor 5: Output Complexity
  const outputScore = scoreOutputComplexity(input.configuration);
  factors.push({
    name: 'Output Complexity',
    score: outputScore,
    weight: 0.25,
    description: getOutputDescription(outputScore),
  });

  // Calculate overall score
  const overallScore = calculateWeightedScore(factors);

  // Determine recommended workflow
  const recommendedWorkflow = determineWorkflow(overallScore);

  // Calculate confidence estimate
  const confidenceEstimate = calculateConfidence(overallScore, factors);

  // Generate warnings and recommendations
  const { warnings, recommendations } = generateInsights(factors, overallScore);

  return {
    overallScore,
    factors,
    recommendedWorkflow,
    confidenceEstimate,
    warnings,
    recommendations,
  };
}

// ============================================================================
// Scoring Functions
// ============================================================================

function scoreComponentCount(count: number): number {
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  if (count <= 30) return 4;
  return 5;
}

function scoreInteractions(count: number, hasAnimations?: boolean): number {
  let score = 1;
  if (count > 5) score = 2;
  if (count > 15) score = 3;
  if (count > 30) score = 4;
  if (hasAnimations) score = Math.min(5, score + 1);
  return score;
}

function scoreOutputComplexity(config: ProjectConfiguration): number {
  let score = 1;

  // React + Mendix is more complex than React-only
  if (config.outputFormat === 'react-mendix') score += 1;
  if (config.outputFormat === 'mendix-only') score += 1;

  // Tests and stories add complexity
  if (config.generateTests) score += 1;
  if (config.generateStories) score += 1;

  return Math.min(5, score);
}

function calculateWeightedScore(factors: ComplexityFactor[]): number {
  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  return Math.round(weightedSum * 10) / 10;
}

function determineWorkflow(score: number): FrontierZone {
  if (score <= 2) return 'ai-alone';
  if (score <= 3.5) return 'hybrid';
  return 'human-alone';
}

function calculateConfidence(score: number, factors: ComplexityFactor[]): number {
  // Higher confidence for simpler tasks
  const baseConfidence = 100 - (score - 1) * 15;

  // Reduce confidence if factors are highly variable
  const variance = calculateVariance(factors.map((f) => f.score));
  const varianceAdjustment = variance > 1.5 ? -10 : 0;

  return Math.max(40, Math.min(95, baseConfidence + varianceAdjustment));
}

function calculateVariance(scores: number[]): number {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map((s) => Math.pow(s - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// Description Generators
// ============================================================================

function getComponentDescription(score: number): string {
  const descriptions: Record<number, string> = {
    1: 'Very few components - ideal for AI generation',
    2: 'Manageable component count',
    3: 'Moderate complexity - some review recommended',
    4: 'Many components - careful review needed',
    5: 'Very high component count - consider breaking into phases',
  };
  return descriptions[score] || 'Unknown complexity';
}

function getInteractionDescription(score: number): string {
  const descriptions: Record<number, string> = {
    1: 'Minimal interactions - static content',
    2: 'Basic interactions - standard forms and navigation',
    3: 'Moderate interactions - dynamic content',
    4: 'Complex interactions - state management required',
    5: 'Highly interactive - animations and complex state',
  };
  return descriptions[score] || 'Unknown interaction level';
}

function getOutputDescription(score: number): string {
  const descriptions: Record<number, string> = {
    1: 'Simple React output',
    2: 'React with tests or Mendix',
    3: 'Full stack with tests',
    4: 'Complete output with stories',
    5: 'Maximum output complexity',
  };
  return descriptions[score] || 'Unknown output complexity';
}

function generateInsights(
  factors: ComplexityFactor[],
  score: number
): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // High complexity warnings
  if (score >= 4) {
    warnings.push('High complexity project - expect multiple iteration cycles');
  }

  // Factor-specific insights
  for (const factor of factors) {
    if (factor.name === 'Component Count' && factor.score >= 4) {
      recommendations.push('Consider generating components in batches');
    }
    if (factor.name === 'Interaction Complexity' && factor.score >= 4) {
      recommendations.push('Plan for thorough interaction testing');
    }
    if (factor.name === 'Accessibility Requirements' && factor.score >= 4) {
      recommendations.push('Include accessibility audit in review process');
    }
  }

  // Workflow recommendations
  if (score <= 2) {
    recommendations.push('This project is suitable for AI-led generation with light review');
  } else if (score <= 3.5) {
    recommendations.push('Hybrid approach recommended: AI generates, human refines');
  } else {
    recommendations.push('Human-led approach recommended: break into smaller AI-assisted tasks');
  }

  return { warnings, recommendations };
}
```

### Verification Checklist - Phase 3
- [ ] Complexity factors are well-defined
- [ ] Scoring is consistent and explainable
- [ ] Workflow recommendations align with P3 FrontierZone
- [ ] Confidence estimates are reasonable

---

## PHASE 4: WIZARD COMPONENTS (25 hours)

### File: `components/project-creation/ProjectCreationWizard.tsx`

```typescript
/**
 * Project Creation Wizard
 * Epic 16: Persona-Aware Project Creation UI
 *
 * Routes to persona-specific wizards based on user profile.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonaType } from '@/lib/persona/types';
import { getProfile } from '@/lib/persona/profile-service';
import { P0BeginnerWizard } from './wizards/P0BeginnerWizard';
import { P1TemplateWizard } from './wizards/P1TemplateWizard';
import { P2ComplianceWizard } from './wizards/P2ComplianceWizard';
import { P3FrontierWizard } from './wizards/P3FrontierWizard';

interface ProjectCreationWizardProps {
  userId: string;
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
}

export function ProjectCreationWizard({
  userId,
  onComplete,
  onCancel,
}: ProjectCreationWizardProps) {
  const router = useRouter();
  const [persona, setPersona] = useState<PersonaType>('unclassified');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user persona
  useEffect(() => {
    async function loadPersona() {
      try {
        const response = await getProfile(userId);
        if (response) {
          setPersona(response.profile.personaType);
        } else {
          // Redirect to onboarding if no profile
          router.push('/onboarding');
        }
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }
    loadPersona();
  }, [userId, router]);

  // Handle completion
  const handleComplete = (projectId: string) => {
    if (onComplete) {
      onComplete(projectId);
    } else {
      router.push(`/projects/${projectId}`);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/dashboard');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  // Route to persona-specific wizard
  switch (persona) {
    case 'beginner':
      return (
        <P0BeginnerWizard
          userId={userId}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );

    case 'disappointed':
      return (
        <P1TemplateWizard
          userId={userId}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );

    case 'hesitant':
      return (
        <P2ComplianceWizard
          userId={userId}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );

    case 'frontier':
      return (
        <P3FrontierWizard
          userId={userId}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );

    case 'unclassified':
    default:
      // Redirect to onboarding
      router.push('/onboarding');
      return null;
  }
}
```

### File: `components/project-creation/wizards/P1TemplateWizard.tsx`

```typescript
/**
 * P1 Template Wizard
 * Epic 16: Persona-Aware Project Creation UI
 *
 * Template-first wizard for "Disappointed" persona.
 * Emphasizes proven patterns and reliability metrics.
 */

'use client';

import React, { useState } from 'react';
import { Project, ProjectTemplate, WizardState } from '../types';
import { useTemplates } from '../hooks/useTemplates';
import { useProjectCreation } from '../hooks/useProjectCreation';
import { TemplateSelectStep } from '../steps/TemplateSelectStep';
import { FigmaInputStep } from '../steps/FigmaInputStep';
import { ConfigurationStep } from '../steps/ConfigurationStep';
import { GenerationStep } from '../steps/GenerationStep';

interface P1TemplateWizardProps {
  userId: string;
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}

export function P1TemplateWizard({
  userId,
  onComplete,
  onCancel,
}: P1TemplateWizardProps) {
  const { templates, loading: templatesLoading } = useTemplates('disappointed');
  const {
    draft,
    updateDraft,
    errors,
    createProject,
    startGeneration,
    isSubmitting,
  } = useProjectCreation(userId);

  const [currentStep, setCurrentStep] = useState(0);

  // P1-specific steps
  const steps = [
    {
      id: 'template',
      title: 'Choose a Proven Template',
      description: 'Start with a template that has a high success rate',
    },
    {
      id: 'customize',
      title: 'Customize (Optional)',
      description: 'Add your Figma designs or customize the template',
    },
    {
      id: 'configure',
      title: 'Project Settings',
      description: 'Configure output settings',
    },
    {
      id: 'generate',
      title: 'Generate',
      description: 'Review and start generation',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const project = await createProject();
    if (project) {
      const result = await startGeneration(project.id);
      if (result.status === 'started') {
        onComplete(project.id);
      }
    }
  };

  // Filter templates by success rate (P1 focus on reliability)
  const reliableTemplates = templates.filter((t) => t.successRate >= 90);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index <= currentStep ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep
                    ? 'bg-primary text-white'
                    : index === currentStep
                    ? 'border-2 border-primary'
                    : 'border-2 border-gray-300'
                }`}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        <p className="text-gray-600">{steps[currentStep].description}</p>
      </div>

      {/* P1 Reliability Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="font-medium text-green-800">
            All templates shown have 90%+ success rate
          </span>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {currentStep === 0 && (
          <TemplateSelectStep
            templates={reliableTemplates}
            loading={templatesLoading}
            selectedId={draft.templateId}
            onSelect={(templateId) => {
              updateDraft({ templateId, source: 'template' });
            }}
            showReliabilityMetrics={true}
          />
        )}

        {currentStep === 1 && (
          <FigmaInputStep
            draft={draft}
            updateDraft={updateDraft}
            errors={errors}
            optional={true}
            helpText="Optionally add your Figma file to customize the template"
          />
        )}

        {currentStep === 2 && (
          <ConfigurationStep
            draft={draft}
            updateDraft={updateDraft}
            errors={errors}
            persona="disappointed"
            showIterationBudget={true}
          />
        )}

        {currentStep === 3 && (
          <GenerationStep
            draft={draft}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            persona="disappointed"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <button
          onClick={currentStep === 0 ? onCancel : handleBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={currentStep === 0 && !draft.templateId}
            className="px-6 py-2 bg-primary text-white rounded-md disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
          >
            {isSubmitting ? 'Starting...' : 'Start Generation'}
          </button>
        )}
      </div>
    </div>
  );
}
```

*(Similar implementations for P0BeginnerWizard, P2ComplianceWizard, P3FrontierWizard)*

---

## PHASE 5: STEP COMPONENTS (18 hours)

*(Implement FigmaInputStep, TemplateSelectStep, ConfigurationStep, ComplianceGateStep, ComplexityAnalysisStep, GenerationStep)*

---

## PHASE 6: TESTS (15 hours)

### Test Coverage Targets

| Component | Coverage Target |
|-----------|-----------------|
| ProjectCreationWizard | 90%+ |
| P0BeginnerWizard | 85%+ |
| P1TemplateWizard | 85%+ |
| P2ComplianceWizard | 90%+ |
| P3FrontierWizard | 90%+ |
| project-service | 90%+ |
| complexity-analyzer | 95%+ |

---

## ACCEPTANCE CRITERIA

### Must Pass (97%+ confidence)

- [ ] All 4 persona wizards render correctly
- [ ] Wizard routes based on user persona
- [ ] P1 shows reliability metrics for templates
- [ ] P2 includes compliance gate with approval flow
- [ ] P3 includes complexity analysis before generation
- [ ] P0 has guided step-by-step flow
- [ ] Figma input works across all wizards
- [ ] Template selection works for P1
- [ ] Project creation integrates with pipeline
- [ ] All tests pass (target: +60 tests)

---

## SUCCESS METRICS

```
BEFORE EPIC 16:
├── Project Creation UI: 0%
├── Persona-Aware Flow: 0%
├── Complexity Analysis: Type definitions only
├── Template Integration: Mock data only

AFTER EPIC 16:
├── Project Creation UI: 100%
├── Persona-Aware Flow: 100%
├── Complexity Analysis: Working for P3
├── Template Integration: Working for P1
├── Tests: +60 new tests
├── POC UI: COMPLETE
```

---

## CC EXECUTION COMMAND

```
Read ~/Documents/forge-app/CC-DIRECTIVES/CC-EPIC-16-PROJECT-CREATION-UI-DIRECTIVE.md and implement Epic 16 - Persona-Aware Project Creation UI

Implement in phases:
1. Types (6h)
2. Project Service (8h)
3. Complexity Analyzer (8h)
4. Wizard Components (25h)
5. Step Components (18h)
6. Tests (15h)

Follow existing persona/types.ts patterns.
Connect to pipeline-service for generation.
Target: +60 tests, all 4 persona wizards working
```

---

*Epic 16 Directive - Version 1.0 - 97% Confidence*
