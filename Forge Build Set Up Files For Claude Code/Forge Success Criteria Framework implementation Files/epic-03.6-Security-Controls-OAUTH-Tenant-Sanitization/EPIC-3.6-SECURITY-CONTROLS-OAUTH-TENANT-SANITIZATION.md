# Epic 3.6: MCP Security Controls

**Duration:** 5 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** Epic 3.5 (Gateway Foundation)  
**Blocks:** Epic 3.7 (Compliance & Validation), Epic 3 (FORGE C Core)

---

## Epic Goal

Implement advanced security controls for the MCP Gateway including OAuth 2.1 with PKCE, tenant isolation, comprehensive input sanitization, and real-time security alerting. This epic addresses the remaining CRITICAL security gaps identified in the 2025 MCP security analysis.

---

## Context: Security Gaps Addressed

### From 2025 MCP Breaches
- **Confused Deputy Attack** (CVE-2025-6514): Static OAuth client_id reused → Epic 3.6 implements PKCE
- **Cross-Tenant Data Leaks** (Asana breach): No tenant isolation → Epic 3.6 implements tenant boundaries
- **Command Injection** (mcp-remote): No input sanitization → Epic 3.6 implements comprehensive filtering
- **Prompt Injection** (WhatsApp): Untrusted tool descriptions → Epic 3.6 implements content sanitization

### Epic 3.5 Foundation
- ✅ Gateway core with CARS risk assessment
- ✅ Human approval gates for MEDIUM+ risk
- ✅ Tool integrity monitoring (fingerprinting)

### Epic 3.6 Additions
1. ✅ **OAuth 2.1 with PKCE** - Prevent Confused Deputy attacks
2. ✅ **Tenant Isolation** - Prevent cross-customer data leaks
3. ✅ **Input Sanitization** - Prevent prompt/command injection
4. ✅ **Security Alerting** - Real-time threat detection

### Remaining Gaps (Epic 3.7)
- Supply chain verification (npm provenance, SBOM)
- Rate limiting & quota tracking
- Comprehensive audit logging
- Sandbox execution (Deno runtime)

---

## User Stories

### US-3.6.1: OAuth 2.1 with PKCE
**As a** security engineer  
**I want** OAuth 2.1 with PKCE for external MCP integrations  
**So that** Confused Deputy attacks are prevented

**Acceptance Criteria:**
- [ ] OAuth 2.1 client implementation with PKCE support
- [ ] Per-user, per-session authorization codes (no static client_id reuse)
- [ ] Token management (access tokens, refresh tokens)
- [ ] Automatic token rotation
- [ ] Token revocation endpoint
- [ ] Integration tests with mock OAuth provider

**OAuth Flow (PKCE):**
```typescript
// packages/mcp-gateway/src/oauth/oauth-client.ts
export class OAuth2Client {
  async authorize(userId: string, provider: string): Promise<AuthorizationURL> {
    // Step 1: Generate PKCE challenge
    const codeVerifier = this.generateCodeVerifier(); // 128-char random
    const codeChallenge = this.sha256(codeVerifier); // SHA-256 hash
    
    // Step 2: Build authorization URL
    const state = this.generateState();
    const authUrl = new URL(provider.authorizationEndpoint);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    
    // Store for callback
    await this.storeSession({
      userId,
      state,
      codeVerifier,
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 min
    });
    
    return { url: authUrl.toString(), state };
  }
  
  async handleCallback(code: string, state: string): Promise<TokenSet> {
    const session = await this.getSession(state);
    
    // Exchange code for tokens (with PKCE)
    const tokens = await this.exchangeCode({
      code,
      codeVerifier: session.codeVerifier,
      redirectUri: this.redirectUri,
    });
    
    // Store tokens securely
    await this.storeTokens(session.userId, tokens);
    
    return tokens;
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:oauth
```

---

### US-3.6.2: Tenant Isolation
**As a** platform architect  
**I want** strict tenant isolation in the MCP Gateway  
**So that** customers' data cannot leak across tenant boundaries

**Acceptance Criteria:**
- [ ] Tenant context extracted from every request
- [ ] Tool execution scoped to tenant
- [ ] Cross-tenant invocation blocked at gateway level
- [ ] Tenant-specific tool allowlists
- [ ] Tests verify isolation (attempt cross-tenant access)

