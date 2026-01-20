# FORGE Success Criteria Framework - Human Review

**Version:** 2.0  
**Last Updated:** 2026-01-19  
**Epic:** 09 - human-review  
**Status:** ✅ Complete (16 files, ~2,800 lines)

---

## Overview

The Human Review system provides mandatory human-in-the-loop checkpoints throughout the FORGE platform. It ensures that critical decisions, high-risk outputs, and compliance-sensitive content receive appropriate human oversight before proceeding.

---

## Human Review Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HUMAN REVIEW ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         REVIEW GATES                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │  QUALITY   │  │ COMPLIANCE │  │  SECURITY  │  │   ETHICS    │   │   │
│  │  │   GATE     │  │    GATE    │  │    GATE    │  │    GATE     │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       REVIEW WORKFLOW                                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │  QUEUE     │  │ ASSIGNMENT │  │  DECISION  │  │  ESCALATION │   │   │
│  │  │ MANAGEMENT │  │   ENGINE   │  │  CAPTURE   │  │   HANDLING  │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      REVIEW INTERFACE                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │ CONTEXT  │  │ DIFF     │  │ANNOTATION│  │ VERDICT  │            │   │
│  │  │  VIEWER  │  │  VIEWER  │  │  TOOLS   │  │  FORM    │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Review Gates

### Gate Types

```typescript
interface ReviewGate {
  id: string;
  name: string;
  description: string;
  
  // Trigger conditions
  trigger: GateTrigger;
  
  // Review requirements
  requirements: ReviewRequirements;
  
  // Timing
  timeout: number;
  sla: ReviewSLA;
  
  // Escalation
  escalation: EscalationConfig;
  
  // Configuration
  enabled: boolean;
  bypassable: boolean;
  bypassRoles?: string[];
}

interface GateTrigger {
  type: TriggerType;
  conditions: TriggerCondition[];
  combinator: 'AND' | 'OR';
}

type TriggerType = 
  | 'ALWAYS'              // Every request
  | 'CONDITIONAL'         // Based on conditions
  | 'SAMPLING'            // Random sample
  | 'THRESHOLD';          // Score-based

interface TriggerCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  value: unknown;
}

// Pre-defined gates
const reviewGates: ReviewGate[] = [
  {
    id: 'quality-gate',
    name: 'Quality Review Gate',
    description: 'Review outputs that fail quality thresholds',
    trigger: {
      type: 'THRESHOLD',
      conditions: [
        { field: 'validation.qualityScore', operator: 'lt', value: 0.8 }
      ],
      combinator: 'OR'
    },
    requirements: {
      minReviewers: 1,
      roles: ['quality-reviewer', 'technical-lead'],
      consensusRequired: false
    },
    timeout: 86400000, // 24 hours
    sla: { warning: 3600000, critical: 14400000 },
    escalation: {
      after: 14400000,
      to: ['quality-manager']
    },
    enabled: true,
    bypassable: false
  },
  {
    id: 'compliance-gate',
    name: 'Compliance Review Gate',
    description: 'Review for regulatory compliance',
    trigger: {
      type: 'CONDITIONAL',
      conditions: [
        { field: 'contract.type', operator: 'eq', value: 'DEFENSE' },
        { field: 'classification', operator: 'ne', value: 'UNCLASSIFIED' }
      ],
      combinator: 'OR'
    },
    requirements: {
      minReviewers: 2,
      roles: ['compliance-officer', 'security-officer'],
      consensusRequired: true
    },
    timeout: 259200000, // 72 hours
    sla: { warning: 86400000, critical: 172800000 },
    escalation: {
      after: 172800000,
      to: ['compliance-director', 'security-director']
    },
    enabled: true,
    bypassable: false
  },
  {
    id: 'security-gate',
    name: 'Security Review Gate',
    description: 'Security-sensitive content review',
    trigger: {
      type: 'CONDITIONAL',
      conditions: [
        { field: 'securityScan.findings', operator: 'gt', value: 0 },
        { field: 'output.containsSecrets', operator: 'eq', value: true }
      ],
      combinator: 'OR'
    },
    requirements: {
      minReviewers: 1,
      roles: ['security-reviewer'],
      consensusRequired: false
    },
    timeout: 172800000, // 48 hours
    sla: { warning: 14400000, critical: 43200000 },
    escalation: {
      after: 43200000,
      to: ['security-manager', 'ciso']
    },
    enabled: true,
    bypassable: false
  },
  {
    id: 'ethics-gate',
    name: 'Ethics Review Gate',
    description: 'Ethical considerations review',
    trigger: {
      type: 'CONDITIONAL',
      conditions: [
        { field: 'ethicsScan.flagged', operator: 'eq', value: true }
      ],
      combinator: 'OR'
    },
    requirements: {
      minReviewers: 2,
      roles: ['ethics-board-member'],
      consensusRequired: true
    },
    timeout: 604800000, // 7 days
    sla: { warning: 259200000, critical: 432000000 },
    escalation: {
      after: 432000000,
      to: ['chief-ethics-officer']
    },
    enabled: true,
    bypassable: false
  }
];
```

