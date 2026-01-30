# ADR-001: MCP Gateway Routing for All External API Calls

**Status:** Accepted
**Date:** 2026-01-30
**Skills Applied:** Architectural Entropy Detector
**Author:** Claude (Plan Mode) + Implementation Team

---

## Decision

**All Figma API calls MUST route through MCPGateway, not direct FigmaClient.**

Zero direct FigmaClient usages allowed in production code after Phase 1 complete.

---

## Context

### Problem

The direct FigmaClient bypasses all security controls:
- ❌ No OAuth validation (tokens in plaintext headers)
- ❌ No audit logging (no compliance trail for DCMA/DFARS)
- ❌ No tenant isolation (cross-tenant data leak risk)
- ❌ No rate limiting (DoS vulnerability)
- ❌ No input sanitization (XSS, injection attacks possible)
- ❌ No approval workflows (unauthorized operations)
- ❌ No sandbox execution (arbitrary code execution risk)

### Current State

`.mcp.json` has `defaultMode: "direct"` which bypasses the fully-implemented MCPGateway (768 lines, 10-step security pipeline).

Orchestrator already has conditional routing logic (lines 280-334), but gateway instance not passed through API route.

---

## When to Use Gateway

**ALWAYS in production environments:**
- `MCP_GATEWAY_ENABLED=true` in production
- When OAuth, audit logging, or tenant isolation required
- Any external API call that needs compliance trail

---

## When NOT to Use Gateway

**Local development ONLY:**
- `MCP_GATEWAY_ENABLED=false` for fast iteration (dev mode)
- Unit tests with mocks (not integration tests)
- **Never in staging or production**

---

## Maximum Instances Expected

**Target: 0 direct FigmaClient usages** in production code.

**Current (Phase 1):** TBD after ESLint scan
**Goal (Phase 1 complete):** 0 violations

---

## Prevention Mechanisms

### 1. ESLint Rule (Compile-Time)

`.eslintrc.gateway.js` blocks direct FigmaClient imports:
```javascript
'no-restricted-imports': ['error', {
  paths: [{
    name: '@/lib/integrations/figma/figma-client',
    importNames: ['FigmaClient'],
    message: 'Use gateway routing via setupMCPGateway(). See ADR-001.'
  }]
}]
```

### 2. Contract Tests (Runtime)

`gateway-contract.test.ts` validates orchestrator/gateway contract matches:
```typescript
expect(response).toMatchObject({
  output: expect.any(Object),  // FigmaFile
  metadata: { duration: expect.any(Number), toolId: 'figma_getFile' }
});
```

### 3. PR Review Checklist

- [ ] Gateway routing used (no direct FigmaClient)
- [ ] `MCP_GATEWAY_ENABLED` env var checked
- [ ] Contract tests pass
- [ ] ESLint passes (no restricted imports)

---

## The "100x Test" (Architectural Entropy Detector)

**Question:** If 100 developers each add one direct FigmaClient call, what happens?

**Result:**
- 100 unaudited API calls → **Compliance failure** (DCMA/DFARS violation)
- 100 security bypass vectors → **Vulnerability proliferation**
- 100 potential tenant isolation leaks → **Data breach risk**
- 100 rate limit bypasses → **DoS exposure**

**Conclusion:** **UNACCEPTABLE**. Must enforce single gateway path.

---

## Consequences

### Positive

- ✅ All external API calls secured (OAuth, audit, tenant isolation)
- ✅ Single enforcement point (easier to audit)
- ✅ Compliance-ready (DCMA/DFARS audit trail)
- ✅ Architectural clarity (no "sneaky bypasses")
- ✅ Performance measurable (all calls through same pipeline)

### Negative

- ❌ Local dev overhead (~30ms gateway latency)
  - **Mitigation:** Feature flag allows direct mode in dev
- ❌ Additional complexity (gateway setup in API route)
  - **Mitigation:** Lazy loading reduces cold start impact

---

## Implementation

### Phase 1 (Current)

1. Create `core/gateway-contract.ts` with Zod schemas
2. Create `.eslintrc.gateway.js` with restricted import rule
3. Modify API route to lazy-load gateway when `MCP_GATEWAY_ENABLED=true`
4. Create contract tests to validate orchestrator/gateway alignment

### Future Phases

- Phase 2: Enable audit logging
- Phase 3: Enable input sanitization
- Phase 4: Enable OAuth 2.1 + PKCE
- Phase 5: Enable approval gates (risk-based)
- Phase 6: Enable sandbox (production only)

---

## Verification

```bash
# Verify no direct FigmaClient imports
npx eslint src/ --config .eslintrc.gateway.js

# Run contract tests
npm test -- gateway-contract.test.ts

# Check environment variable
echo $MCP_GATEWAY_ENABLED  # Should be 'true' in prod
```

---

## References

- Plan: `/Users/jtapiasme.com/.claude/plans/noble-toasting-boole.md`
- Gateway Implementation: `/core/gateway.ts` (lines 1-768)
- Orchestrator Routing: `/packages/platform-ui/src/lib/poc/orchestrator.ts` (lines 280-334)
- Skills Applied: `docs/skills/architectural-entropy-detector.md`

---

## Supersedes

None (first ADR for MCP infrastructure)

---

## Changelog

- 2026-01-30: Initial decision (Phase 1 implementation)
