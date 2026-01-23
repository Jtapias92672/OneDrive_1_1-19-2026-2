---
name: component-level-governance
description: Implement Fine-Grained Access Control (FGAC) at the UI component level. Every UI primitive knows its own permissions and can refuse to render sensitive data. Includes UI state logging for exact reconstruction of what was shown at any moment. Use for compliance-critical UIs in finance, healthcare, defense, or multi-tenant SaaS.
---

# Component-Level Governance Skill

## Core Principle

> "In a world of dynamically generated UIs, traditional static security isn't enough.
> You need a layer that ensures row-level security and auditability—knowing exactly
> what a human or an agent saw and did on a 'composed' screen." — Nate B. Jones [09:12, 09:42]

---

## When to Use This Skill

**USE for:**
- Financial applications (what data was visible when trade executed?)
- Healthcare applications (HIPAA: prove what PHI was displayed)
- Defense/Government (CMMC, FedRAMP: audit trail requirements)
- Multi-tenant SaaS (customer isolation at component level)
- Dynamically composed UIs (SDUI) where screens vary per user

**Triggers:** "component permissions", "FGAC", "row-level security in UI", "UI audit trail", "state logging", "composable security", "component-level access control", "what did the user see"

**Dependencies:** security-compliance, ui-composability-system, genbi-governance-library

---

## Part 1: The Governance Problem in Composed UIs

### Static Security vs. Dynamic UI

```
STATIC SECURITY (Traditional):
  Page: /orders
  Permission: "view_orders"
  If user has permission → show page

PROBLEM: In SDUI, the "page" is assembled from primitives.
Each primitive might show different sensitive data.
Page-level permission is too coarse.

DYNAMIC SECURITY (Component-Level):
  Component: CustomerEmailCell
  Data: customer.email (PII)
  Requires: "view:pii:customer"
  Fallback: blur || mask || hide
  Audit: Log that this cell was visible
```

---

## Part 2: Fine-Grained Access Control (FGAC)

### Permission Schema

```typescript
interface ComponentPermission {
  componentId: string;
  componentType: string;
  requires: PermissionRequirement;
  fallback: FallbackBehavior;
  rowLevelRules?: RowLevelRule[];
  audit: AuditSettings;
}

interface PermissionRequirement {
  all?: string[];
  any?: string[];
  conditional?: ConditionalPermission[];
}

interface FallbackBehavior {
  type: 'hide' | 'disable' | 'blur' | 'mask' | 'placeholder' | 'error';
  maskPattern?: string;
  placeholder?: string;
  message?: string;
}

interface RowLevelRule {
  field: string;
  operator: 'equals' | 'in' | 'matches' | 'ownedBy';
  value: string | string[];
  action: 'allow' | 'deny' | 'mask';
}

interface AuditSettings {
  logAccess: boolean;
  logDenial: boolean;
  logDataViewed: boolean;
  logActions: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

### Permission Gate Implementation

```typescript
function PermissionGate({ permission, data, children }: Props) {
  const { checkPermission, userContext } = useContext(PermissionContext);
  const { logAccess, logDenial } = useContext(AuditContext);
  
  // 1. Check static permissions
  const staticResult = checkStaticPermissions(permission.requires, userContext);
  
  // 2. Check row-level rules
  const rowLevelResult = data 
    ? checkRowLevelRules(permission.rowLevelRules, data, userContext)
    : { allowed: true };
  
  // 3. Determine final result
  const allowed = staticResult.allowed && rowLevelResult.allowed;
  
  // 4. Audit logging
  useEffect(() => {
    if (allowed && permission.audit.logAccess) {
      logAccess({
        componentId: permission.componentId,
        userId: userContext.userId,
        timestamp: new Date().toISOString(),
        dataViewed: permission.audit.logDataViewed ? extractVisibleData(data) : undefined
      });
    }
    
    if (!allowed && permission.audit.logDenial) {
      logDenial({
        componentId: permission.componentId,
        userId: userContext.userId,
        reason: staticResult.reason || rowLevelResult.reason
      });
    }
  }, [allowed]);
  
  // 5. Render based on result
  if (allowed) return <>{children}</>;
  return <FallbackRenderer fallback={permission.fallback} />;
}
```

### Usage Example

```typescript
const customerEmailPermission: ComponentPermission = {
  componentId: 'customer-email-cell',
  componentType: 'DataCell',
  
  requires: {
    all: ['view:customers'],
    conditional: [
      { condition: "$.customer.isVIP", requires: ['view:vip:customers'] }
    ]
  },
  
  fallback: {
    type: 'mask',
    maskPattern: '****@****.***'
  },
  
  rowLevelRules: [
    {
      field: 'customer.tenantId',
      operator: 'equals',
      value: '$user.tenantId',
      action: 'allow'
    }
  ],
  
  audit: {
    logAccess: true,
    logDenial: true,
    logDataViewed: true,
    logActions: false,
    sensitivityLevel: 'high'
  }
};

