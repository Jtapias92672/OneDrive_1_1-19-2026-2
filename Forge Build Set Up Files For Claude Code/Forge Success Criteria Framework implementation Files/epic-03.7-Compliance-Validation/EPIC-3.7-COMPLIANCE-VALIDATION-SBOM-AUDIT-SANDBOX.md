# Epic 3.7: Compliance & Validation

**Duration:** 5 days  
**Token Budget:** 40K tokens  
**Status:** Not Started  
**Dependencies:** Epic 3.6 (Security Controls)  
**Blocks:** Epic 3.75 (Code Execution)

---

## Epic Goal

Establish supply chain security, rate limiting, DCMA/DFARS audit logging, and sandbox execution to complete the MCP Gateway's compliance and validation layer. This epic implements the final 4 critical security controls before transitioning to code-first optimization.

---

## Context: Why This Epic is CRITICAL

### Compliance Requirements
- **SOC 2 Type II**: Requires audit trails, change management, integrity verification
- **DCMA/DFARS**: Defense contractors must demonstrate code provenance
- **Supply Chain Attacks**: npm ecosystem had 437K+ affected packages (CVE-2025-6514)

### Security Gaps Addressed by This Epic
1. ✅ **Supply Chain Verification** - npm provenance, SBOM generation, package signing
2. ✅ **Rate Limiting** - Prevent DoS attacks and quota exhaustion
3. ✅ **DCMA/DFARS Audit Logging** - Evidence binding for defense contractor compliance
4. ✅ **Sandbox Execution** - Deno runtime for untrusted code isolation

### Remaining Gaps (Epic 3.75)
- Code-first execution pattern (98% token reduction)
- Deno code generation
- Fallback to traditional MCP

---

## User Stories

### US-3.7.1: Supply Chain Verification
**As a** security officer  
**I want** npm package provenance verification and SBOM generation  
**So that** supply chain attacks are detected before deployment

**Acceptance Criteria:**
- [ ] npm provenance verification (npm registry signatures)
- [ ] SBOM generation (CycloneDX format)
- [ ] Package signing with GPG keys
- [ ] Vulnerability scanning integration (npm audit)

**Implementation Pattern:**
```typescript
// packages/mcp-gateway/src/supply-chain/verifier.ts
export class SupplyChainVerifier {
  async verifyPackage(packageName: string, version: string): Promise<VerificationResult> {
    // Step 1: Check npm provenance
    const provenance = await this.checkProvenance(packageName, version);
    if (!provenance.valid) {
      throw new ProvenanceError(`Package ${packageName}@${version} has no valid provenance`);
    }
    
    // Step 2: Scan for vulnerabilities
    const vulns = await this.scanVulnerabilities(packageName, version);
    if (vulns.critical > 0) {
      throw new VulnerabilityError(`Package has ${vulns.critical} critical vulnerabilities`);
    }
    
    // Step 3: Generate SBOM
    const sbom = await this.generateSBOM(packageName, version);
    
    return {
      verified: true,
      provenance,
      vulnerabilities: vulns,
      sbom,
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:supply-chain
```

---

### US-3.7.2: Rate Limiting & Quota Tracking
**As a** platform operator  
**I want** rate limiting on MCP tool calls  
**So that** no single user can exhaust system resources

**Acceptance Criteria:**
- [ ] Per-user rate limits (requests per minute/hour/day)
- [ ] Per-tool rate limits
- [ ] Quota tracking (monthly token usage)
- [ ] Rate limit headers in responses

**Rate Limit Configuration:**
```typescript
// packages/mcp-gateway/src/rate-limit/config.ts
export const RATE_LIMITS = {
  // Per-user limits
  user: {
    perMinute: 100,
    perHour: 1000,
    perDay: 5000,
  },
  
  // Per-tool limits (HIGH risk tools)
  tools: {
    'database_query': { perMinute: 10 },
    'shell_exec': { perMinute: 5 },
    'file_delete': { perMinute: 2 },
  },
  
  // Quota limits
  quota: {
    freeTeir: 100000,     // 100K tokens/month
    proTier: 1000000,     // 1M tokens/month
    enterpriseTier: null, // Unlimited
  },
};
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:rate-limiter
```

---

### US-3.7.3: DCMA/DFARS Audit Logging
**As a** compliance officer  
**I want** comprehensive audit logs with evidence binding  
**So that** DCMA/DFARS audits can be passed

**Acceptance Criteria:**
- [ ] Structured audit log format (JSON Lines)
- [ ] Evidence binding (cryptographic signatures)
- [ ] Log retention (7 years for defense contractors)
- [ ] Tamper-proof log storage

**Audit Log Format:**
```json
{
  "timestamp": "2026-01-22T20:00:00.000Z",
  "eventType": "TOOL_EXECUTION",
  "userId": "user_abc123",
  "tenantId": "tenant_xyz789",
  "tool": "github_push",
  "riskLevel": "CRITICAL",
  "approvalStatus": "APPROVED",
  "approvedBy": "manager_def456",
  "input": { "repo": "acme/codebase", "branch": "main" },
  "output": { "success": true, "commitSha": "a1b2c3d4" },
  "evidence": {
    "carsAssessment": { "riskLevel": "CRITICAL", "reasoning": "..." },
    "approvalToken": "...",
    "toolFingerprint": "sha256:...",
  },
  "signature": "..." // HMAC-SHA256 of entire log entry
}
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:audit-logger
```

---

### US-3.7.4: Sandbox Execution Environment
**As a** security architect  
**I want** untrusted code executed in a Deno sandbox  
**So that** malicious code cannot escape isolation

**Acceptance Criteria:**
- [ ] Deno runtime setup (isolated filesystem, no network by default)
- [ ] Sandbox executor (execute code with resource limits)
- [ ] Security policy enforcement (permissions model)
- [ ] Timeout handling (30s default, configurable)

