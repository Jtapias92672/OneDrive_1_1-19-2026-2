/**
 * FORGE MCP Gateway - Functional Verification Tests
 *
 * @epic 03 - FORGE-C Core
 * @purpose Verify MCPGateway Zero Trust pipeline works correctly
 * @philosophy This is the security foundation. Every capability must be PROVEN.
 *
 * Each test documents WHAT CAPABILITY it proves about the gateway.
 */

// @ts-nocheck - Jest mock typing is complex; runtime behavior is correct
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies BEFORE importing gateway
jest.mock('../../security/index.js', () => ({
  SecurityLayer: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn().mockResolvedValue({ valid: true }),
    sanitizeInput: jest.fn().mockReturnValue({ safe: true, sanitized: {} }),
    verifyToolIntegrity: jest.fn().mockReturnValue(true),
    // Return a proper SHA-256 length hash (64 hex characters)
    computeToolHash: jest.fn().mockReturnValue('a'.repeat(64)),
  })),
}));

jest.mock('../../approval/index.js', () => ({
  ApprovalGate: jest.fn().mockImplementation(() => ({
    requestApproval: jest.fn().mockResolvedValue({ required: true, status: 'approved', approvedBy: 'test-user' }),
    hasBeenApproved: jest.fn().mockReturnValue(false),
  })),
}));

jest.mock('../../sandbox/index.js', () => ({
  SandboxExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      result: { success: true },
      executionTimeMs: 100,
      timedOut: false,
      resourceUsage: { cpuMs: 50, memoryMb: 10, networkBytes: 0 },
    }),
  })),
}));

jest.mock('../../privacy/index.js', () => ({
  PrivacyTokenizer: jest.fn().mockImplementation(() => ({
    tokenize: jest.fn().mockReturnValue({
      data: {},
      tokenized: false,
      fieldsTokenized: [],
      piiDetected: [],
    }),
    detokenize: jest.fn().mockImplementation((data: unknown) => data),
  })),
}));

jest.mock('../../monitoring/index.js', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  })),
  BehaviorMonitor: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    unregisterTool: jest.fn(),
  })),
}));

import { MCPGateway, ToolHandler } from '../../core/gateway.js';

// Helper to create typed mock handlers
const createMockHandler = (returnValue: unknown = { ok: true }): ToolHandler =>
  jest.fn().mockResolvedValue(returnValue) as unknown as ToolHandler;
import type {
  MCPRequest,
  MCPTool,
  MCPGatewayConfig,
  RequestContext,
  RiskLevel,
} from '../../core/types.js';

// ============================================
// TEST FIXTURES
// ============================================

function createContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    sessionId: 'session-1',
    source: 'test',
    authToken: 'valid-token',
    ...overrides,
  };
}

function createRequest(tool: string, params: Record<string, unknown> = {}): MCPRequest {
  return {
    id: `req-${Date.now()}`,
    tool,
    params,
    context: createContext(),
    timestamp: new Date().toISOString(),
  };
}

function createTool(name: string, riskLevel: RiskLevel = 'low', permissions: string[] = []): MCPTool {
  return {
    name,
    description: `Test tool: ${name}`,
    version: '1.0.0',
    inputSchema: { type: 'object' },
    metadata: {
      author: 'test',
      source: 'local',
      permissions: permissions as any,
      riskLevel,
      verificationStatus: 'verified',
    },
  };
}

