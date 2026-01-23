---
name: ai-consumer-interface
description: Design interfaces for AI agent consumption, not just human users. Implements semantic HTML and ARIA as AI navigation maps, agent-specific APIs that bypass visual DOM, computer-use readiness hints, and distinct agent permission profiles. Use when building tools that AI agents will interact with programmatically.
---

# AI Consumer Interface Skill

## Core Principle

> "By 2026, 99% of the attention on your tools may come from AI agents, not just humans.
> These agents need different things: API-first delivery, computer-use readiness, and
> specific roles/permissions that might differ from human users." — Nate B. Jones [10:20]

---

## When to Use This Skill

**USE for:**
- Internal tools that AI agents will operate
- APIs consumed by automated workflows
- Dashboards monitored by AI assistants
- Forms that agents will fill programmatically
- Any UI where "computer use" is expected

**Triggers:** "AI agent interface", "agent API", "computer use", "semantic structure for AI", "agent permissions", "machine-readable UI", "agent consumer", "AI-first design"

**Dependencies:** api-contracts, cars-framework, security-compliance

---

## Part 1: The Dual-Consumer Architecture

### Traditional vs. AI-Ready Design

```
TRADITIONAL (Human-only):
    Visual UI → Human User

AI-READY (Dual Consumer):
    Visual UI → Human User
         ↕ Shared Semantic Layer ↕
    Agent Interface → AI Agent
```

---

## Part 2: Semantic Map (AI Navigation System)

Semantic HTML + ARIA labels serve as a **navigation map** for AI agents:

| Human Sees | Agent Reads |
|------------|-------------|
| Blue button | `<button aria-label="Submit order">` |
| Data table | `<table role="grid" aria-label="Customer orders">` |
| Error message | `<div role="alert" aria-live="assertive">` |

### Semantic Structure Requirements

```html
<!-- BAD: AI cannot understand intent -->
<div class="btn-blue" onclick="submit()">
  <span>Submit</span>
</div>

<!-- GOOD: AI can parse intent, action, and context -->
<button 
  type="submit"
  aria-label="Submit order for customer John Doe"
  data-action="order:submit"
  data-entity="order"
  data-entity-id="ord-123"
>
  Submit Order
</button>
```

### Semantic Map Schema

```typescript
interface SemanticMap {
  page: {
    title: string;
    purpose: string;
    primaryEntity?: string;
    breadcrumb: string[];
  };
  
  regions: SemanticRegion[];
  actions: SemanticAction[];
  dataViews: SemanticDataView[];
  forms: SemanticForm[];
}

interface SemanticAction {
  id: string;
  type: 'button' | 'link' | 'menuitem';
  label: string;
  selector: string;
  action: string;
  entity?: string;
  confirmation?: boolean;
  destructive?: boolean;
}
```

---

## Part 3: Agent API (Bypass Visual DOM)

### Why Agents Need Their Own API

Visual DOM interaction is slow, fragile, and token-heavy. Agent APIs provide direct data access with stable contracts.

### Agent API Definition

```yaml
version: "1.0"
baseUrl: "/api/agent/v1"

entities:
  order:
    list:
      method: GET
      path: /orders
      params:
        - name: status
          type: string
          enum: [pending, processing, shipped, delivered]
        - name: limit
          type: integer
          default: 50
    
    get:
      method: GET
      path: /orders/{orderId}
    
    actions:
      approve:
        method: POST
        path: /orders/{orderId}/approve
        description: "Approve order for processing"
      
      ship:
        method: POST
        path: /orders/{orderId}/ship
        body:
          type: ShipmentDetails

workflows:
  orderFulfillment:
    description: "Complete order from pending to delivered"
    steps:
      - id: approve
        endpoint: /orders/{orderId}/approve
      - id: ship
        endpoint: /orders/{orderId}/ship
        dependsOn: [approve]

meta:
  schema: /api/agent/v1/schema
  permissions: /api/agent/v1/permissions
  health: /api/agent/v1/health
```

---

## Part 4: Agent Permission Profiles

### Human vs. Agent Permissions