---

## Review Workflow

### Review Request

```typescript
interface ReviewRequest {
  // Identity
  id: string;
  gateId: string;
  
  // Source
  requestId: string;
  executionId: string;
  
  // Content
  content: ReviewContent;
  context: ReviewContext;
  
  // Status
  status: ReviewStatus;
  
  // Assignment
  assignedTo?: string[];
  
  // Timing
  createdAt: Date;
  dueAt: Date;
  completedAt?: Date;
  
  // Metadata
  priority: Priority;
  tags: string[];
}

interface ReviewContent {
  // Generated output
  output: {
    type: 'CODE' | 'DOCUMENT' | 'DATA';
    content: string;
    format: string;
    size: number;
  };
  
  // Validation results
  validationResults: {
    structuralScore: number;
    semanticScore: number;
    qualityScore: number;
    details: ValidationDetail[];
  };
  
  // Diff from previous (if refinement)
  diff?: {
    previous: string;
    changes: DiffHunk[];
  };
  
  // Flags and warnings
  flags: ContentFlag[];
}

interface ReviewContext {
  // Contract
  contract: {
    id: string;
    type: string;
    requirements: string[];
  };
  
  // Generation
  prompt: string;
  parameters: Record<string, unknown>;
  
  // History
  iterationNumber: number;
  previousReviews?: ReviewSummary[];
  
  // Related items
  relatedRequests?: string[];
}

type ReviewStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'ESCALATED'
  | 'EXPIRED';

interface ContentFlag {
  type: FlagType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  location?: string;
  details?: Record<string, unknown>;
}

type FlagType = 
  | 'SECURITY_ISSUE'
  | 'COMPLIANCE_CONCERN'
  | 'QUALITY_WARNING'
  | 'ETHICS_FLAG'
  | 'PII_DETECTED'
  | 'SENSITIVE_DATA';
```

### Review Assignment

```typescript
interface AssignmentEngine {
  // Assign reviewers
  assign(request: ReviewRequest): Promise<string[]>;
  
  // Reassign
  reassign(requestId: string, newReviewers: string[]): Promise<void>;
  
  // Balance workload
  rebalance(): Promise<void>;
}

interface AssignmentStrategy {
  type: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'EXPERTISE_MATCH' | 'RANDOM';
  config?: Record<string, unknown>;
}

class ReviewAssignmentEngine implements AssignmentEngine {
  constructor(
    private reviewerPool: ReviewerPool,
    private strategy: AssignmentStrategy
  ) {}
  
  async assign(request: ReviewRequest): Promise<string[]> {
    const gate = await this.getGate(request.gateId);
    const eligibleReviewers = await this.findEligibleReviewers(gate, request);
    
    const selectedReviewers = this.selectReviewers(
      eligibleReviewers,
      gate.requirements.minReviewers,
      this.strategy
    );
    
    // Record assignments
    await this.recordAssignments(request.id, selectedReviewers);
    
    // Notify reviewers
    await this.notifyReviewers(selectedReviewers, request);
    
    return selectedReviewers;
  }
  
  private async findEligibleReviewers(
    gate: ReviewGate,
    request: ReviewRequest
  ): Promise<Reviewer[]> {
    // Get reviewers with required roles
    const reviewers = await this.reviewerPool.getByRoles(gate.requirements.roles);
    
    // Filter by availability
    const available = reviewers.filter(r => r.available);
    
    // Filter out conflicts of interest
    const noConflicts = available.filter(
      r => !this.hasConflict(r, request)
    );
    
    // Sort by workload/expertise
    return this.rankReviewers(noConflicts, request);
  }
}
```