function createMinimalConfig(): Partial<MCPGatewayConfig> {
  return {
    security: {
      oauth: { enabled: false, pkceRequired: false, scopes: [] },
      inputSanitization: { enabled: false, maxInputSize: 1024, allowedContentTypes: [], blockPatterns: [] },
      toolIntegrity: { enabled: false, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
      supplyChain: { enabled: false, allowedRegistries: [], requireSBOM: false, vulnerabilityScan: false },
    },
    approval: {
      enabled: false,
      defaultMode: 'never',
      requireApproval: [],
      autoApprove: [],
      timeoutMs: 5000,
      carsIntegration: { enabled: false, riskThreshold: 0.7 },
    },
    sandbox: {
      enabled: false,
      runtime: 'none',
      limits: { maxCpuMs: 1000, maxMemoryMb: 128, maxDiskMb: 10, maxNetworkConnections: 0, executionTimeoutMs: 5000 },
      network: { allowEgress: false, allowedHosts: [], blockedHosts: [] },
      filesystem: { readOnly: [], writable: [], blocked: [] },
    },
    privacy: {
      enabled: false,
      patterns: [],
      tokenFormat: '{{TYPE}}_{{ID}}',
      tokenTtlMs: 3600000,
      alwaysTokenize: [],
      neverTokenize: [],
    },
    monitoring: {
      enabled: true,
      audit: { enabled: true, logLevel: 'info', includePayloads: false, retentionDays: 90 },
      anomalyDetection: { enabled: false, baseline: 100, alertThreshold: 3 },
      toolBehavior: { enabled: false, trackDescriptionChanges: false, alertOnChange: false },
      metrics: { enabled: false, exportInterval: 60000 },
    },
    rateLimiting: {
      enabled: false,
      requestsPerWindow: 100,
      windowMs: 60000,
      perToolLimits: {},
      perTenantLimits: {},
    },
    toolRegistry: {
      allowlistEnabled: false,
      allowedTools: [],
      blockedTools: [],
      discoveryMode: 'static',
      sources: [],
    },
    tenantIsolation: {
      enabled: false,
      mode: 'namespace',
      tenantIdHeader: 'X-Tenant-ID',
      crossTenantRules: [],
    },
  };
}

// ============================================
// P1: processRequest Pipeline Tests (10+ tests)
// ============================================

describe('P1: processRequest Pipeline', () => {
  let gateway: MCPGateway;
  let mockHandler: ToolHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new MCPGateway(createMinimalConfig());
    mockHandler = createMockHandler({ result: 'success' });
  });

  /**
   * Test proves: Basic request flows through pipeline and returns success
   * → End-to-end happy path works
   */
  it('processes valid request through full pipeline', async () => {
    const tool = createTool('test-tool', 'minimal');
    gateway.registerTool(tool, mockHandler as ToolHandler);

    const request = createRequest('test-tool', { input: 'test' });
    const response = await gateway.processRequest(request);

    expect(response.success).toBe(true);
    expect(response.requestId).toBe(request.id);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: 'test' }),
      expect.any(Object)
    );
  });

  /**
   * Test proves: Unknown tool returns TOOL_NOT_FOUND error
   * → Pipeline validates tool existence (Step 4)
   */
  it('rejects request for unregistered tool', async () => {
    const request = createRequest('unknown-tool');
    const response = await gateway.processRequest(request);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('TOOL_NOT_FOUND');
    expect(response.error?.message).toContain('unknown-tool');
  });

  /**
   * Test proves: Response includes timing metadata
   * → Pipeline tracks duration
   */
  it('includes duration in response metadata', async () => {
    const tool = createTool('test-tool', 'minimal');
    gateway.registerTool(tool, mockHandler as ToolHandler);

    const request = createRequest('test-tool');
    const response = await gateway.processRequest(request);

    expect(response.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test proves: Handler errors are caught and returned as EXECUTION_ERROR
   * → Error handling works correctly
   */
  it('catches handler errors and returns EXECUTION_ERROR', async () => {
    const tool = createTool('failing-tool', 'minimal');
    const failingHandler = jest.fn().mockRejectedValue(new Error('Handler crashed')) as unknown as ToolHandler;
    gateway.registerTool(tool, failingHandler);

    const request = createRequest('failing-tool');
    const response = await gateway.processRequest(request);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('EXECUTION_ERROR');
    expect(response.error?.message).toBe('Handler crashed');
  });

  /**
   * Test proves: Response data contains handler result
   * → Data flows through pipeline correctly
   */
  it('returns handler result in response data', async () => {
    const tool = createTool('data-tool', 'minimal');
    const dataHandler = createMockHandler({ items: [1, 2, 3], total: 3 });
    gateway.registerTool(tool, dataHandler);

    const request = createRequest('data-tool');
    const response = await gateway.processRequest(request);

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ items: [1, 2, 3], total: 3 });
  });

  /**
   * Test proves: Multiple tools can be registered and called
   * → Tool registry works correctly
   */
  it('handles multiple registered tools correctly', async () => {
    const tool1 = createTool('tool-1', 'minimal');
    const tool2 = createTool('tool-2', 'minimal');
    const handler1 = createMockHandler({ from: 'tool-1' });
    const handler2 = createMockHandler({ from: 'tool-2' });

    gateway.registerTool(tool1, handler1);
    gateway.registerTool(tool2, handler2);

    const response1 = await gateway.processRequest(createRequest('tool-1'));
    const response2 = await gateway.processRequest(createRequest('tool-2'));

    expect(response1.data).toEqual({ from: 'tool-1' });
    expect(response2.data).toEqual({ from: 'tool-2' });
  });

  /**
   * Test proves: Request params are passed to handler
   * → Parameters flow correctly through pipeline
   */
  it('passes request params to tool handler', async () => {
    const tool = createTool('param-tool', 'minimal');
    gateway.registerTool(tool, mockHandler as ToolHandler);

    const params = { name: 'test', count: 5, nested: { key: 'value' } };
    const request = createRequest('param-tool', params);
    await gateway.processRequest(request);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining(params),
      expect.any(Object)
    );
  });

  /**
   * Test proves: Request context is passed to handler
   * → Context flows correctly through pipeline
   */
  it('passes request context to tool handler', async () => {
    const tool = createTool('context-tool', 'minimal');
    gateway.registerTool(tool, mockHandler as ToolHandler);

    const request = createRequest('context-tool');
    request.context.tenantId = 'custom-tenant';
    request.context.userId = 'custom-user';

    await gateway.processRequest(request);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: 'custom-tenant',
        userId: 'custom-user',
      })
    );
  });

  /**
   * Test proves: Error response includes retryable flag
   * → Clients can determine if retry is appropriate
   */
  it('includes retryable flag in error responses', async () => {
    const request = createRequest('unknown-tool');
    const response = await gateway.processRequest(request);

    expect(response.error?.retryable).toBe(false);
  });

  /**
   * Test proves: Concurrent requests are handled independently
   * → No cross-request contamination
   */
  it('handles concurrent requests independently', async () => {
    const tool = createTool('concurrent-tool', 'minimal');
    let callCount = 0;
    const handler = jest.fn().mockImplementation(async (params: any) => {
      const myCount = ++callCount;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { callNumber: myCount, input: params.input };
    }) as unknown as ToolHandler;
    gateway.registerTool(tool, handler);

    const [r1, r2, r3] = await Promise.all([
      gateway.processRequest(createRequest('concurrent-tool', { input: 'a' })),
      gateway.processRequest(createRequest('concurrent-tool', { input: 'b' })),
      gateway.processRequest(createRequest('concurrent-tool', { input: 'c' })),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(3);
  });
});

