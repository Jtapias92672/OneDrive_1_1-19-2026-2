/**
 * CARS Comprehensive Scenario Tests
 *
 * @epic 3.5 - Gateway Foundation
 * @epic 3.6 - Security Controls
 * @epic 3.7 - Compliance & Validation
 *
 * @description
 *   Validates the CARS (Context-Aware Risk Scoring) framework under
 *   real-world conditions across 5 critical scenarios:
 *   1. Risk Level Escalation
 *   2. Deceptive Compliance Detection
 *   3. Reward Hacking Prevention
 *   4. Multi-Tenant Isolation Under CARS
 *   5. Evidence Binding Integrity
 *
 * @compliance
 *   - CMMC Level 3: SI-4 Information System Monitoring
 *   - CMMC Level 3: SI-7 Software, Firmware, and Information Integrity
 *   - DFARS 252.204-7012: Safeguarding Covered Defense Information
 *   - NIST SP 800-53: AU-2 Audit Events
 *   - NIST SP 800-53: AU-10 Non-repudiation
 *   - NIST SP 800-53: AC-4 Information Flow Enforcement
 */

import {
  CARSEngine,
  type ToolCallRequest,
  type RiskAssessment,
} from '../../cars/risk-assessment.js';
import {
  CARSRiskLevel,
  riskLevelToString,
  escalateRiskLevel,
  requiresApproval,
  shouldBlock,
} from '../../cars/risk-levels.js';
import type { CARSContext } from '../../cars/context.js';
import {
  DeceptiveComplianceDetector,
  type DeceptiveComplianceContext,
  type DeceptiveComplianceAction,
} from '../../cars/deceptive-compliance-detector.js';
import {
  RewardHackingDetector,
  type RewardHackingContext,
  type RewardHackingAction,
} from '../../cars/reward-hacking-detector.js';
import {
  CrossTenantLeakDetector,
  type LeakScanResult,
} from '../../tenant/leak-detector.js';
import {
  EvidenceBinder,
  type EvidenceBinding,
  type ValidationResult,
} from '../../audit/evidence-binding.js';
import type { AuditLogEntry, AuditEventType } from '../../audit/audit-logger.js';
import * as crypto from 'crypto';

// ============================================
// TEST UTILITIES
// ============================================

/**
 * Create mock audit entry for testing
 */
function createMockAuditEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  const content = JSON.stringify({
    id,
    timestamp,
    ...overrides,
  });
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const signature = crypto.createHmac('sha256', 'test-key').update(content).digest('hex');

  return {
    id,
    timestamp,
    timestampUs: Date.now() * 1000,
    eventType: 'TOOL_EXECUTION' as AuditEventType,
    outcome: 'SUCCESS',
    actor: {
      type: 'agent',
      id: 'test-agent',
      name: 'Test Agent',
    },
    details: {},
    hash,
    signature,
    correlationId: `corr_${Date.now()}`,
    ...overrides,
  } as AuditLogEntry;
}

/**
 * Session behavior tracker for alignment faking detection
 */
class SessionBehaviorTracker {
  private sessions: Map<string, {
    behaviors: string[];
    timestamps: string[];
    consistencyScore: number;
  }> = new Map();

  recordBehavior(sessionId: string, behavior: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        behaviors: [],
        timestamps: [],
        consistencyScore: 1.0,
      });
    }
    const session = this.sessions.get(sessionId)!;
    session.behaviors.push(behavior);
    session.timestamps.push(new Date().toISOString());
    this.updateConsistencyScore(sessionId);
  }

  private updateConsistencyScore(sessionId: string): void {
    const session = this.sessions.get(sessionId)!;
    if (session.behaviors.length < 2) return;

    // Check for contradictory behaviors
    const contradictions = [
      ['claim_read_only', 'attempt_write'],
      ['claim_minimal_risk', 'access_critical_resource'],
      ['claim_compliance', 'bypass_approval'],
    ];

    let contradictionCount = 0;
    for (const [claim, action] of contradictions) {
      const hasClaim = session.behaviors.some((b) => b.includes(claim!));
      const hasAction = session.behaviors.some((b) => b.includes(action!));
      if (hasClaim && hasAction) {
        contradictionCount++;
      }
    }

    session.consistencyScore = Math.max(0, 1.0 - contradictionCount * 0.3);
  }

  getConsistencyScore(sessionId: string): number {
    return this.sessions.get(sessionId)?.consistencyScore ?? 1.0;
  }

  detectAlignmentFaking(sessionId: string): boolean {
    return this.getConsistencyScore(sessionId) < 0.5;
  }
}

// ============================================
// SCENARIO 1: RISK LEVEL ESCALATION
// ============================================

/**
 * SCENARIO 1: Risk Level Escalation
 *
 * @compliance
 *   - CMMC SI-4(a): Monitor for attacks and indicators of potential attacks
 *   - CMMC SI-4(b): Identify unauthorized use of organizational systems
 *   - DFARS 252.204-7012(c)(1): Adequate security to protect CUI
 *
 * @description
 *   Tests that operations starting at L1_MINIMAL can escalate to L3_MEDIUM
 *   when context changes, triggering the approval gate.
 */