### Review Decision

```typescript
interface ReviewDecision {
  // Identity
  id: string;
  requestId: string;
  reviewerId: string;
  
  // Decision
  verdict: ReviewVerdict;
  
  // Justification
  rationale: string;
  annotations: Annotation[];
  
  // Feedback
  feedback?: ReviewFeedback;
  
  // Timing
  submittedAt: Date;
  timeSpent: number;  // minutes
}

type ReviewVerdict = 
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'ESCALATE'
  | 'ABSTAIN';

interface Annotation {
  id: string;
  type: AnnotationType;
  
  // Location
  location: {
    start: number;
    end: number;
    line?: number;
  };
  
  // Content
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  suggestion?: string;
  
  // Categorization
  category: string;
  tags: string[];
}

type AnnotationType = 
  | 'COMMENT'
  | 'SUGGESTION'
  | 'ISSUE'
  | 'QUESTION'
  | 'PRAISE';

interface ReviewFeedback {
  // Quality assessment
  quality: {
    accuracy: number;      // 1-5
    completeness: number;  // 1-5
    clarity: number;       // 1-5
    maintainability: number; // 1-5
  };
  
  // Specific feedback
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  
  // Process feedback
  validationAccuracy: number;  // How accurate were automated checks?
  flagsHelpful: boolean;
}
```

### Consensus Resolution

```typescript
interface ConsensusResolver {
  // Check if consensus reached
  checkConsensus(decisions: ReviewDecision[]): ConsensusResult;
  
  // Resolve conflicts
  resolveConflict(decisions: ReviewDecision[]): Promise<ReviewVerdict>;
}

interface ConsensusResult {
  reached: boolean;
  verdict?: ReviewVerdict;
  confidence: number;
  conflicting?: ReviewDecision[];
}

class MajorityConsensusResolver implements ConsensusResolver {
  constructor(private threshold: number = 0.5) {}
  
  checkConsensus(decisions: ReviewDecision[]): ConsensusResult {
    if (decisions.length === 0) {
      return { reached: false, confidence: 0 };
    }
    
    // Count verdicts (excluding abstentions)
    const validDecisions = decisions.filter(d => d.verdict !== 'ABSTAIN');
    const verdictCounts = this.countVerdicts(validDecisions);
    
    // Find majority
    const total = validDecisions.length;
    for (const [verdict, count] of verdictCounts) {
      if (count / total > this.threshold) {
        return {
          reached: true,
          verdict: verdict as ReviewVerdict,
          confidence: count / total
        };
      }
    }
    
    // No consensus
    return {
      reached: false,
      confidence: Math.max(...verdictCounts.values()) / total,
      conflicting: decisions
    };
  }
  
  async resolveConflict(decisions: ReviewDecision[]): Promise<ReviewVerdict> {
    // If any rejection, default to rejection
    if (decisions.some(d => d.verdict === 'REJECTED')) {
      return 'REJECTED';
    }
    
    // If any escalation, escalate
    if (decisions.some(d => d.verdict === 'ESCALATE')) {
      return 'ESCALATE';
    }
    
    // If any revision request, request revision
    if (decisions.some(d => d.verdict === 'REVISION_REQUESTED')) {
      return 'REVISION_REQUESTED';
    }
    
    // Require explicit escalation for unresolved conflicts
    return 'ESCALATE';
  }
}
```

---

## Review Interface

### Reviewer Dashboard

```typescript
interface ReviewerDashboard {
  // Queue
  pendingReviews: ReviewRequest[];
  assignedReviews: ReviewRequest[];
  
  // Statistics
  stats: ReviewerStats;
  
  // History
  completedReviews: ReviewSummary[];
  
  // Filters and preferences
  filters: ReviewFilter[];
  preferences: ReviewerPreferences;
}

interface ReviewerStats {
  // Volume
  totalReviewed: number;
  reviewedThisWeek: number;
  reviewedToday: number;
  
  // Performance
  averageTimeMinutes: number;
  averageResponseHours: number;
  
  // Quality
  overrideRate: number;      // How often decisions are overridden
  agreementRate: number;     // Agreement with other reviewers
  
  // SLA
  slaComplianceRate: number;
}

interface ReviewInterface {
  // Content viewing
  renderContent(content: ReviewContent): ReactNode;
  renderDiff(diff: DiffContent): ReactNode;
  renderContext(context: ReviewContext): ReactNode;
  
  // Annotation tools
  addAnnotation(annotation: Annotation): void;
  removeAnnotation(annotationId: string): void;
  updateAnnotation(annotationId: string, updates: Partial<Annotation>): void;
  
  // Decision capture
  submitDecision(decision: Omit<ReviewDecision, 'id' | 'submittedAt'>): Promise<void>;
  
  // Navigation
  nextReview(): void;
  previousReview(): void;
}
```