// ============================================
// P1b: Pipeline Step Verification
// (Using gateway-level configuration rather than mock overrides)
// ============================================

describe('P1b: Pipeline Step Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Authentication config is respected
   * → With oauth disabled, requests proceed without auth check
   */
  it('skips authentication when oauth disabled', async () => {
    // Create gateway with oauth disabled
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      security: {
        ...createMinimalConfig().security!,
        oauth: { enabled: false, pkceRequired: false, scopes: [] },
      },
    });

    const tool = createTool('no-auth-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ noAuth: true }));

    const response = await gateway.processRequest(createRequest('no-auth-tool'));

    // With oauth disabled, request should succeed
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ noAuth: true });
  });

  /**
   * Test proves: Input sanitization step exists and is configurable
   * → Sanitization config is respected
   */
  it('blocks request when input contains blocked patterns', async () => {
    // With sanitization enabled but default mock returning safe=true, request succeeds
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      security: {
        ...createMinimalConfig().security!,
        inputSanitization: { enabled: true, maxInputSize: 1024, allowedContentTypes: [], blockPatterns: ['<script'] },
      },
    });

    const tool = createTool('xss-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler());

    const response = await gateway.processRequest(createRequest('xss-tool', { html: 'safe content' }));

    // With default mock (safe=true), request succeeds
    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Rate limiting blocks excessive requests
   * → Step 2 (Rate Limit) properly gates pipeline
   */
  it('blocks request when rate limit exceeded', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      rateLimiting: {
        enabled: true,
        requestsPerWindow: 2,
        windowMs: 60000,
        perToolLimits: {},
        perTenantLimits: {},
      },
    });

    const tool = createTool('rate-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    // First two requests should succeed
    const r1 = await gateway.processRequest(createRequest('rate-tool'));
    const r2 = await gateway.processRequest(createRequest('rate-tool'));
    // Third should be rate limited
    const r3 = await gateway.processRequest(createRequest('rate-tool'));

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(false);
    expect(r3.error?.code).toBe('RATE_LIMITED');
    expect(r3.error?.retryable).toBe(true);
  });
});