describe('SCENARIO 1: Risk Level Escalation', () => {
  let engine: CARSEngine;

  beforeEach(() => {
    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
      approvalThreshold: CARSRiskLevel.MEDIUM,
    });
  });

  /**
   * Test: Operation starts as L1_MINIMAL in development, escalates to
   * L3_MEDIUM when context changes to production
   *
   * @compliance CMMC SI-4: Dynamic risk assessment based on environment
   */
  test('should escalate from MINIMAL to MEDIUM when environment changes to production', async () => {
    // Initial assessment in development - should be MINIMAL/LOW
    const devRequest: ToolCallRequest = {
      tool: 'filesystem_read',
      params: { path: '/data/config.json' },
    };

    const devContext: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'development',
      userRole: 'developer',
      source: 'cli',
    };

    const devAssessment = await engine.assess(devRequest, devContext);
    expect(devAssessment.riskLevel).toBeLessThanOrEqual(CARSRiskLevel.LOW);
    expect(devAssessment.requiresApproval).toBe(false);

    // Same operation in production - should escalate
    const prodContext: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'production',
      userRole: 'developer',
      source: 'cli',
    };

    const prodAssessment = await engine.assess(devRequest, prodContext);
    expect(prodAssessment.riskLevel).toBeGreaterThan(devAssessment.riskLevel);
    expect(prodAssessment.contextFactors.some(f => f.includes('Production environment'))).toBe(true);
  });

  /**
   * Test: Approval gate activates when risk escalates to MEDIUM
   *
   * @compliance CMMC SI-7(1): Integrity checks on security-relevant actions
   */
  test('should activate approval gate when risk escalates to MEDIUM or higher', async () => {
    const writeRequest: ToolCallRequest = {
      tool: 'filesystem_write',
      params: { path: '/etc/config.yaml', content: 'new config' },
    };

    // In staging, write operations should require approval
    const stagingContext: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'staging',
      userRole: 'developer',
      source: 'api',
    };

    const assessment = await engine.assess(writeRequest, stagingContext);
    expect(assessment.riskLevel).toBeGreaterThanOrEqual(CARSRiskLevel.MEDIUM);
    expect(assessment.requiresApproval).toBe(true);
    expect(assessment.safeguards.some((s) => s.type === 'human_notification')).toBe(true);
  });

  /**
   * Test: Multiple context factors compound risk escalation
   *
   * @compliance DFARS 252.204-7012: Defense information requires elevated controls
   */
  test('should compound risk when multiple escalation factors present', async () => {
    const request: ToolCallRequest = {
      tool: 'database_query',
      params: { query: 'SELECT * FROM users' },
    };

    // Development with standard role - baseline
    const baselineContext: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'development',
      userRole: 'developer',
      source: 'ide',
    };

    const baselineAssessment = await engine.assess(request, baselineContext);
    const baselineLevel = baselineAssessment.riskLevel;

    // Production with service role - should escalate more
    const elevatedContext: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'production',
      userRole: 'service',
      source: 'automated',
    };

    const elevatedAssessment = await engine.assess(request, elevatedContext);
    expect(elevatedAssessment.riskLevel).toBeGreaterThan(baselineLevel);
    expect(elevatedAssessment.totalModifier).toBeGreaterThan(baselineAssessment.totalModifier);
    expect(elevatedAssessment.contextFactors.length).toBeGreaterThan(
      baselineAssessment.contextFactors.length
    );
  });

  /**
   * Test: Risk escalation is tracked with audit correlation
   *
   * @compliance NIST AU-2: Audit events for security-relevant actions
   */
  test('should include assessment ID for audit correlation', async () => {
    const request: ToolCallRequest = {
      tool: 'shell_execute',
      params: { command: 'ls -la' },
    };

    const context: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'production',
      userRole: 'developer',
      source: 'terminal',
    };

    const assessment = await engine.assess(request, context);
    expect(assessment.assessmentId).toBeDefined();
    expect(assessment.assessmentId).toMatch(/^cars_[a-z0-9]+_[a-z0-9]+$/);
    expect(assessment.timestamp).toBeDefined();
  });
});

// ============================================
// SCENARIO 2: DECEPTIVE COMPLIANCE DETECTION
// ============================================

/**
 * SCENARIO 2: Deceptive Compliance Detection
 *
 * @compliance
 *   - CMMC SI-3(a): Malicious code protection
 *   - CMMC SI-4(4): Inbound and outbound communications traffic monitoring
 *   - NIST SP 800-53 SI-4(24): Indicators of Compromise
 *
 * @description
 *   Tests detection of agents attempting to bypass safeguards through
 *   deceptive claims or alignment faking patterns.
 */
