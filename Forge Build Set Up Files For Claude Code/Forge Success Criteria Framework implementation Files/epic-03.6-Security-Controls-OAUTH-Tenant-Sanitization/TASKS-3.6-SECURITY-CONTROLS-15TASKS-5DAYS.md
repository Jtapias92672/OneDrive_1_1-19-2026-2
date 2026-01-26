# Epic 3.6: Security Controls - Atomic Tasks

**Epic**: OAuth 2.1 + Tenant Isolation + Input Sanitization + Alerting  
**Token Budget**: 50K tokens  
**Task Count**: 15 tasks  
**Duration**: 5 days  
**Dependencies**: Epic 3.5 (Gateway Foundation)

---

## Task Breakdown

### Phase 1: OAuth 2.1 with PKCE (4 tasks, 1 day)

#### Task 3.6.1: Implement PKCE Code Challenge Generator
**Time**: 5 minutes  
**Files**:
- `packages/mcp-gateway/src/oauth/pkce.ts`

**Acceptance Criteria**:
- [ ] PKCE code verifier generator (43-128 characters, base64url)
- [ ] SHA-256 code challenge from verifier
- [ ] State parameter generator for CSRF protection
- [ ] Unit tests with RFC 7636 test vectors

**Code**:
```typescript
// packages/mcp-gateway/src/oauth/pkce.ts
import crypto from 'crypto';

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:pkce
```

---

#### Task 3.6.2: OAuth Client Implementation
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/oauth/oauth-client.ts`
- `packages/mcp-gateway/src/oauth/token-manager.ts`

**Acceptance Criteria**:
- [ ] Authorization URL builder with PKCE parameters
- [ ] Token exchange endpoint (authorization code → access token)
- [ ] Token refresh logic
- [ ] OAuth 2.1 compliance (no implicit flow, PKCE required)

**Code**:
```typescript
// packages/mcp-gateway/src/oauth/oauth-client.ts
export class OAuthClient {
  async getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scope: string[]
  ): Promise<{ url: string; codeVerifier: string; state: string }> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    return {
      url: `${this.authEndpoint}?${params}`,
      codeVerifier,
      state,
    };
  }
  
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        code_verifier: codeVerifier,
      }),
    });
    
    return await response.json();
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:oauth-client
```

---

#### Task 3.6.3: Token Manager with Refresh
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/oauth/token-manager.ts`

**Acceptance Criteria**:
- [ ] Token storage (access token + refresh token)
- [ ] Automatic refresh before expiry
- [ ] Token revocation on logout
- [ ] Secure token storage (encrypted at rest)

**Code**:
```typescript
// packages/mcp-gateway/src/oauth/token-manager.ts
export class TokenManager {
  private tokens: Map<string, TokenSet> = new Map();
  
  async getValidToken(userId: string): Promise<string> {
    const tokenSet = this.tokens.get(userId);
    if (!tokenSet) throw new Error('No token found');
    
    // Refresh if expires in < 5 minutes
    if (Date.now() + 300000 > tokenSet.expiresAt) {
      await this.refreshToken(userId);
    }
    
    return this.tokens.get(userId)!.accessToken;
  }
  
  private async refreshToken(userId: string): Promise<void> {
    const tokenSet = this.tokens.get(userId);
    if (!tokenSet?.refreshToken) throw new Error('No refresh token');
    
    const response = await this.oauthClient.refreshToken(tokenSet.refreshToken);
    
    this.tokens.set(userId, {
      accessToken: response.access_token,
      refreshToken: response.refresh_token || tokenSet.refreshToken,
      expiresAt: Date.now() + (response.expires_in * 1000),
    });
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:token-manager
```

---