### Review UI Components

```typescript
// Content Viewer with syntax highlighting
interface ContentViewerProps {
  content: ReviewContent;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationSelect: (annotationId: string) => void;
}

// Diff Viewer for refinement reviews
interface DiffViewerProps {
  original: string;
  modified: string;
  mode: 'UNIFIED' | 'SPLIT';
  annotations: Annotation[];
}

// Validation Summary
interface ValidationSummaryProps {
  results: ValidationResults;
  flags: ContentFlag[];
  onFlagClick: (flag: ContentFlag) => void;
}

// Decision Form
interface DecisionFormProps {
  onSubmit: (decision: ReviewDecision) => void;
  requireRationale: boolean;
  feedbackEnabled: boolean;
  verdictOptions: ReviewVerdict[];
}

// Example React component
function ReviewPanel({ request, onDecision }: ReviewPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  
  return (
    <div className="review-panel">
      <header>
        <h2>Review: {request.id}</h2>
        <ReviewMetadata request={request} />
      </header>
      
      <div className="review-content">
        <TabPanel>
          <Tab label="Output">
            <ContentViewer
              content={request.content}
              annotations={annotations}
              onAnnotationAdd={(a) => setAnnotations([...annotations, a])}
            />
          </Tab>
          
          <Tab label="Validation">
            <ValidationSummary
              results={request.content.validationResults}
              flags={request.content.flags}
            />
          </Tab>
          
          <Tab label="Context">
            <ContextViewer context={request.context} />
          </Tab>
          
          {request.content.diff && (
            <Tab label="Changes">
              <DiffViewer
                original={request.content.diff.previous}
                modified={request.content.output.content}
              />
            </Tab>
          )}
        </TabPanel>
      </div>
      
      <footer>
        <DecisionForm
          onSubmit={onDecision}
          requireRationale={true}
          annotations={annotations}
        />
      </footer>
    </div>
  );
}
```

---

## Escalation Handling

### Escalation Rules

```typescript
interface EscalationRule {
  id: string;
  trigger: EscalationTrigger;
  target: EscalationTarget;
  notification: EscalationNotification;
}

interface EscalationTrigger {
  type: 'TIMEOUT' | 'CONFLICT' | 'SEVERITY' | 'MANUAL';
  config: Record<string, unknown>;
}

interface EscalationTarget {
  roles: string[];
  specificUsers?: string[];
  fallback?: EscalationTarget;
}

interface EscalationNotification {
  channels: string[];
  message: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class EscalationManager {
  constructor(
    private rules: EscalationRule[],
    private notifier: NotificationService
  ) {}
  
  async checkEscalation(request: ReviewRequest): Promise<boolean> {
    for (const rule of this.rules) {
      if (this.shouldEscalate(request, rule)) {
        await this.escalate(request, rule);
        return true;
      }
    }
    return false;
  }
  
  private shouldEscalate(request: ReviewRequest, rule: EscalationRule): boolean {
    switch (rule.trigger.type) {
      case 'TIMEOUT':
        const elapsed = Date.now() - request.createdAt.getTime();
        return elapsed > (rule.trigger.config.timeout as number);
        
      case 'SEVERITY':
        const hasCriticalFlag = request.content.flags.some(
          f => f.severity === 'CRITICAL'
        );
        return hasCriticalFlag;
        
      default:
        return false;
    }
  }
  
  async escalate(request: ReviewRequest, rule: EscalationRule): Promise<void> {
    // Update status
    request.status = 'ESCALATED';
    await this.updateRequest(request);
    
    // Find escalation targets
    const targets = await this.resolveTargets(rule.target);
    
    // Assign to escalation targets
    await this.assign(request, targets);
    
    // Send notifications
    await this.notifier.send({
      recipients: targets,
      channels: rule.notification.channels,
      message: this.formatEscalationMessage(request, rule),
      urgency: rule.notification.urgency
    });
    
    // Log escalation
    await this.auditLogger.log({
      eventType: 'ESCALATION',
      requestId: request.id,
      rule: rule.id,
      targets,
      reason: rule.trigger.type
    });
  }
}
```