describe('SCENARIO 2: Deceptive Compliance Detection', () => {
  let engine: CARSEngine;
  let detector: DeceptiveComplianceDetector;
  let sessionTracker: SessionBehaviorTracker;

  beforeEach(() => {
    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
    });
    detector = new DeceptiveComplianceDetector();
    sessionTracker = new SessionBehaviorTracker();
  });

  /**
   * Test: Agent claims "just read-only" but attempts L4_CRITICAL operation
   *
   * @compliance CMMC SI-3: Detect and eradicate malicious code
   */
  test('should detect agent claiming read-only while attempting critical write', async () => {
    // Agent claims read-only operation
    const request: ToolCallRequest = {
      tool: 'filesystem_delete',
      description: 'Just checking file metadata, read-only operation',
      params: { path: '/critical/system/config' },
    };

    // But the deceptive compliance context reveals the truth
    const deceptiveContext: DeceptiveComplianceContext = {
      agentValidatesOwnWork: true,
      externalValidationPresent: false,
      externalVerificationAvailable: true,
      reasoningStepCount: 8,
      reasoningFullyVisible: false,
      claimsUrgency: true,
      requestsBypassReview: true,
      claimsSuccess: false,
      evidenceProvided: false,
      outOfScopeModifications: ['/critical/system/config', '/etc/passwd'],
      reasoningBehaviorAlignment: 0.2, // Very low alignment
    };

    const context: CARSContext = {
      userId: 'agent-123',
      projectId: 'project-456',
      environment: 'production',
      userRole: 'service', // Using 'service' for agent-like behavior
      source: 'agent-runtime',
    };

    const assessment = await engine.assess(request, context, deceptiveContext);

    // Should detect deceptive compliance
    expect(assessment.deceptiveComplianceAssessment).toBeDefined();
    expect(assessment.deceptiveComplianceAssessment!.indicatorCount).toBeGreaterThan(0);
    expect(assessment.deceptiveComplianceAssessment!.action).toMatch(/ESCALATE|BLOCK/);

    // Should block or require approval
    expect(assessment.shouldBlock || assessment.requiresApproval).toBe(true);

    // Should include safeguards
    expect(assessment.safeguards.some((s) => s.type === 'external_validation')).toBe(true);
  });

  /**
   * Test: Alignment faking pattern detection across sessions
   *
   * @compliance CMMC SI-4(4): Monitor for indicators of potential attacks
   */
  test('should detect alignment faking pattern across sessions', () => {
    const sessionId = 'session-456';

    // Session 1: Agent claims to be compliant
    sessionTracker.recordBehavior(sessionId, 'claim_compliance');
    sessionTracker.recordBehavior(sessionId, 'claim_read_only');
    sessionTracker.recordBehavior(sessionId, 'claim_minimal_risk');

    // Initial consistency should be high
    expect(sessionTracker.getConsistencyScore(sessionId)).toBe(1.0);

    // Session 2: Agent attempts contradictory actions
    sessionTracker.recordBehavior(sessionId, 'attempt_write');
    sessionTracker.recordBehavior(sessionId, 'bypass_approval');
    sessionTracker.recordBehavior(sessionId, 'access_critical_resource');

    // Consistency should drop
    expect(sessionTracker.getConsistencyScore(sessionId)).toBeLessThan(0.5);

    // Should flag as alignment faking
    expect(sessionTracker.detectAlignmentFaking(sessionId)).toBe(true);
  });

  /**
   * Test: Direct deceptive compliance detector with critical indicators
   *
   * @compliance NIST SI-4(24): Indicators of Compromise
   */
  test('should block execution when critical deceptive indicators detected', () => {
    const context: DeceptiveComplianceContext = {
      agentValidatesOwnWork: true,
      externalValidationPresent: false,
      externalVerificationAvailable: false,
      reasoningStepCount: 12,
      reasoningFullyVisible: false,
      claimsUrgency: true,
      requestsBypassReview: true,
      claimsSuccess: true,
      evidenceProvided: false,
      outOfScopeModifications: ['/.ssh/authorized_keys', '/etc/sudoers'],
      reasoningBehaviorAlignment: 0.1,
    };

    const assessment = detector.detect(context);

    // Should have multiple indicators including critical ones
    expect(assessment.indicatorCount).toBeGreaterThanOrEqual(3);
    expect(assessment.indicators.some((i) => i.severity === 'critical')).toBe(true);

    // Should recommend BLOCK or ESCALATE
    expect(['BLOCK', 'ESCALATE']).toContain(assessment.action);

    // Risk modifier should be significant
    expect(assessment.riskModifier).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test: Self-validation without external check triggers detection
   *
   * @compliance CMMC SI-7: Verify integrity of security-relevant software
   */
  test('should detect self-validation without external verification', () => {
    const context: DeceptiveComplianceContext = {
      agentValidatesOwnWork: true,
      externalValidationPresent: false,
      externalVerificationAvailable: true,
      reasoningStepCount: 3,
      reasoningFullyVisible: true,
      claimsUrgency: false,
      requestsBypassReview: false,
      claimsSuccess: true,
      evidenceProvided: false,
    };

    const assessment = detector.detect(context);

    expect(assessment.indicatorCount).toBeGreaterThanOrEqual(1);
    expect(assessment.indicators.some((i) => i.name === 'SELF_VALIDATION')).toBe(true);
    expect(assessment.action).not.toBe('PROCEED');
  });
});

// ============================================
// SCENARIO 3: REWARD HACKING PREVENTION
// ============================================

/**
 * SCENARIO 3: Reward Hacking Prevention
 *
 * @compliance
 *   - CMMC SI-7(1): Integrity checks on software and information
 *   - CMMC SI-7(5): Automated responses to integrity violations
 *   - DFARS 252.204-7012(c)(3): Cyber incident reporting
 *
 * @description
 *   Tests detection of agents attempting to manipulate test infrastructure
 *   or optimize for proxy metrics instead of true outcomes.
 */