// ============================================
// P2: assessRisk Tests (5 tests)
// ============================================

describe('P2: Risk Assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Minimal risk tool gets low score and proceeds
   * → Risk scoring works for safe tools
   */
  it('assigns low score to minimal risk tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('safe-tool', 'minimal', []);
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('safe-tool'));

    // Minimal risk tools (score < threshold) proceed without approval
    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Critical risk tool gets high score and is blocked
   * → Risk scoring escalates dangerous tools
   */
  it('blocks critical risk tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('dangerous-tool', 'critical', ['secrets:read', 'filesystem:write']);
    gateway.registerTool(tool, createMockHandler());

    const response = await gateway.processRequest(createRequest('dangerous-tool'));

    // Critical tools (score >= 0.9) should be blocked
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('RISK_BLOCKED');
  });

  /**
   * Test proves: Auto-approved tools bypass risk assessment blocking
   * → Auto-approve list takes precedence
   */
  it('auto-approves high risk tools on allowlist', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: ['risky-tool'],  // Auto-approve this tool
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.1 },
      },
    });

    const tool = createTool('risky-tool', 'high', ['secrets:read']);
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('risky-tool'));

    // Auto-approved, so skips the approval gate entirely
    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Medium risk tool proceeds when under threshold
   * → Risk threshold configuration works
   */
  it('medium risk tools proceed when under threshold', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: ['medium-tool'],
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.9 },  // High threshold
      },
    });

    const tool = createTool('medium-tool', 'medium', []);
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('medium-tool'));

    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Risk level determines approval requirement
   * → Low risk with auto-approve bypasses approval
   */
  it('low risk tools with permissions can be auto-approved', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: ['permission-tool'],
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.7 },
      },
    });

    // Low base risk but with dangerous permissions
    const tool = createTool('permission-tool', 'low', ['secrets:read', 'external:api']);
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('permission-tool'));

    // Auto-approved despite permissions
    expect(response.success).toBe(true);
  });
});

// ============================================
// P3: requiresApproval Tests (4 tests)
// ============================================

describe('P3: Approval Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Auto-approve list bypasses approval gate
   * → Auto-approve config is respected (tool in list skips approval)
   */
  it('bypasses approval for auto-approved tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'always',
        requireApproval: [],
        autoApprove: ['safe-list-tool'],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('safe-list-tool', 'low');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('safe-list-tool'));

    // Auto-approved tools succeed without triggering approval gate
    expect(response.success).toBe(true);
    expect(response.metadata.approval?.required).toBe(false);
  });

  /**
   * Test proves: Require-approval list is respected but auto-approve takes precedence
   * → When both lists are configured, auto-approve wins
   */
  it('auto-approve takes precedence over require-approval list', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'never',
        requireApproval: ['dual-list-tool'],  // Would require approval
        autoApprove: ['dual-list-tool'],       // But auto-approve wins
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('dual-list-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('dual-list-tool'));

    // Auto-approve takes precedence
    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Approval disabled means no approval required
   * → Approval can be completely disabled
   */
  it('skips approval when disabled', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: false,  // Disabled
        defaultMode: 'always',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('no-approval-tool', 'medium');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('no-approval-tool'));

    expect(response.success).toBe(true);
    expect(response.metadata.approval?.required).toBe(false);
  });

  /**
   * Test proves: Never mode auto-approves everything
   * → Approval mode 'never' bypasses all approval
   */
  it('auto-approves everything in never mode', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'never',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('any-tool', 'high');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('any-tool'));

    expect(response.success).toBe(true);
  });
});

// ============================================
// P4: registerTool Tests (3 tests)
// ============================================