function CustomerEmailCell({ customer }: Props) {
  return (
    <PermissionGate permission={customerEmailPermission} data={{ customer }}>
      <span>{customer.email}</span>
    </PermissionGate>
  );
}
```

---

## Part 3: UI State Logging

### Why State Logging Matters

For compliance and auditability, you must answer:
1. **What did user X see when they performed action Y?**
2. **What data was visible on screen at timestamp T?**
3. **What UI configuration was active when the error occurred?**

### State Snapshot Schema

```typescript
interface UIStateSnapshot {
  snapshotId: string;
  sessionId: string;
  userId: string;
  agentId?: string;
  timestamp: string;
  route: string;
  screenId: string;
  
  uiSchema?: {
    schemaId: string;
    schemaVersion: string;
    schemaHash: string;
  };
  
  components: ComponentState[];
  dataVisible: DataSnapshot[];
  permissionsApplied: PermissionDecision[];
  triggeringAction?: ActionContext;
}

interface ComponentState {
  componentId: string;
  componentType: string;
  rendered: boolean;
  permissions: {
    checked: string[];
    granted: string[];
    denied: string[];
    fallbackApplied?: string;
  };
}

interface DataSnapshot {
  entityType: string;
  entityId: string;
  fieldsVisible: string[];
  fieldsMasked: string[];
  fieldsHidden: string[];
  dataHash: string;
}
```

### State Logger Implementation

```typescript
class UIStateLogger {
  captureSnapshot(options: {
    trigger: 'pageload' | 'action' | 'periodic' | 'error';
    action?: ActionContext;
    includeData?: boolean;
  }): UIStateSnapshot {
    const snapshot: UIStateSnapshot = {
      snapshotId: generateUUID(),
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      route: window.location.pathname,
      screenId: this.getCurrentScreenId(),
      components: this.captureComponentTree(),
      dataVisible: options.includeData ? this.captureVisibleData() : [],
      permissionsApplied: this.capturePermissionDecisions(),
      triggeringAction: options.action
    };
    
    this.buffer.push(snapshot);
    
    if (options.trigger === 'action') {
      this.flush();
    }
    
    return snapshot;
  }
}
```

### Action Wrapper with State Capture

```typescript
function useAuditedAction<T extends (...args: any[]) => any>(
  action: T,
  options: AuditedActionOptions
): T {
  const logger = getUIStateLogger();
  
  return useCallback(((...args: Parameters<T>) => {
    // Capture state BEFORE action
    if (options.captureDataBefore) {
      logger.captureSnapshot({
        trigger: 'action',
        action: {
          actionId: options.actionId,
          actionType: options.actionType,
          payload: args[0]
        },
        includeData: true
      });
    }
    
    const result = action(...args);
    
    // Capture state AFTER action
    if (options.captureDataAfter) {
      Promise.resolve(result).then(() => {
        logger.captureSnapshot({ trigger: 'action', includeData: true });
      });
    }
    
    return result;
  }) as T, [action, options, logger]);
}
```

---

## Part 4: Audit Query Interface

### Reconstructing UI State

```typescript
interface AuditQueryService {
  findByAction(params: {
    userId?: string;
    actionType?: string;
    entityType?: string;
    fromTime?: string;
    toTime?: string;
  }): Promise<UIStateSnapshot[]>;
  
  findByTimestamp(params: {
    userId: string;
    timestamp: string;
  }): Promise<UIStateSnapshot | null>;
  
  findViewers(params: {
    entityType: string;
    entityId: string;
    fieldName?: string;
  }): Promise<{ userId: string; timestamp: string; masked: boolean }[]>;
  
  reconstructScreen(snapshotId: string): Promise<{
    componentTree: ComponentState[];
    dataVisible: DataSnapshot[];
    uiSchema?: object;
  }>;
}
```

### Compliance Report Generator

```typescript
interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  reportType: 'data_access' | 'action_audit' | 'permission_audit';
  findings: ComplianceFinding[];
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    sensitiveDataAccess: number;
    deniedAttempts: number;
  };
}
```

---

## Part 5: Verification Checklist

```markdown
### FGAC Implementation
- [ ] All sensitive components have ComponentPermission defined
- [ ] Row-level rules defined for multi-tenant data
- [ ] Fallback behaviors defined (hide/mask/blur/disable)
- [ ] Permission context available to all components

### State Logging
- [ ] UIStateLogger initialized on session start
- [ ] Snapshots captured on page load
- [ ] Snapshots captured before/after sensitive actions
- [ ] Data hashes generated for integrity
- [ ] Buffer flushing working reliably

### Audit Queries
- [ ] Can reconstruct screen state by timestamp
- [ ] Can find all viewers of specific data
- [ ] Can generate compliance reports
- [ ] Hashes validate integrity
```

---

## Reference

Based on Nate B. Jones: "Why Your Front-End Team Structure is Costing You 12 Months"
Key timestamps: [09:12], [09:42]