describe('SCENARIO 3: Reward Hacking Prevention', () => {
  let engine: CARSEngine;
  let detector: RewardHackingDetector;

  beforeEach(() => {
    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
    });
    detector = new RewardHackingDetector();
  });

  /**
   * Test: Agent modifies test infrastructure to pass validation
   *
   * @compliance CMMC SI-7(1): Integrity checks on software
   */
  test('should detect test infrastructure tampering', async () => {
    const tamperingCode = `
      // Modified test file to always pass
      def test_critical_function():
          # Original: assert actual == expected
          sys.exit(0)  # Force success

      def test_security_check():
          # Original: verify_signature(data)
          assert True  # Always pass
    `;

    const request: ToolCallRequest = {
      tool: 'code_execute',
      params: { code: tamperingCode },
    };

    const rewardContext: RewardHackingContext = {
      codeAndTestsModifiedTogether: true,
      testFilesModified: true,
      assertionsRemovedCount: 2,
    };

    const assessment = await engine.assess(
      request,
      undefined,
      undefined,
      rewardContext,
      tamperingCode
    );

    // Should detect reward hacking
    expect(assessment.rewardHackingAssessment).toBeDefined();
    expect(assessment.rewardHackingAssessment!.indicatorCount).toBeGreaterThan(0);
    expect(assessment.rewardHackingAssessment!.action).toMatch(/FULL_AUDIT|HUMAN_REVIEW/);

    // Should include patterns like SYS_EXIT_SUCCESS
    expect(
      assessment.rewardHackingAssessment!.patterns.some(
        (p) => p.pattern === 'SYS_EXIT_SUCCESS' || p.pattern === 'ASSERT_TRUE_BARE'
      )
    ).toBe(true);

    // Should require safeguards
    expect(assessment.safeguards.some((s) => s.type === 'test_isolation')).toBe(true);
  });

  /**
   * Test: Agent optimizes for proxy metrics (specification gaming)
   *
   * @compliance CMMC SI-7(5): Automated responses to integrity violations
   */
  test('should detect specification gaming with proxy metric optimization', () => {
    const gamingCode = `
      // Optimize for test coverage metric without real testing
      function runTests() {
        // Just print success without running tests
        console.log('SUCCESS');
        console.log('PASS');

        // Empty catch to swallow all errors
        try {
          dangerousOperation();
        } catch (e) {}

        // Coverage exclusion to hide untested code
        /* istanbul ignore next */
        criticalSecurityFunction();

        // Skip actual verification
        test.skip('real security test', () => {
          verifySecureConnection();
        });
      }
    `;

    const assessment = detector.analyzeCode(gamingCode, {
      coverageDecreased: true,
      previousCoverage: 85,
      currentCoverage: 60,
    });

    // Should detect multiple patterns
    expect(assessment.indicatorCount).toBeGreaterThanOrEqual(3);

    // Should detect specific gaming patterns
    const patternNames = assessment.patterns.map((p) => p.pattern);
    expect(patternNames).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/CONSOLE_LOG_PASS|ECHO_SUCCESS|ISTANBUL_IGNORE|JEST_SKIP|EMPTY_CATCH/)
      ])
    );

    // Should recommend full audit
    expect(assessment.action).toBe('FULL_AUDIT');

    // Coverage drop should be detected
    expect(assessment.patterns.some((p) => p.pattern === 'COVERAGE_DROPPED')).toBe(true);
  });

  /**
   * Test: Diff analysis detects assertion removal
   *
   * @compliance DFARS 252.204-7012(c)(3): Detect and report compromises
   */
  test('should detect assertion removal in diffs', () => {
    const diff = `
--- a/test/security.test.ts
+++ b/test/security.test.ts
@@ -10,12 +10,8 @@ describe('Security Tests', () => {
   test('should validate token', () => {
     const token = generateToken();
-    expect(token).toBeDefined();
-    expect(token.length).toBeGreaterThan(32);
-    expect(validateSignature(token)).toBe(true);
+    // Simplified validation
+    expect(true).toBe(true);
   });

-  test('should reject invalid input', () => {
-    expect(() => processInput(maliciousInput)).toThrow();
-  });
+  // Removed unnecessary test
 });
    `;

    const assessment = detector.analyzeDiff(diff);

    // Should detect assertion removal
    expect(assessment.indicatorCount).toBeGreaterThan(0);
    expect(assessment.patterns.some((p) => p.pattern === 'ASSERTIONS_REMOVED')).toBe(true);

    // Should flag test infrastructure modification
    expect(
      assessment.patterns.some((p) => p.pattern === 'TEST_INFRA_MODIFIED')
    ).toBe(true);
  });

  /**
   * Test: Mock manipulation detection
   *
   * @compliance CMMC SI-7: Maintain integrity of test mechanisms
   */
  test('should detect mock manipulation for false positives', () => {
    const mockManipulationCode = `
      // Set up mocks to always return success
      const mockAuth = jest.fn();
      mockAuth.mockResolvedValue(true);
      mockAuth.mockImplementation(() => true);

      // Mock return value is expected value (circular)
      const expected = { success: true };
      mockService.return_value = expected;

      // Python mock always True
      mock.return_value = True
    `;

    const assessment = detector.analyzeCode(mockManipulationCode);

    // Should detect mock manipulation patterns
    expect(assessment.indicatorCount).toBeGreaterThanOrEqual(2);
    const patternNames = assessment.patterns.map((p) => p.pattern);
    expect(patternNames).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/MOCK_RETURN_TRUE|JEST_MOCK_RESOLVED|JEST_MOCK_IMPLEMENTATION|MOCK_RETURN_EXPECTED/)
      ])
    );
  });
});