---

## Review Analytics

### Metrics

```typescript
const reviewMetrics = {
  // Volume
  reviews_total: new Counter({
    name: 'forge_reviews_total',
    help: 'Total review requests',
    labelNames: ['gate', 'verdict']
  }),
  
  // Timing
  review_duration: new Histogram({
    name: 'forge_review_duration_seconds',
    help: 'Time spent on review',
    labelNames: ['gate', 'reviewer'],
    buckets: [60, 300, 600, 1800, 3600, 7200, 14400]
  }),
  
  review_wait_time: new Histogram({
    name: 'forge_review_wait_time_seconds',
    help: 'Time waiting for review assignment',
    labelNames: ['gate'],
    buckets: [60, 300, 900, 1800, 3600, 7200]
  }),
  
  // Queue
  review_queue_depth: new Gauge({
    name: 'forge_review_queue_depth',
    help: 'Number of pending reviews',
    labelNames: ['gate', 'priority']
  }),
  
  // Quality
  review_agreement_rate: new Gauge({
    name: 'forge_review_agreement_rate',
    help: 'Agreement rate between reviewers',
    labelNames: ['gate']
  }),
  
  // SLA
  review_sla_breaches: new Counter({
    name: 'forge_review_sla_breaches_total',
    help: 'Number of SLA breaches',
    labelNames: ['gate', 'severity']
  }),
  
  // Escalations
  escalations_total: new Counter({
    name: 'forge_escalations_total',
    help: 'Total escalations',
    labelNames: ['gate', 'reason']
  })
};
```

### Review Reporting

```typescript
interface ReviewReport {
  period: { start: Date; end: Date };
  
  // Volume
  totalReviews: number;
  byGate: Record<string, number>;
  byVerdict: Record<ReviewVerdict, number>;
  
  // Performance
  averageReviewTime: number;
  averageWaitTime: number;
  slaCompliance: number;
  
  // Quality
  agreementRate: number;
  escalationRate: number;
  overrideRate: number;
  
  // Reviewer metrics
  reviewerPerformance: ReviewerPerformance[];
  
  // Trends
  dailyVolume: TimeSeriesData;
  weeklyTrends: TimeSeriesData;
}

interface ReviewerPerformance {
  reviewerId: string;
  reviewerName: string;
  
  reviewCount: number;
  averageTime: number;
  slaCompliance: number;
  agreementRate: number;
  overrideRate: number;
}
```

---

## Defense Contract Integration

### Cleared Reviewer Management

```typescript
interface ClearedReviewer extends Reviewer {
  // Clearance information
  clearance: {
    level: ClearanceLevel;
    granted: Date;
    expires: Date;
    polygraph?: Date;
    briefings: string[];
  };
  
  // Facility access
  facilityAccess: {
    scif: boolean;
    approvedLocations: string[];
  };
  
  // Program access
  programAccess: string[];  // Specific program briefings
}

type ClearanceLevel = 
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET'
  | 'TS_SCI';

class DefenseReviewAssignment extends ReviewAssignmentEngine {
  async findEligibleReviewers(
    gate: ReviewGate,
    request: ReviewRequest
  ): Promise<ClearedReviewer[]> {
    const baseReviewers = await super.findEligibleReviewers(gate, request);
    
    // Get classification requirement
    const classification = request.context.contract.classification;
    const requiredClearance = this.mapClassificationToClearance(classification);
    
    // Filter by clearance
    const cleared = baseReviewers.filter((r): r is ClearedReviewer => {
      const cleared = r as ClearedReviewer;
      return (
        cleared.clearance &&
        this.hasSufficientClearance(cleared.clearance.level, requiredClearance) &&
        new Date() < new Date(cleared.clearance.expires)
      );
    });
    
    // Filter by program access if required
    const programId = request.context.contract.programId;
    if (programId) {
      return cleared.filter(r => r.programAccess.includes(programId));
    }
    
    return cleared;
  }
  
  private hasSufficientClearance(
    has: ClearanceLevel,
    needs: ClearanceLevel
  ): boolean {
    const levels: ClearanceLevel[] = ['CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'TS_SCI'];
    return levels.indexOf(has) >= levels.indexOf(needs);
  }
}
```