**Tenant Isolation Architecture:**
```typescript
// packages/mcp-gateway/src/tenant/tenant-context.ts
export interface TenantContext {
  tenantId: string;
  projectId: string;
  allowedTools: string[];
  dataIsolationBoundary: string; // e.g., 'project', 'org', 'global'
}

export class TenantIsolationEngine {
  async validateRequest(
    request: ToolCallRequest,
    tenant: TenantContext
  ): Promise<void> {
    // 1. Verify tool is in tenant allowlist
    if (!tenant.allowedTools.includes(request.tool.name)) {
      throw new TenantViolationError(
        `Tool ${request.tool.name} not allowed for tenant ${tenant.tenantId}`
      );
    }
    
    // 2. Verify data access is within tenant boundary
    if (request.params.projectId !== tenant.projectId) {
      throw new TenantViolationError(
        `Cross-tenant data access attempted: ${tenant.tenantId} → ${request.params.projectId}`
      );
    }
    
    // 3. Check for cross-tenant references in params
    await this.scanForCrossTenantReferences(request.params, tenant);
  }
  
  private async scanForCrossTenantReferences(
    params: Record<string, unknown>,
    tenant: TenantContext
  ): Promise<void> {
    // Look for UUIDs in params that don't match tenant
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const paramsStr = JSON.stringify(params);
    const matches = paramsStr.match(uuidPattern) || [];
    
    for (const uuid of matches) {
      const owner = await this.getResourceOwner(uuid);
      if (owner && owner !== tenant.tenantId) {
        throw new TenantViolationError(
          `Cross-tenant resource reference detected: ${uuid}`
        );
      }
    }
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:tenant-isolation
```

---

### US-3.6.3: Advanced Input Sanitization
**As a** security engineer  
**I want** comprehensive input sanitization for all tool parameters  
**So that** prompt injection and command injection attacks are prevented

**Acceptance Criteria:**
- [ ] Prompt injection detection and filtering
- [ ] Command injection detection (shell metacharacters)
- [ ] Path traversal detection (../ sequences)
- [ ] SQL injection detection (if applicable)
- [ ] XSS detection in string parameters
- [ ] Configurable sanitization policies per tool
- [ ] Tests cover all OWASP injection types