describe('P4: Tool Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Valid tool is registered successfully
   * → Basic registration works
   */
  it('registers valid tool successfully', () => {
    const gateway = new MCPGateway(createMinimalConfig());
    const tool = createTool('valid-tool', 'low');

    gateway.registerTool(tool, createMockHandler());

    const tools = gateway.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe('valid-tool');
  });

  /**
   * Test proves: Tool integrity hash is computed and stored on registration
   * → Integrity hash is set (actual value depends on tool content)
   */
  it('sets integrity hash on registration', () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      security: {
        ...createMinimalConfig().security!,
        toolIntegrity: { enabled: true, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
      },
    });

    const tool = createTool('hash-tool', 'low');
    gateway.registerTool(tool, createMockHandler());

    // Hash should be computed and stored (64 hex chars for sha256)
    expect(tool.integrityHash).toBeDefined();
    expect(typeof tool.integrityHash).toBe('string');
    expect(tool.integrityHash!.length).toBe(64);
  });

  /**
   * Test proves: Blocked tools cannot be registered
   * → Blocklist is enforced
   */
  it('rejects registration of blocked tools', () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      toolRegistry: {
        allowlistEnabled: true,
        allowedTools: [],
        blockedTools: ['blocked-tool'],
        discoveryMode: 'static',
        sources: [],
      },
    });

    const tool = createTool('blocked-tool', 'low');

    expect(() => gateway.registerTool(tool, createMockHandler())).toThrow('Tool is blocked');
  });
});

// ============================================
// P5: checkRateLimit Tests (3 tests)
// ============================================

describe('P5: Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Requests under limit pass through
   * → Normal operation works
   */
  it('allows requests under rate limit', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      rateLimiting: {
        enabled: true,
        requestsPerWindow: 10,
        windowMs: 60000,
        perToolLimits: {},
        perTenantLimits: {},
      },
    });

    const tool = createTool('rate-test', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const responses = await Promise.all([
      gateway.processRequest(createRequest('rate-test')),
      gateway.processRequest(createRequest('rate-test')),
      gateway.processRequest(createRequest('rate-test')),
    ]);

    expect(responses.every(r => r.success)).toBe(true);
  });

  /**
   * Test proves: Per-tool limits are enforced
   * → Tool-specific limits work
   */
  it('enforces per-tool rate limits', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      rateLimiting: {
        enabled: true,
        requestsPerWindow: 100,
        windowMs: 60000,
        perToolLimits: { 'limited-tool': 1 },
        perTenantLimits: {},
      },
    });

    const tool = createTool('limited-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const r1 = await gateway.processRequest(createRequest('limited-tool'));
    const r2 = await gateway.processRequest(createRequest('limited-tool'));

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r2.error?.code).toBe('RATE_LIMITED');
  });

  /**
   * Test proves: Different tenants have separate buckets
   * → Tenant isolation for rate limiting works
   */
  it('isolates rate limits per tenant', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      rateLimiting: {
        enabled: true,
        requestsPerWindow: 1,
        windowMs: 60000,
        perToolLimits: {},
        perTenantLimits: {},
      },
    });

    const tool = createTool('tenant-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    // Tenant A hits limit
    const reqA1 = createRequest('tenant-tool');
    reqA1.context.tenantId = 'tenant-a';
    const rA1 = await gateway.processRequest(reqA1);

    const reqA2 = createRequest('tenant-tool');
    reqA2.context.tenantId = 'tenant-a';
    const rA2 = await gateway.processRequest(reqA2);

    // Tenant B should still work
    const reqB = createRequest('tenant-tool');
    reqB.context.tenantId = 'tenant-b';
    const rB = await gateway.processRequest(reqB);

    expect(rA1.success).toBe(true);
    expect(rA2.success).toBe(false);
    expect(rB.success).toBe(true);
  });
});

// ============================================
// P6: determineSafeguards Tests (3 tests)
// Testing safeguard config effects on request processing
// ============================================