### Compliance Evidence

```typescript
interface ReviewEvidence {
  reviewId: string;
  
  // Reviewer verification
  reviewerVerification: {
    identity: string;
    clearanceVerified: Date;
    facilityVerified: boolean;
  };
  
  // Decision record
  decision: {
    verdict: ReviewVerdict;
    rationale: string;
    timestamp: Date;
    digitalSignature: string;
  };
  
  // Chain of custody
  chainOfCustody: CustodyEvent[];
  
  // Compliance mapping
  compliance: {
    dcma: string[];      // Applicable DCMA requirements
    dfars: string[];     // DFARS clauses
    cmmc: string[];      // CMMC practices
    nist: string[];      // NIST 800-171 controls
  };
}

interface CustodyEvent {
  timestamp: Date;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  signature: string;
}
```

---

## Package Structure

```
human-review/
├── src/
│   ├── gates/
│   │   ├── review-gate.ts           # Gate definition
│   │   ├── gate-evaluator.ts        # Trigger evaluation
│   │   ├── predefined-gates.ts      # Built-in gates
│   │   └── index.ts
│   │
│   ├── workflow/
│   │   ├── review-request.ts        # Request management
│   │   ├── assignment-engine.ts     # Reviewer assignment
│   │   ├── decision-capture.ts      # Decision handling
│   │   ├── consensus-resolver.ts    # Consensus logic
│   │   └── index.ts
│   │
│   ├── escalation/
│   │   ├── escalation-manager.ts    # Escalation handling
│   │   ├── escalation-rules.ts      # Rule definitions
│   │   └── index.ts
│   │
│   ├── interface/
│   │   ├── components/              # React components
│   │   │   ├── ReviewPanel.tsx
│   │   │   ├── ContentViewer.tsx
│   │   │   ├── DiffViewer.tsx
│   │   │   ├── DecisionForm.tsx
│   │   │   └── Dashboard.tsx
│   │   └── index.ts
│   │
│   ├── defense/
│   │   ├── cleared-reviewer.ts      # Cleared personnel handling
│   │   ├── defense-assignment.ts    # Defense-specific assignment
│   │   ├── compliance-evidence.ts   # Evidence generation
│   │   └── index.ts
│   │
│   ├── analytics/
│   │   ├── metrics.ts               # Review metrics
│   │   ├── reporting.ts             # Report generation
│   │   └── index.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

---

## Configuration

```yaml
# human-review-config.yaml
humanReview:
  # General settings
  enabled: true
  defaultTimeout: 86400000   # 24 hours
  
  # Assignment
  assignment:
    strategy: EXPERTISE_MATCH
    loadBalancing: true
    maxAssignmentsPerReviewer: 10
  
  # SLA
  sla:
    warningThreshold: 0.75    # 75% of timeout
    criticalThreshold: 0.9    # 90% of timeout
  
  # Escalation
  escalation:
    enabled: true
    defaultTimeout: 14400000  # 4 hours
    notificationChannels:
      - slack
      - email
  
  # Defense settings
  defense:
    clearanceVerificationRequired: true
    facilityVerificationRequired: true
    programAccessRequired: true
    evidenceGeneration: true
  
  # Analytics
  analytics:
    metricsEnabled: true
    reportingInterval: 86400000  # Daily
```

---

## Related Documents

- [00_MASTER_ROADMAP.md](./00_MASTER_ROADMAP.md) - Platform overview
- [05_CONVERGENCE_ENGINE.md](./05_CONVERGENCE_ENGINE.md) - Integration with convergence
- [06_EVIDENCE_PACK.md](./06_EVIDENCE_PACK.md) - Evidence generation
- [07_RULE_SYSTEM.md](./07_RULE_SYSTEM.md) - Policy enforcement
- [09_DATA_PROTECTION.md](./09_DATA_PROTECTION.md) - Security compliance