**Input Sanitization Engine:**
```typescript
// packages/mcp-gateway/src/sanitization/input-sanitizer.ts
export class InputSanitizer {
  async sanitize(
    params: Record<string, unknown>,
    tool: MCPTool
  ): Promise<Record<string, unknown>> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        sanitized[key] = await this.sanitizeString(value, tool.name, key);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = await this.sanitize(value as Record<string, unknown>, tool);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  private async sanitizeString(
    input: string,
    toolName: string,
    paramName: string
  ): Promise<string> {
    // 1. Prompt injection detection
    if (this.detectPromptInjection(input)) {
      throw new InjectionDetectedError(
        `Prompt injection detected in ${toolName}.${paramName}`
      );
    }
    
    // 2. Command injection detection
    if (this.detectCommandInjection(input)) {
      throw new InjectionDetectedError(
        `Command injection detected in ${toolName}.${paramName}`
      );
    }
    
    // 3. Path traversal detection
    if (this.detectPathTraversal(input)) {
      throw new InjectionDetectedError(
        `Path traversal detected in ${toolName}.${paramName}`
      );
    }
    
    // 4. XSS detection
    if (this.detectXSS(input)) {
      // For XSS, we can escape rather than reject
      return this.escapeHTML(input);
    }
    
    return input;
  }
  
  private detectPromptInjection(input: string): boolean {
    // Common prompt injection patterns
    const patterns = [
      /ignore (previous|all) instructions?/i,
      /system:?\s*role/i,
      /\[\[?SYSTEM\]?\]?/i,
      /<\s*SYSTEM\s*>/i,
      /new instructions?:/i,
      /disregard/i,
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }
  
  private detectCommandInjection(input: string): boolean {
    // Shell metacharacters that enable command injection
    const dangerous = ['|', '&', ';', '$', '`', '\n', '$(', '${'];
    return dangerous.some(char => input.includes(char));
  }
  
  private detectPathTraversal(input: string): boolean {
    return /\.\.[\\/]/.test(input) || input.includes('../') || input.includes('..\\');
  }
  
  private detectXSS(input: string): boolean {
    return /<script[^>]*>.*?<\/script>/i.test(input) ||
           /on\w+\s*=/.test(input) ||
           /javascript:/i.test(input);
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:input-sanitization
pnpm --filter @forge/mcp-gateway test:injection-detection
```

---

### US-3.6.4: Real-Time Security Alerting
**As a** security operations team  
**I want** real-time alerts for security events  
**So that** threats are detected and responded to immediately

**Acceptance Criteria:**
- [ ] Alert severity levels: INFO, WARNING, CRITICAL
- [ ] Alert types: ToolPoisoning, TenantViolation, InjectionAttempt, ApprovalTimeout
- [ ] Alert delivery channels: Console (Epic 3.6), Email (Epic 3.7), Slack (Epic 3.7)
- [ ] Alert deduplication (prevent alert storms)
- [ ] Alert aggregation (hourly summaries)
- [ ] Tests verify alert triggering

**Security Alerting System:**
```typescript
// packages/mcp-gateway/src/alerting/alert-manager.ts
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  context: Record<string, unknown>;
  timestamp: Date;
}

export class AlertManager {
  private recentAlerts = new Map<string, Date>(); // Deduplication
  private readonly DEDUP_WINDOW_MS = 60 * 1000; // 1 minute
  
  async emit(alert: Omit<SecurityAlert, 'id' | 'timestamp'>): Promise<void> {
    // Deduplication
    const dedupKey = `${alert.type}:${alert.severity}:${JSON.stringify(alert.context)}`;
    const lastAlert = this.recentAlerts.get(dedupKey);
    
    if (lastAlert && Date.now() - lastAlert.getTime() < this.DEDUP_WINDOW_MS) {
      return; // Skip duplicate
    }
    
    const fullAlert: SecurityAlert = {
      ...alert,
      id: uuidv4(),
      timestamp: new Date(),
    };
    
    this.recentAlerts.set(dedupKey, fullAlert.timestamp);
    
    // Emit to channels
    await this.emitToConsole(fullAlert);
    
    // Epic 3.7 will add:
    // await this.emitToEmail(fullAlert);
    // await this.emitToSlack(fullAlert);
  }
  
  private async emitToConsole(alert: SecurityAlert): Promise<void> {
    const prefix = alert.severity === AlertSeverity.CRITICAL ? '🚨' : '⚠️';
    console.error(`${prefix} [SECURITY ALERT] ${alert.type}:`, {
      severity: alert.severity,
      message: alert.message,
      context: alert.context,
      timestamp: alert.timestamp.toISOString(),
    });
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:alerting
```

---

## Key Deliverables

```
packages/mcp-gateway/
├── src/
│   ├── oauth/
│   │   ├── oauth-client.ts           # OAuth 2.1 with PKCE
│   │   ├── token-manager.ts          # Token storage & rotation
│   │   └── pkce.ts                   # PKCE helpers
│   ├── tenant/
│   │   ├── tenant-context.ts         # Tenant isolation types
│   │   ├── tenant-engine.ts          # Isolation enforcement
│   │   └── resource-ownership.ts     # Cross-tenant detection
│   ├── sanitization/
│   │   ├── input-sanitizer.ts        # Main sanitization engine
│   │   ├── injection-detectors.ts    # Detection patterns
│   │   └── sanitization-policies.ts  # Per-tool policies
│   └── alerting/
│       ├── alert-manager.ts          # Alert orchestration
│       ├── alert-types.ts            # Alert type definitions
│       └── deduplication.ts          # Alert deduplication
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/                     # Security-specific tests
└── docs/
    └── security-controls.md
```

---

## Completion Criteria

- [ ] All 4 User Stories implemented
- [ ] OAuth 2.1 with PKCE functional
- [ ] Tenant isolation enforced at gateway level
- [ ] Input sanitization blocks all OWASP injection types
- [ ] Real-time security alerts operational
- [ ] All tests passing (>90% coverage)
- [ ] Security penetration tests passing
- [ ] Documentation complete
- [ ] Handoff to Epic 3.7 ready

---

## Handoff Context for Epic 3.7

**What Epic 3.7 needs to know:**

**Security Controls in Place:**
- OAuth 2.1 with PKCE prevents Confused Deputy
- Tenant isolation prevents cross-customer leaks
- Input sanitization blocks injection attacks
- Real-time alerting detects threats

**What Epic 3.7 will add:**
1. Supply chain verification (npm provenance, SBOM)
2. Rate limiting & quota tracking
3. Comprehensive audit logging (DCMA/DFARS compliant)
4. Sandbox execution (Deno runtime)
5. Penetration testing & compliance validation

**Files to reference:**
- `packages/mcp-gateway/src/oauth/oauth-client.ts`
- `packages/mcp-gateway/src/tenant/tenant-engine.ts`
- `packages/mcp-gateway/src/sanitization/input-sanitizer.ts`
- `packages/mcp-gateway/src/alerting/alert-manager.ts`

---

## Verification Script

```bash
#!/bin/bash
# verify-epic-3.6.sh

set -e

echo "🔍 Verifying Epic 3.6: MCP Security Controls"

# Run OAuth tests
echo "🔐 Testing OAuth 2.1 with PKCE..."
pnpm --filter @forge/mcp-gateway test:oauth

# Run tenant isolation tests
echo "🏢 Testing tenant isolation..."
pnpm --filter @forge/mcp-gateway test:tenant-isolation

# Run input sanitization tests
echo "🧹 Testing input sanitization..."
pnpm --filter @forge/mcp-gateway test:sanitization

# Run alerting tests
echo "🚨 Testing security alerting..."
pnpm --filter @forge/mcp-gateway test:alerting

# Run security penetration tests
echo "🔓 Running penetration tests..."
pnpm --filter @forge/mcp-gateway test:security

echo ""
echo "✅ Epic 3.6 verification complete"
echo "✅ OAuth 2.1 with PKCE operational"
echo "✅ Tenant isolation enforced"
echo "✅ Input sanitization active"
echo "✅ Security alerting functional"
echo ""
echo "📋 Ready for Epic 3.7: Compliance & Validation"
```