| Human Permission | Agent Equivalent | Difference |
|------------------|------------------|------------|
| `view:orders` | `agent:view:orders` | Same scope |
| `edit:orders` | `agent:edit:orders` | May have rate limits |
| N/A | `agent:bulk:orders` | Bulk operations |
| N/A | `agent:automate:orders` | Scheduled actions |

### Permission Profile Schema

```typescript
interface AgentPermissionProfile {
  agentId: string;
  agentType: 'assistant' | 'automation' | 'integration' | 'admin';
  permissions: AgentPermission[];
  constraints: AgentConstraints;
  auditLevel: 'none' | 'summary' | 'detailed' | 'full';
}

interface AgentConstraints {
  rateLimit?: { requests: number; window: string };
  bulkLimit?: number;
  allowedHours?: { start: string; end: string; timezone: string };
  valueLimits?: { [field: string]: { max?: number; min?: number } };
  requireApproval?: { actions: string[]; approverRole: string };
}
```

### Example: Fulfillment Agent Profile

```json
{
  "agentId": "fulfillment-agent-001",
  "agentType": "automation",
  "permissions": [
    {
      "resource": "order",
      "actions": ["read", "update"],
      "conditions": [
        { "field": "status", "operator": "in", "value": ["pending", "processing"] }
      ]
    }
  ],
  "constraints": {
    "rateLimit": { "requests": 100, "window": "1m" },
    "bulkLimit": 50,
    "requireApproval": {
      "actions": ["cancel", "refund"],
      "approverRole": "order_manager"
    }
  },
  "auditLevel": "detailed"
}
```

---

## Part 5: Computer Use Hints

### What AI Agents Need for Computer Use

When agents interact via browser automation (Playwright, Puppeteer):
1. **Stable selectors**: `data-testid`, not fragile CSS
2. **Wait indicators**: Know when page is ready
3. **State indicators**: Know current state
4. **Error states**: Recognize failures

### Computer Use Hints Schema

```typescript
interface ComputerUseHints {
  selectors: {
    strategy: 'data-testid' | 'aria-label' | 'data-action';
    prefix: string;
  };
  
  readiness: {
    indicator: string;
    loadingIndicator: string;
    timeout: number;
  };
  
  elements: ComputerUseElement[];
  stateIndicators: StateIndicator[];
  errorIndicators: ErrorIndicator[];
}

interface ComputerUseElement {
  purpose: string;
  selector: string;
  type: 'click' | 'input' | 'select' | 'scroll';
  waitAfter?: number;
  expectedResult?: string;
}
```

### Example: Order Form Hints

```json
{
  "selectors": {
    "strategy": "data-testid",
    "prefix": "order-"
  },
  "readiness": {
    "indicator": "[data-testid='order-form-ready']",
    "loadingIndicator": "[data-testid='loading-spinner']",
    "timeout": 10000
  },
  "elements": [
    {
      "purpose": "Submit order",
      "selector": "[data-testid='order-submit']",
      "type": "click",
      "waitAfter": 2000,
      "expectedResult": "Redirect to order confirmation"
    }
  ],
  "stateIndicators": [
    {
      "state": "form_valid",
      "selector": "[data-testid='order-submit']",
      "attribute": "disabled",
      "value": "false"
    }
  ]
}
```

---

## AI Consumer Readiness Checklist

```markdown
### Semantic Structure
- [ ] All interactive elements have semantic HTML tags
- [ ] All regions have landmark roles
- [ ] All elements have descriptive aria-labels
- [ ] Data attributes expose entity IDs
- [ ] Action buttons expose their action

### Agent API
- [ ] Agent API endpoints defined for all entities
- [ ] Bulk operations available where appropriate
- [ ] Schema endpoint exposes data types
- [ ] Permissions endpoint returns agent capabilities

### Computer Use
- [ ] All interactive elements have stable data-testid
- [ ] Loading states have explicit indicators
- [ ] Form validity state is detectable
- [ ] Error states have explicit selectors

### Permissions
- [ ] Agent permission profiles defined
- [ ] Rate limits configured
- [ ] Approval workflows for destructive actions
- [ ] Audit logging enabled for agent actions
```

---

## Reference

Based on Nate B. Jones: "Why Your Front-End Team Structure is Costing You 12 Months"
Key timestamps: [10:20], [10:35]