#### Task 3.6.4: Gateway OAuth Integration
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/core/gateway.ts` (modify)

**Acceptance Criteria**:
- [ ] OAuth token injection into MCP tool calls
- [ ] Token validation before tool execution
- [ ] OAuth error handling (expired, revoked, invalid)
- [ ] Integration with CARS risk assessment

**Code**:
```typescript
// packages/mcp-gateway/src/core/gateway.ts (addition)
async handleToolCall(request: ToolCallRequest): Promise<ToolCallResponse> {
  // ... existing validation ...
  
  // OAuth 2.1 token injection
  if (this.requiresOAuth(request.tool)) {
    try {
      const token = await this.tokenManager.getValidToken(request.userId);
      request.headers = {
        ...request.headers,
        'Authorization': `Bearer ${token}`,
      };
    } catch (error) {
      throw new OAuthError('OAuth token unavailable or expired', {
        requiresReauth: true,
        authUrl: await this.getAuthUrl(request.userId),
      });
    }
  }
  
  // ... existing CARS + execution ...
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:gateway-oauth
```

---

### Phase 2: Tenant Isolation (4 tasks, 1 day)

#### Task 3.6.5: Tenant Context Extraction
**Time**: 5 minutes  
**Files**:
- `packages/mcp-gateway/src/tenant/context-extractor.ts`

**Acceptance Criteria**:
- [ ] Extract tenant ID from JWT claims
- [ ] Extract tenant ID from request headers
- [ ] Extract tenant ID from tool parameters
- [ ] Fallback to user's default tenant

**Code**:
```typescript
// packages/mcp-gateway/src/tenant/context-extractor.ts
export class TenantContextExtractor {
  extractTenantId(request: ToolCallRequest): string {
    // Priority 1: Explicit tenant in tool parameters
    if (request.params.tenantId) {
      return request.params.tenantId;
    }
    
    // Priority 2: JWT claim
    const jwt = this.parseJWT(request.headers.authorization);
    if (jwt?.claims?.tenant_id) {
      return jwt.claims.tenant_id;
    }
    
    // Priority 3: Header
    if (request.headers['x-tenant-id']) {
      return request.headers['x-tenant-id'];
    }
    
    // Priority 4: User's default tenant
    return this.getUserDefaultTenant(request.userId);
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:tenant-context
```

---

#### Task 3.6.6: Tenant Isolation Engine
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/tenant/isolation-engine.ts`

**Acceptance Criteria**:
- [ ] Tenant boundary enforcement (no cross-tenant access)
- [ ] Tenant-scoped resource filtering
- [ ] Multi-tenant tool parameter validation
- [ ] Tenant ownership verification

**Code**:
```typescript
// packages/mcp-gateway/src/tenant/isolation-engine.ts
export class TenantIsolationEngine {
  async enforceTenantBoundary(
    request: ToolCallRequest,
    tenantId: string
  ): Promise<void> {
    // Validate user has access to tenant
    const hasAccess = await this.checkTenantAccess(request.userId, tenantId);
    if (!hasAccess) {
      throw new TenantAccessDeniedError(
        `User ${request.userId} cannot access tenant ${tenantId}`
      );
    }
    
    // Add tenant filter to all queries
    request.params = this.addTenantFilter(request.params, tenantId);
    
    // Validate resource ownership
    if (request.params.resourceId) {
      const ownerId = await this.getResourceTenant(request.params.resourceId);
      if (ownerId !== tenantId) {
        throw new CrossTenantViolationError(
          `Resource ${request.params.resourceId} belongs to different tenant`
        );
      }
    }
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:tenant-isolation
```

---

#### Task 3.6.7: Cross-Tenant Leak Detection
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/tenant/leak-detector.ts`

**Acceptance Criteria**:
- [ ] Response scanning for foreign tenant IDs
- [ ] PII leak detection (emails, phone numbers from other tenants)
- [ ] Automatic alert on cross-tenant data
- [ ] Response sanitization (remove foreign tenant data)

**Code**:
```typescript
// packages/mcp-gateway/src/tenant/leak-detector.ts
export class CrossTenantLeakDetector {
  async scanResponse(
    response: any,
    allowedTenantId: string
  ): Promise<ScanResult> {
    const foreignTenantIds = this.extractTenantIds(response);
    const leaks = foreignTenantIds.filter(id => id !== allowedTenantId);
    
    if (leaks.length > 0) {
      await this.alertSecurity({
        type: 'CROSS_TENANT_LEAK',
        allowedTenant: allowedTenantId,
        leakedTenants: leaks,
        tool: response.toolName,
        severity: 'CRITICAL',
      });
      
      // Sanitize response
      return this.removeLeakedData(response, leaks);
    }
    
    return { safe: true, response };
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:leak-detection
```

---

#### Task 3.6.8: Gateway Tenant Integration
**Time**: 5 minutes  
**Files**:
- `packages/mcp-gateway/src/core/gateway.ts` (modify)

**Acceptance Criteria**:
- [ ] Tenant context extraction before tool execution
- [ ] Tenant isolation enforcement
- [ ] Response leak scanning
- [ ] Tenant audit logging

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:gateway-tenant
```

---

### Phase 3: Input Sanitization (4 tasks, 1 day)

#### Task 3.6.9: Injection Detection Patterns
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/sanitization/patterns.ts`

**Acceptance Criteria**:
- [ ] SQL injection patterns
- [ ] Command injection patterns  
- [ ] Prompt injection patterns
- [ ] Path traversal patterns

**Code**:
```typescript
// packages/mcp-gateway/src/sanitization/patterns.ts
export const INJECTION_PATTERNS = {
  sql: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(--|\#|\/\*)/,
  ],
  command: [
    /[;&|`$()]/,
    /(\.\.)|(\/etc\/)/,
  ],
  prompt: [
    /(ignore previous|disregard|forget all)/i,
    /(system prompt|you are now)/i,
  ],
};
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:injection-patterns
```

---

#### Task 3.6.10: Input Sanitizer Core
**Time**: 15 minutes  
**Files**:
- `packages/mcp-gateway/src/sanitization/sanitizer.ts`

**Acceptance Criteria**:
- [ ] Pattern matching against injection patterns
- [ ] Contextual sanitization (SQL vs Command vs Prompt)
- [ ] Configurable strictness levels
- [ ] Safe default escaping

**Code**:
```typescript
// packages/mcp-gateway/src/sanitization/sanitizer.ts
export class InputSanitizer {
  sanitize(input: any, context: SanitizationContext): SanitizationResult {
    const threats = this.detectThreats(input, context);
    
    if (threats.length > 0) {
      if (this.config.strictMode) {
        throw new InjectionDetectedError('Input contains injection patterns', {
          threats,
          input: this.maskSensitive(input),
        });
      }
      
      return {
        sanitized: this.escapeInput(input, context),
        threats,
        blocked: false,
      };
    }
    
    return { sanitized: input, threats: [], blocked: false };
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:sanitizer
```

---

#### Task 3.6.11: Per-Tool Sanitization Policies
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/sanitization/policies.ts`

**Acceptance Criteria**:
- [ ] Tool-specific sanitization rules
- [ ] Parameter-level sanitization configuration
- [ ] Allow-list for safe patterns
- [ ] Override policies for trusted tools

**Code**:
```typescript
// packages/mcp-gateway/src/sanitization/policies.ts
export const TOOL_POLICIES: Record<string, SanitizationPolicy> = {
  'database_query': {
    parameters: {
      query: { context: 'sql', strict: true },
      table: { context: 'sql', allowList: ['users', 'products', 'orders'] },
    },
  },
  'shell_exec': {
    parameters: {
      command: { context: 'command', strict: true },
    },
    requiresApproval: true, // HIGH risk = human approval
  },
};
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:sanitization-policies
```

---

#### Task 3.6.12: Gateway Sanitization Integration
**Time**: 5 minutes  
**Files**:
- `packages/mcp-gateway/src/core/gateway.ts` (modify)

**Acceptance Criteria**:
- [ ] Input sanitization before tool execution
- [ ] Policy-driven sanitization
- [ ] Sanitization audit logging
- [ ] Integration with CARS (sanitization failures → HIGH risk)

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:gateway-sanitization
```

---

### Phase 4: Real-Time Security Alerting (3 tasks, 2 days)

#### Task 3.6.13: Alert Manager & Types
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/alerting/alert-manager.ts`
- `packages/mcp-gateway/src/alerting/types.ts`

**Acceptance Criteria**:
- [ ] Alert type definitions (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] Alert severity scoring
- [ ] Alert routing rules
- [ ] Alert enrichment (context, evidence)

**Code**:
```typescript
// packages/mcp-gateway/src/alerting/types.ts
export enum AlertSeverity {
  CRITICAL = 'CRITICAL', // Immediate action required
  HIGH = 'HIGH',         // Action required within 1 hour
  MEDIUM = 'MEDIUM',     // Action required within 24 hours
  LOW = 'LOW',           // Informational
}

export interface SecurityAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  evidence: Record<string, any>;
  timestamp: Date;
  source: string;
  userId?: string;
  tenantId?: string;
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:alert-types
```

---

#### Task 3.6.14: Alert Deduplication
**Time**: 15 minutes  
**Files**:
- `packages/mcp-gateway/src/alerting/deduplicator.ts`

**Acceptance Criteria**:
- [ ] Alert fingerprinting (hash of type + user + tool)
- [ ] Time-window deduplication (same alert within 5 minutes)
- [ ] Alert aggregation (100 similar alerts → 1 aggregate)
- [ ] Burst detection (spike in alerts)

**Code**:
```typescript
// packages/mcp-gateway/src/alerting/deduplicator.ts
export class AlertDeduplicator {
  private recentAlerts: Map<string, Date> = new Map();
  
  shouldAlert(alert: SecurityAlert): boolean {
    const fingerprint = this.createFingerprint(alert);
    const lastSeen = this.recentAlerts.get(fingerprint);
    
    if (lastSeen && Date.now() - lastSeen.getTime() < 300000) {
      // Same alert within 5 minutes - deduplicate
      return false;
    }
    
    this.recentAlerts.set(fingerprint, new Date());
    return true;
  }
  
  private createFingerprint(alert: SecurityAlert): string {
    return crypto
      .createHash('sha256')
      .update(`${alert.type}:${alert.userId}:${alert.evidence.tool}`)
      .digest('hex');
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:alert-deduplication
```

---

#### Task 3.6.15: Security Integration (OAuth, Tenant, Sanitization)
**Time**: 10 minutes  
**Files**:
- `packages/mcp-gateway/src/core/gateway.ts` (modify)

**Acceptance Criteria**:
- [ ] Alert on OAuth failures (expired token, revoked, invalid)
- [ ] Alert on tenant violations (cross-tenant access, leak detected)
- [ ] Alert on injection attempts (sanitization blocked)
- [ ] Alert on CARS HIGH/CRITICAL risk escalations

**Code**:
```typescript
// packages/mcp-gateway/src/core/gateway.ts (addition)
private async alertOnSecurityEvent(event: SecurityEvent): Promise<void> {
  const alert: SecurityAlert = {
    id: uuidv4(),
    severity: this.mapSeverity(event),
    type: event.type,
    message: event.message,
    evidence: event.evidence,
    timestamp: new Date(),
    source: 'mcp-gateway',
    userId: event.userId,
    tenantId: event.tenantId,
  };
  
  if (this.deduplicator.shouldAlert(alert)) {
    await this.alertManager.send(alert);
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/mcp-gateway test:security-alerting
pnpm --filter @forge/mcp-gateway test        # All tests
pnpm --filter @forge/mcp-gateway build       # Final build
```

---

## Completion Checklist

- [ ] **Phase 1**: OAuth 2.1 with PKCE (4 tasks) ✅
- [ ] **Phase 2**: Tenant Isolation (4 tasks) ✅
- [ ] **Phase 3**: Input Sanitization (4 tasks) ✅
- [ ] **Phase 4**: Security Alerting (3 tasks) ✅
- [ ] All tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Security audit logs generating
- [ ] Documentation complete

---

## Handoff to Epic 3.7

**Epic 3.7 Compliance & Validation will add**:
1. Supply chain verification (npm provenance, SBOM)
2. Rate limiting & quota tracking
3. DCMA/DFARS audit logging
4. Deno sandbox execution environment

**Files Epic 3.7 needs**:
- `packages/mcp-gateway/src/core/gateway.ts` (extend with rate limiting)
- `packages/mcp-gateway/src/alerting/alert-manager.ts` (add audit log routing)