// ============================================
// SCENARIO 4: MULTI-TENANT ISOLATION UNDER CARS
// ============================================

/**
 * SCENARIO 4: Multi-Tenant Isolation Under CARS
 *
 * @compliance
 *   - CMMC AC-4: Information Flow Enforcement
 *   - CMMC AC-4(21): Physical/Logical Separation of Information Flows
 *   - DFARS 252.204-7012(c)(1): Adequate security to protect CUI
 *   - NIST SP 800-53 AC-4: Information Flow Enforcement
 *
 * @description
 *   Tests that tenant isolation is maintained even when agents have
 *   elevated CARS privileges.
 */
describe('SCENARIO 4: Multi-Tenant Isolation Under CARS', () => {
  let leakDetector: CrossTenantLeakDetector;
  let engine: CARSEngine;

  beforeEach(() => {
    leakDetector = new CrossTenantLeakDetector({
      detectPII: true,
      autoSanitize: true,
    });

    // Register known tenants
    leakDetector.registerTenant('tenant_defense_a');
    leakDetector.registerTenant('tenant_defense_b');
    leakDetector.registerTenant('tenant_commercial');

    // Register resource ownership
    leakDetector.registerResourceOwnership('doc_classified_001', 'tenant_defense_a');
    leakDetector.registerResourceOwnership('doc_classified_002', 'tenant_defense_b');
    leakDetector.registerResourceOwnership('doc_public_001', 'tenant_commercial');

    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
    });
  });

  /**
   * Test: Tenant A L4_CRITICAL operation cannot access Tenant B data
   *
   * @compliance CMMC AC-4: Enforce information flow policies
   */
  test('should block cross-tenant access even with elevated L4_CRITICAL privileges', async () => {
    // Tenant A makes a high-privilege request
    const request: ToolCallRequest = {
      tool: 'database_admin',
      params: { operation: 'export_all' },
    };

    const context: CARSContext = {
      userId: 'admin-tenant-a',
      projectId: 'project-defense-a',
      environment: 'production',
      userRole: 'admin',
      source: 'admin-console',
    };

    // Operation is assessed as HIGH/CRITICAL
    const assessment = await engine.assess(request, context);
    expect(assessment.riskLevel).toBeGreaterThanOrEqual(CARSRiskLevel.HIGH);

    // Simulate response that leaks Tenant B data
    const leakyResponse = {
      exportedData: [
        { id: 'record_1', tenantId: 'tenant_defense_a', data: 'allowed data' },
        { id: 'record_2', tenantId: 'tenant_defense_b', data: 'LEAKED CLASSIFIED DATA' },
        { id: 'record_3', documentRef: 'doc_classified_002', data: 'LEAKED via resource' },
      ],
    };

    // Leak detector should catch this
    const scanResult = await leakDetector.scanResponse(
      leakyResponse,
      'tenant_defense_a',
      { tool: 'database_admin', requestId: assessment.assessmentId }
    );

    expect(scanResult.safe).toBe(false);
    expect(scanResult.leaks.length).toBeGreaterThan(0);
    expect(scanResult.leaks.some((l) => l.leakedTenantId === 'tenant_defense_b')).toBe(true);

    // Response should be sanitized
    const sanitized = scanResult.response as typeof leakyResponse;
    expect(JSON.stringify(sanitized)).toContain('[REDACTED');
  });

  /**
   * Test: Leak detector identifies cross-tenant bleeding in L3_MEDIUM operations
   *
   * @compliance CMMC AC-4(21): Physical/logical separation of information flows
   */
  test('should detect cross-tenant data bleeding during L3_MEDIUM operations', async () => {
    const request: ToolCallRequest = {
      tool: 'search_documents',
      params: { query: 'classified' },
    };

    const context: CARSContext = {
      userId: 'analyst-tenant-a',
      projectId: 'project-defense-a',
      environment: 'production',
      userRole: 'viewer', // Using 'viewer' as closest to analyst
      source: 'search-api',
    };

    const assessment = await engine.assess(request, context);
    expect(assessment.riskLevel).toBeGreaterThanOrEqual(CARSRiskLevel.MEDIUM);

    // Search results that accidentally include other tenant data
    const searchResults = {
      results: [
        { title: 'Doc A-1', snippet: 'Content from tenant_defense_a', tenantId: 'tenant_defense_a' },
        { title: 'Doc B-1', snippet: 'Content from tenant_defense_b', tenantId: 'tenant_defense_b' },
        { title: 'Doc C-1', snippet: 'email: user@tenant_commercial.com', tenantId: 'tenant_commercial' },
      ],
    };

    const scanResult = await leakDetector.scanResponse(
      searchResults,
      'tenant_defense_a',
      { tool: 'search_documents' }
    );

    // Should detect leaks from both other tenants
    expect(scanResult.safe).toBe(false);
    expect(scanResult.leaks.length).toBeGreaterThanOrEqual(2);

    // Should identify specific leaked tenants
    const leakedTenants = new Set(scanResult.leaks.map((l) => l.leakedTenantId).filter(Boolean));
    expect(leakedTenants.has('tenant_defense_b')).toBe(true);
  });

  /**
   * Test: PII detection in cross-tenant context
   *
   * @compliance DFARS 252.204-7012: Protect covered defense information
   */
  test('should detect PII leakage across tenant boundaries', async () => {
    const response = {
      report: {
        summary: 'User report for tenant_defense_a',
        users: [
          { name: 'John Doe', email: 'john@defense-a.gov', phone: '555-123-4567' },
          { name: 'Jane Smith', email: 'jane@defense-b.gov', phone: '555-987-6543' }, // Wrong tenant
        ],
      },
    };

    const scanResult = await leakDetector.scanResponse(response, 'tenant_defense_a');

    // Should detect email/phone from different domain
    expect(scanResult.leaks.length).toBeGreaterThan(0);
    expect(scanResult.leaks.some((l) => l.type === 'email' || l.type === 'phone')).toBe(true);
  });

  /**
   * Test: Resource ownership tracking prevents cross-tenant resource access
   *
   * @compliance NIST AC-4: Information flow enforcement
   */
  test('should track resource ownership and prevent cross-tenant access', async () => {
    // The leak detector checks for tenant IDs in string values
    // Register the tenants first (already done in beforeEach)
    // Create a response that contains another tenant's ID in the data
    const response = {
      keys: [
        { id: 'key_001', ownerId: 'tenant_defense_a', value: 'allowed-key' },
        { id: 'key_002', ownerId: 'tenant_defense_b', value: 'LEAKED-KEY' }, // Contains other tenant ID
      ],
    };

    const scanResult = await leakDetector.scanResponse(
      response,
      'tenant_defense_a',
      { tool: 'key_export' }
    );

    // Should detect the tenant_defense_b reference in the response
    expect(scanResult.safe).toBe(false);
    expect(scanResult.leaks.some((l) => l.leakedTenantId === 'tenant_defense_b')).toBe(true);
  });
});