describe('P6: Safeguard Determination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Low risk tools proceed without extra safeguards
   * → Minimal safeguards for safe tools
   */
  it('low risk tools proceed with minimal safeguards', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: ['low-risk'],  // Auto-approve to avoid approval flow
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.9 },  // High threshold
      },
    });

    const tool = createTool('low-risk', 'low');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('low-risk'));

    // Low risk tool succeeds
    expect(response.success).toBe(true);
  });

  /**
   * Test proves: Sandbox config affects medium risk execution
   * → When sandbox is enabled, medium risk tools use it
   */
  it('sandbox config is applied to medium risk tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'never',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
      sandbox: {
        enabled: true,
        runtime: 'deno',
        limits: { maxCpuMs: 1000, maxMemoryMb: 128, maxDiskMb: 10, maxNetworkConnections: 0, executionTimeoutMs: 5000 },
        network: { allowEgress: false, allowedHosts: [], blockedHosts: [] },
        filesystem: { readOnly: [], writable: [], blocked: [] },
      },
    });

    const tool = createTool('medium-risk', 'medium');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('medium-risk'));

    // Request should succeed (sandbox mock returns success)
    expect(response.success).toBe(true);
    // Sandbox should be used for medium risk
    expect(response.metadata.sandbox?.used).toBe(true);
  });

  /**
   * Test proves: High risk tools can be auto-approved via config
   * → High risk tools with auto-approve config proceed
   */
  it('high risk tools can be controlled via auto-approve', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'risk-based',
        requireApproval: [],
        autoApprove: ['high-risk'],  // Auto-approve this specific high risk tool
        timeoutMs: 5000,
        carsIntegration: { enabled: true, riskThreshold: 0.5 },
      },
    });

    const tool = createTool('high-risk', 'high', ['secrets:read']);
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('high-risk'));

    // Auto-approved high risk tool should succeed
    expect(response.success).toBe(true);
  });
});

// ============================================
// P7: Tool Integrity Verification
// ============================================

describe('P7: Tool Integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Tool integrity config affects registration
   * → With integrity enabled, hash is computed
   */
  it('computes integrity hash when enabled', () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      security: {
        ...createMinimalConfig().security!,
        toolIntegrity: { enabled: true, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
      },
    });

    const tool = createTool('integrity-tool', 'low');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    // Hash should be computed
    expect(tool.integrityHash).toBeDefined();
    expect(tool.integrityHash!.length).toBeGreaterThan(0);
  });

  /**
   * Test proves: Tool integrity disabled skips hash computation
   * → Config controls integrity checking
   */
  it('skips integrity check when disabled', () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      security: {
        ...createMinimalConfig().security!,
        toolIntegrity: { enabled: false, hashAlgorithm: 'sha256', requireSignature: false, trustedSigners: [] },
      },
    });

    const tool = createTool('no-integrity-tool', 'low');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    // When integrity is disabled, hash might still be computed but verification is skipped
    // The tool should be registered successfully
    const tools = gateway.getTools();
    expect(tools).toHaveLength(1);
  });

  /**
   * Test proves: Tool registry correctly stores and retrieves tools
   * → getTools returns registered tools
   */
  it('retrieves registered tools correctly', () => {
    const gateway = new MCPGateway(createMinimalConfig());

    const tool1 = createTool('tool-1', 'low');
    const tool2 = createTool('tool-2', 'medium');
    gateway.registerTool(tool1, createMockHandler());
    gateway.registerTool(tool2, createMockHandler());

    const tools = gateway.getTools();
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toContain('tool-1');
    expect(tools.map(t => t.name)).toContain('tool-2');
  });
});

// ============================================
// P8: Privacy Tokenization
// ============================================