**Sandbox Configuration:**
```typescript
// packages/mcp-gateway/src/sandbox/config.ts
export const SANDBOX_CONFIG = {
  runtime: 'deno',
  permissions: {
    read: false,   // No filesystem read by default
    write: false,  // No filesystem write by default
    net: false,    // No network access by default
    env: false,    // No environment variable access
  },
  limits: {
    memory: 512 * 1024 * 1024,  // 512 MB
    cpu: 1000,                   // 1 CPU core
    timeout: 30000,              // 30 seconds
  },
};
```

**Verification:**
```bash
pnpm --filter @forge/mcp-gateway test:sandbox
```

---

## Key Deliverables

```
packages/mcp-gateway/
├── src/
│   ├── supply-chain/
│   │   ├── verifier.ts              # npm provenance verification
│   │   ├── sbom-generator.ts        # CycloneDX SBOM generation
│   │   ├── package-signer.ts        # GPG package signing
│   │   └── vuln-scanner.ts          # Vulnerability scanning
│   ├── rate-limit/
│   │   ├── rate-limiter.ts          # Token bucket algorithm
│   │   ├── quota-tracker.ts         # Monthly quota tracking
│   │   └── limit-config.ts          # Per-user/tool limits
│   ├── audit/
│   │   ├── audit-logger.ts          # Structured logging
│   │   ├── evidence-binder.ts       # Cryptographic signatures
│   │   └── log-retention.ts         # 7-year retention for DCMA
│   └── sandbox/
│       ├── deno-runtime.ts          # Deno sandbox setup
│       ├── executor.ts              # Code execution
│       ├── permissions.ts           # Security policy
│       └── timeout-handler.ts       # Execution timeout
├── tests/
│   ├── supply-chain.test.ts
│   ├── rate-limit.test.ts
│   ├── audit-logger.test.ts
│   └── sandbox.test.ts
├── package.json
└── README.md
```

---

## Completion Criteria

- [ ] All 4 User Stories implemented
- [ ] Supply chain verification active (npm provenance + SBOM)
- [ ] Rate limiting enforced (per-user + per-tool)
- [ ] DCMA/DFARS audit logs generating
- [ ] Deno sandbox operational
- [ ] All unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Handoff to Epic 3.75 ready

---

## Handoff Context for Epic 3.75

**What Epic 3.75 needs to know:**

**Sandbox Entry Point:**
```typescript
import { DenoSandbox } from '@forge/mcp-gateway/sandbox';

const sandbox = new DenoSandbox({
  permissions: { net: ['api.github.com'], read: ['/tmp'] },
  limits: { timeout: 30000, memory: 512 * 1024 * 1024 },
});

await sandbox.execute(code);
```

**What Epic 3.75 will add:**
1. Code-first pattern (98% token reduction)
2. TypeScript code generation from MCP tools
3. Fallback to traditional MCP on code execution failure
4. Gateway integration for code-first execution

**Files to reference:**
- `packages/mcp-gateway/src/sandbox/deno-runtime.ts` - Deno sandbox
- `packages/mcp-gateway/src/audit/audit-logger.ts` - Log code execution
- `packages/mcp-gateway/src/rate-limit/rate-limiter.ts` - Rate limit code execution

---

## Verification Script

```bash
#!/bin/bash
# verify-epic-3.7.sh

set -e

echo "🔍 Verifying Epic 3.7: Compliance & Validation"

# Check package structure
if [ ! -d "packages/mcp-gateway" ]; then
  echo "❌ mcp-gateway package missing"
  exit 1
fi

# Check core files
required_files=(
  "packages/mcp-gateway/src/supply-chain/verifier.ts"
  "packages/mcp-gateway/src/rate-limit/rate-limiter.ts"
  "packages/mcp-gateway/src/audit/audit-logger.ts"
  "packages/mcp-gateway/src/sandbox/deno-runtime.ts"
  "packages/mcp-gateway/package.json"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Build
echo "📦 Building mcp-gateway..."
pnpm --filter @forge/mcp-gateway build

# Run tests
echo "🧪 Running tests..."
pnpm --filter @forge/mcp-gateway test

# Verify supply chain
echo "🔐 Verifying supply chain..."
pnpm --filter @forge/mcp-gateway test:supply-chain

# Verify rate limiting
echo "⏱️  Verifying rate limiting..."
pnpm --filter @forge/mcp-gateway test:rate-limiter

# Verify audit logging
echo "📋 Verifying audit logging..."
pnpm --filter @forge/mcp-gateway test:audit-logger

# Verify sandbox
echo "🏖️  Verifying Deno sandbox..."
pnpm --filter @forge/mcp-gateway test:sandbox

echo ""
echo "✅ Epic 3.7 verification complete"
echo "✅ Supply chain verification operational"
echo "✅ Rate limiting enforced"
echo "✅ DCMA/DFARS audit logs generating"
echo "✅ Deno sandbox active"
echo ""
echo "📋 Ready for Epic 3.75: Code Execution Layer"
```

---

## ROI Analysis

**Development Investment**:
- Epic 3.7: 40K tokens × $0.02 = $800

**Compliance Value**:
- **SOC 2 audit savings**: $50,000+ (avoid manual evidence gathering)
- **DCMA/DFARS penalties avoided**: $500,000+ (non-compliance fines)
- **Supply chain breach prevented**: $7.5M+ (industry average breach cost)

**Operational Savings**:
- **Rate limiting**: Prevent $10K/month in abusive usage
- **Audit automation**: Save 160 hours/year of manual audit work

**Total Value**: $8M+ in risk mitigation + $50K in audit savings

**ROI**: 10,000%+ (conservative)