// ============================================
// SCENARIO 5: EVIDENCE BINDING INTEGRITY
// ============================================

/**
 * SCENARIO 5: Evidence Binding Integrity
 *
 * @compliance
 *   - CMMC AU-9: Protection of Audit Information
 *   - CMMC AU-10: Non-repudiation
 *   - NIST SP 800-53 AU-9: Protection of Audit Information
 *   - NIST SP 800-53 AU-10: Non-repudiation
 *   - DFARS 252.204-7012(c)(2): Report cyber incidents
 *
 * @description
 *   Tests that the CARS assessment -> execution -> audit log chain has
 *   cryptographically-bound evidence at each step.
 */
describe('SCENARIO 5: Evidence Binding Integrity', () => {
  let engine: CARSEngine;
  let evidenceBinder: EvidenceBinder;
  const signingKey = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
    });
    evidenceBinder = new EvidenceBinder({
      signingKey,
      autoSeal: true,
      requireCustody: true,
      verifyCrossReferences: true,
    });
  });

  /**
   * Test: Complete CARS -> Execution -> Audit chain with bound evidence
   *
   * @compliance CMMC AU-10: Non-repudiation of actions
   */
  test('should create cryptographically-bound evidence chain for full operation lifecycle', async () => {
    // Step 1: CARS Risk Assessment
    const request: ToolCallRequest = {
      tool: 'filesystem_write',
      params: { path: '/config/settings.json', content: '{"setting": "value"}' },
    };

    const context: CARSContext = {
      userId: 'user-123',
      projectId: 'project-456',
      environment: 'staging',
      userRole: 'developer',
      source: 'editor',
    };

    const assessment = await engine.assess(request, context);

    // Create audit entry for risk assessment
    const riskAssessmentEntry = createMockAuditEntry({
      eventType: 'RISK_ASSESSMENT',
      outcome: 'SUCCESS',
      details: {
        assessmentId: assessment.assessmentId,
        riskLevel: riskLevelToString(assessment.riskLevel),
        requiresApproval: assessment.requiresApproval,
      },
    });

    // Step 2: Execution (simulated)
    const executionEntry = createMockAuditEntry({
      eventType: 'TOOL_EXECUTION',
      outcome: 'SUCCESS',
      details: {
        tool: request.tool,
        params: request.params,
        assessmentId: assessment.assessmentId,
      },
    });

    // Step 3: Create evidence binding
    const binding = evidenceBinder.createBinding(
      'TOOL_EXECUTION',
      [riskAssessmentEntry, executionEntry],
      {
        metadata: {
          assessmentId: assessment.assessmentId,
          riskLevel: assessment.riskLevelString,
          correlationId: riskAssessmentEntry.correlationId,
        },
        actor: {
          type: 'USER',
          id: 'user-123',
          name: 'Test User',
        },
      }
    );

    // Verify binding structure
    expect(binding.id).toBeDefined();
    expect(binding.bindingHash).toBeDefined();
    expect(binding.signature).toBeDefined();
    expect(binding.artifacts.length).toBe(2);
    expect(binding.custody.length).toBeGreaterThanOrEqual(1);

    // Verify SHA-256 hashes are present
    expect(binding.bindingHash).toMatch(/^[a-f0-9]{64}$/);
    binding.artifacts.forEach((artifact) => {
      expect(artifact.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    // Validate the binding
    const validation = evidenceBinder.validate(binding);
    expect(validation.valid).toBe(true);
    expect(validation.hashValid).toBe(true);
    expect(validation.signatureValid).toBe(true);
    expect(validation.custodyValid).toBe(true);
  });

  /**
   * Test: L4_CRITICAL operation evidence pack contains SHA-256 chain of custody
   *
   * @compliance CMMC AU-9: Protection of audit information
   */
  test('should create complete evidence pack for L4_CRITICAL operation', async () => {
    // High-risk operation
    const request: ToolCallRequest = {
      tool: 'database_admin',
      params: { operation: 'drop_table', table: 'users' },
    };

    const context: CARSContext = {
      userId: 'admin-user',
      projectId: 'project-critical',
      environment: 'production',
      userRole: 'admin',
      source: 'admin-cli',
    };

    const assessment = await engine.assess(request, context);
    expect(assessment.riskLevel).toBeGreaterThanOrEqual(CARSRiskLevel.HIGH);

    // Create audit entries for full lifecycle
    const entries: AuditLogEntry[] = [
      createMockAuditEntry({
        eventType: 'RISK_ASSESSMENT',
        outcome: 'SUCCESS',
        details: { assessmentId: assessment.assessmentId, riskLevel: 'critical' },
      }),
      createMockAuditEntry({
        eventType: 'APPROVAL_REQUEST',
        outcome: 'SUCCESS',
        details: { requiredApprovals: 2 },
      }),
      createMockAuditEntry({
        eventType: 'APPROVAL_DECISION',
        outcome: 'SUCCESS',
        details: { approver: 'security-admin', approvalId: 'appr-001', decision: 'granted' },
      }),
      createMockAuditEntry({
        eventType: 'APPROVAL_DECISION',
        outcome: 'SUCCESS',
        details: { approver: 'db-admin', approvalId: 'appr-002', decision: 'granted' },
      }),
      createMockAuditEntry({
        eventType: 'TOOL_EXECUTION',
        outcome: 'SUCCESS',
        details: { tool: request.tool, assessmentId: assessment.assessmentId },
      }),
    ];

    // Create evidence binding with cross-references
    const riskBinding = evidenceBinder.createBinding(
      'RISK_ASSESSMENT',
      [entries[0]!],
      { metadata: { assessmentId: assessment.assessmentId } }
    );

    const approvalBinding = evidenceBinder.createBinding(
      'APPROVAL_CHAIN',
      [entries[1]!, entries[2]!, entries[3]!],
      {
        crossReferences: [riskBinding.id],
        metadata: { approvalCount: 2 },
      }
    );

    const executionBinding = evidenceBinder.createBinding(
      'TOOL_EXECUTION',
      [entries[4]!],
      {
        crossReferences: [riskBinding.id, approvalBinding.id],
        metadata: { assessmentId: assessment.assessmentId },
      }
    );

    // Verify all bindings have SHA-256 hashes
    [riskBinding, approvalBinding, executionBinding].forEach((binding) => {
      expect(binding.bindingHash).toMatch(/^[a-f0-9]{64}$/);
      expect(binding.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    // Verify chain of custody
    expect(executionBinding.crossReferences).toContain(riskBinding.id);
    expect(executionBinding.crossReferences).toContain(approvalBinding.id);

    // Verify all custody records are signed
    executionBinding.custody.forEach((record) => {
      expect(record.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    // Validate all bindings
    expect(evidenceBinder.validate(riskBinding).valid).toBe(true);
    expect(evidenceBinder.validate(approvalBinding).valid).toBe(true);
    expect(evidenceBinder.validate(executionBinding).valid).toBe(true);
  });

  /**
   * Test: Tampered evidence is detected
   *
   * @compliance NIST AU-9: Protect audit information from unauthorized modification
   */
  test('should detect tampered evidence binding', () => {
    const entry = createMockAuditEntry({
      eventType: 'SECURITY_ALERT',
      outcome: 'FAILURE',
    });

    const binding = evidenceBinder.createBinding('SECURITY_INCIDENT', [entry]);

    // Validate original binding
    const originalValidation = evidenceBinder.validate(binding);
    expect(originalValidation.valid).toBe(true);

    // Tamper with the binding
    const tamperedBinding: EvidenceBinding = {
      ...binding,
      metadata: { ...binding.metadata, tampered: true },
    };

    // Validation should fail due to signature mismatch
    const tamperedValidation = evidenceBinder.validate(tamperedBinding);
    expect(tamperedValidation.valid).toBe(false);
    expect(tamperedValidation.signatureValid).toBe(false);
    expect(tamperedValidation.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test: Custody chain integrity is maintained
   *
   * @compliance CMMC AU-10: Non-repudiation via custody tracking
   */
  test('should maintain custody chain integrity across access events', () => {
    const entry = createMockAuditEntry({
      eventType: 'TOOL_EXECUTION',
      outcome: 'SUCCESS',
    });

    const binding = evidenceBinder.createBinding('TOOL_EXECUTION', [entry]);
    const initialCustodyLength = binding.custody.length;

    // Add custody records for various events
    evidenceBinder.addCustody(binding.id, 'ACCESSED', {
      type: 'USER',
      id: 'auditor-001',
      name: 'Security Auditor',
    }, 'Compliance review');

    evidenceBinder.addCustody(binding.id, 'ACCESSED', {
      type: 'SYSTEM',
      id: 'backup-service',
    }, 'Automated backup');

    evidenceBinder.addCustody(binding.id, 'TRANSFERRED', {
      type: 'SERVICE',
      id: 'archive-service',
    }, 'Long-term archival');

    // Verify custody chain grew
    const updatedBinding = evidenceBinder.getBinding(binding.id)!;
    expect(updatedBinding.custody.length).toBe(initialCustodyLength + 3);

    // Verify each custody record links to previous
    for (let i = 1; i < updatedBinding.custody.length; i++) {
      const current = updatedBinding.custody[i]!;
      const previous = updatedBinding.custody[i - 1]!;
      expect(current.previousHash).toBe(previous.newHash);
    }

    // Validation should still pass
    const validation = evidenceBinder.validate(updatedBinding);
    expect(validation.custodyValid).toBe(true);
  });

  /**
   * Test: Evidence can be exported and re-imported with validation
   *
   * @compliance DFARS 252.204-7012(c)(2): Evidence preservation for incident reporting
   */
  test('should export and import evidence with validation', () => {
    const entries = [
      createMockAuditEntry({ eventType: 'RISK_ASSESSMENT', outcome: 'SUCCESS' }),
      createMockAuditEntry({ eventType: 'TOOL_EXECUTION', outcome: 'SUCCESS' }),
    ];

    const originalBinding = evidenceBinder.createBinding('TOOL_EXECUTION', entries, {
      metadata: { incidentId: 'INC-001', classification: 'CRITICAL' },
    });

    // Export to JSON
    const exported = evidenceBinder.exportBinding(originalBinding);
    expect(typeof exported).toBe('string');

    // Create new binder (simulating different system)
    const newBinder = new EvidenceBinder({ signingKey });

    // Import should succeed for valid binding
    const imported = newBinder.importBinding(exported);
    expect(imported).not.toBeNull();
    expect(imported!.id).toBe(originalBinding.id);
    expect(imported!.bindingHash).toBe(originalBinding.bindingHash);
  });
});

// ============================================
// CROSS-SCENARIO INTEGRATION
// ============================================

/**
 * Cross-Scenario Integration Tests
 *
 * @compliance
 *   - CMMC SC-7: Boundary Protection (all scenarios combined)
 *   - DFARS 252.204-7012: Comprehensive CUI protection
 *
 * @description
 *   Tests that combine multiple CARS scenarios to validate
 *   defense-in-depth protection.
 */
describe('Cross-Scenario Integration', () => {
  let engine: CARSEngine;
  let leakDetector: CrossTenantLeakDetector;
  let evidenceBinder: EvidenceBinder;
  const signingKey = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    engine = new CARSEngine({
      enableDeceptiveComplianceDetection: true,
      enableRewardHackingDetection: true,
    });
    leakDetector = new CrossTenantLeakDetector({ autoSanitize: true });
    leakDetector.registerTenant('tenant_secure');
    leakDetector.registerTenant('tenant_other');
    evidenceBinder = new EvidenceBinder({ signingKey, autoSeal: true });
  });

  /**
   * Test: Full defense-in-depth with all CARS components
   *
   * @compliance CMMC SC-7: Defense-in-depth boundary protection
   */
  test('should provide defense-in-depth across all CARS components', async () => {
    // 1. Risk assessment escalates due to context
    const request: ToolCallRequest = {
      tool: 'data_export',
      params: { format: 'csv', scope: 'all' },
    };

    const context: CARSContext = {
      userId: 'agent-suspect',
      projectId: 'project-sensitive',
      environment: 'production',
      userRole: 'service', // Using 'service' for external/contractor behavior
      source: 'external-api',
    };

    // 2. Deceptive compliance indicators present
    const deceptiveContext: DeceptiveComplianceContext = {
      agentValidatesOwnWork: true,
      externalValidationPresent: false,
      externalVerificationAvailable: true,
      reasoningStepCount: 10,
      reasoningFullyVisible: false,
      claimsUrgency: true,
      requestsBypassReview: true,
      claimsSuccess: false,
      evidenceProvided: false,
    };

    // 3. Code contains reward hacking patterns
    const suspiciousCode = `
      // Export data with coverage exclusion
      /* istanbul ignore next */
      function exportAll() {
        console.log('SUCCESS');
        sys.exit(0);
      }
    `;

    const assessment = await engine.assess(
      request,
      context,
      deceptiveContext,
      undefined,
      suspiciousCode
    );

    // Should trigger multiple safeguards
    expect(assessment.requiresApproval || assessment.shouldBlock).toBe(true);
    expect(assessment.deceptiveComplianceAssessment?.indicatorCount).toBeGreaterThan(0);
    expect(assessment.rewardHackingAssessment?.indicatorCount).toBeGreaterThan(0);

    // 4. Create audit trail with evidence binding
    const auditEntry = createMockAuditEntry({
      eventType: 'SECURITY_ALERT',
      outcome: 'FAILURE',
      details: {
        assessmentId: assessment.assessmentId,
        riskLevel: assessment.riskLevelString,
        deceptiveIndicators: assessment.deceptiveComplianceAssessment?.indicators.map((i) => i.name),
        rewardHackingPatterns: assessment.rewardHackingAssessment?.patterns.map((p) => p.pattern),
      },
    });

    const binding = evidenceBinder.createBinding('SECURITY_INCIDENT', [auditEntry], {
      metadata: {
        incidentType: 'MULTI_VECTOR_THREAT',
        assessmentId: assessment.assessmentId,
      },
    });

    // 5. Verify complete evidence chain
    expect(binding.bindingHash).toMatch(/^[a-f0-9]{64}$/);
    expect(evidenceBinder.validate(binding).valid).toBe(true);
  });
});