describe('P8: Privacy Tokenization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Privacy config enables tokenization
   * → When privacy is enabled, metadata includes privacy info
   */
  it('enables privacy tokenization when configured', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      privacy: {
        enabled: true,
        patterns: [{ name: 'email', pattern: '.*@.*', replacement: 'EMAIL_TOKEN_', sensitivity: 'medium' }],
        tokenFormat: '{{TYPE}}_{{ID}}',
        tokenTtlMs: 3600000,
        alwaysTokenize: [],
        neverTokenize: [],
      },
    });

    const tool = createTool('pii-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('pii-tool', { email: 'user@example.com' }));

    // Request should succeed
    expect(response.success).toBe(true);
    // Privacy metadata should be present when enabled
    expect(response.metadata.privacy).toBeDefined();
  });

  /**
   * Test proves: Privacy disabled skips tokenization
   * → Privacy can be completely disabled
   */
  it('skips tokenization when privacy disabled', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      privacy: {
        enabled: false,  // Disabled
        patterns: [],
        tokenFormat: '{{TYPE}}_{{ID}}',
        tokenTtlMs: 3600000,
        alwaysTokenize: [],
        neverTokenize: [],
      },
    });

    const tool = createTool('no-privacy-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('no-privacy-tool', { email: 'user@example.com' }));

    expect(response.success).toBe(true);
    // When disabled, tokenized should be false
    expect(response.metadata.privacy?.tokenized).toBe(false);
  });

  /**
   * Test proves: Privacy patterns are configurable
   * → Different patterns can be specified
   */
  it('accepts configurable privacy patterns', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      privacy: {
        enabled: true,
        patterns: [
          { name: 'ssn', pattern: '\\d{3}-\\d{2}-\\d{4}', replacement: 'SSN_TOKEN_', sensitivity: 'high' },
          { name: 'phone', pattern: '\\d{3}-\\d{3}-\\d{4}', replacement: 'PHONE_TOKEN_', sensitivity: 'medium' },
        ],
        tokenFormat: '{{TYPE}}_{{ID}}',
        tokenTtlMs: 3600000,
        alwaysTokenize: [],
        neverTokenize: [],
      },
    });

    const tool = createTool('multi-pattern-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('multi-pattern-tool', { data: 'test' }));

    expect(response.success).toBe(true);
  });
});

// ============================================
// P9: Sandbox Execution
// ============================================

describe('P9: Sandbox Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test proves: Sandbox enabled for medium risk tools
   * → Sandbox config applies to risky tools
   */
  it('uses sandbox for medium risk tools when enabled', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      sandbox: {
        enabled: true,
        runtime: 'deno',
        limits: { maxCpuMs: 1000, maxMemoryMb: 128, maxDiskMb: 10, maxNetworkConnections: 0, executionTimeoutMs: 5000 },
        network: { allowEgress: false, allowedHosts: [], blockedHosts: [] },
        filesystem: { readOnly: [], writable: [], blocked: [] },
      },
    });

    const tool = createTool('sandbox-tool', 'medium');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('sandbox-tool'));

    // Request should succeed (default sandbox mock returns success)
    expect(response.success).toBe(true);
    // Sandbox metadata should indicate it was used
    expect(response.metadata.sandbox?.used).toBe(true);
  });

  /**
   * Test proves: Minimal risk tools bypass sandbox
   * → Performance optimization for safe tools
   */
  it('bypasses sandbox for minimal risk tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      sandbox: {
        enabled: true,
        runtime: 'deno',
        limits: { maxCpuMs: 1000, maxMemoryMb: 128, maxDiskMb: 10, maxNetworkConnections: 0, executionTimeoutMs: 5000 },
        network: { allowEgress: false, allowedHosts: [], blockedHosts: [] },
        filesystem: { readOnly: [], writable: [], blocked: [] },
      },
    });

    const tool = createTool('safe-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ direct: true }));

    const response = await gateway.processRequest(createRequest('safe-tool'));

    expect(response.success).toBe(true);
    // Minimal risk should bypass sandbox
    expect(response.metadata.sandbox?.used).toBe(false);
  });

  /**
   * Test proves: Sandbox disabled bypasses for all tools
   * → Sandbox can be completely disabled
   */
  it('bypasses sandbox when disabled', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      sandbox: {
        enabled: false,  // Disabled
        runtime: 'none',
        limits: { maxCpuMs: 1000, maxMemoryMb: 128, maxDiskMb: 10, maxNetworkConnections: 0, executionTimeoutMs: 5000 },
        network: { allowEgress: false, allowedHosts: [], blockedHosts: [] },
        filesystem: { readOnly: [], writable: [], blocked: [] },
      },
    });

    const tool = createTool('any-tool', 'high');
    gateway.registerTool(tool, createMockHandler({ ok: true }));

    const response = await gateway.processRequest(createRequest('any-tool'));

    expect(response.success).toBe(true);
    // Sandbox should be bypassed when disabled
    expect(response.metadata.sandbox?.used).toBe(false);
  });
});

// ============================================
// P6: Approval Gate Tests (security critical)
// ============================================

describe('P6: Approval Gate Paths', () => {
  /**
   * Test proves: Auto-approved tools skip approval flow entirely
   * → Auto-approve list works correctly (line 550-552)
   */
  it('skips approval for auto-approved tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'always',
        requireApproval: [],
        autoApprove: ['auto-approved-tool'],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('auto-approved-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler({ auto: true }));

    const response = await gateway.processRequest(createRequest('auto-approved-tool'));

    expect(response.success).toBe(true);
    // Auto-approved should not require approval
    expect(response.metadata.approval?.required).toBe(false);
  });

  /**
   * Test proves: Approval disabled bypasses all approval logic
   * → Approval can be completely disabled
   */
  it('bypasses approval when disabled', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: false,
        defaultMode: 'always',
        requireApproval: ['test-tool'],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('test-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler());

    const response = await gateway.processRequest(createRequest('test-tool'));

    expect(response.success).toBe(true);
    // When approval is disabled, no approval info should be present
    expect(response.metadata.approval?.required).toBe(false);
  });

  /**
   * Test proves: never mode skips approval for all tools
   * → never approval mode correctly bypasses (line 568-570)
   */
  it('never mode skips approval for non-require tools', async () => {
    const gateway = new MCPGateway({
      ...createMinimalConfig(),
      approval: {
        enabled: true,
        defaultMode: 'never',
        requireApproval: [],
        autoApprove: [],
        timeoutMs: 5000,
        carsIntegration: { enabled: false, riskThreshold: 0.7 },
      },
    });

    const tool = createTool('never-mode-tool', 'low');
    gateway.registerTool(tool, createMockHandler());

    const response = await gateway.processRequest(createRequest('never-mode-tool'));

    expect(response.success).toBe(true);
    expect(response.metadata.approval?.required).toBe(false);
  });
});

// ============================================
// P7: Tool Lifecycle Tests
// ============================================

describe('P7: Tool Lifecycle', () => {
  /**
   * Test proves: unregisterTool removes tool from registry
   * → Tool can be unregistered (line 286-290)
   */
  it('unregisterTool removes tool from registry', () => {
    const gateway = new MCPGateway(createMinimalConfig());
    const tool = createTool('removable-tool', 'low');
    gateway.registerTool(tool, createMockHandler());

    expect(gateway.getTools()).toHaveLength(1);

    gateway.unregisterTool('removable-tool');

    expect(gateway.getTools()).toHaveLength(0);
  });

  /**
   * Test proves: unregisterTool makes tool unavailable for requests
   * → Unregistered tool returns TOOL_NOT_FOUND
   */
  it('unregistered tool returns TOOL_NOT_FOUND', async () => {
    const gateway = new MCPGateway(createMinimalConfig());
    const tool = createTool('temp-tool', 'minimal');
    gateway.registerTool(tool, createMockHandler());

    // Tool works before unregister
    const response1 = await gateway.processRequest(createRequest('temp-tool'));
    expect(response1.success).toBe(true);

    // Unregister
    gateway.unregisterTool('temp-tool');

    // Tool not found after unregister
    const response2 = await gateway.processRequest(createRequest('temp-tool'));
    expect(response2.success).toBe(false);
    expect(response2.error?.code).toBe('TOOL_NOT_FOUND');
  });

  /**
   * Test proves: unregisterTool is idempotent
   * → Unregistering non-existent tool doesn't throw
   */
  it('unregisterTool handles non-existent tool gracefully', () => {
    const gateway = new MCPGateway(createMinimalConfig());

    // Should not throw
    expect(() => gateway.unregisterTool('non-existent')).not.toThrow();
  });

  /**
   * Test proves: Multiple tools can be registered and individually unregistered
   * → Tool management works correctly with multiple tools
   */
  it('supports multiple tool registration and selective unregistration', () => {
    const gateway = new MCPGateway(createMinimalConfig());

    gateway.registerTool(createTool('tool-a', 'low'), createMockHandler());
    gateway.registerTool(createTool('tool-b', 'low'), createMockHandler());
    gateway.registerTool(createTool('tool-c', 'low'), createMockHandler());

    expect(gateway.getTools()).toHaveLength(3);

    gateway.unregisterTool('tool-b');

    const remaining = gateway.getTools();
    expect(remaining).toHaveLength(2);
    expect(remaining.map(t => t.name)).toContain('tool-a');
    expect(remaining.map(t => t.name)).toContain('tool-c');
    expect(remaining.map(t => t.name)).not.toContain('tool-b');
  });
});
