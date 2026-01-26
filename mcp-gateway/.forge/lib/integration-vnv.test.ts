/**
 * Integration Test: Epic 7.5 V&V Framework
 * Tests: CheckerSpec loading, V&V evaluation, Gate evaluation
 */

import * as path from 'path';
import * as fs from 'fs/promises';

import { loadCheckerSpec, evaluateVnV, evaluateGate, validateCheckerSpec } from './vnv.js';
import { initLedger } from './ledger.js';
import { initHooks } from './hook.js';
import type {
  CheckerSpec,
  Evidence,
  GateContext,
  TestEvidence,
} from './types.js';

// =============================================================================
// Test Utilities
// =============================================================================

const FORGE_ROOT = path.join(process.cwd(), '.forge');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

// =============================================================================
// Test: CheckerSpec Loading
// =============================================================================

async function testCheckerSpecLoading(): Promise<void> {
  console.log('\n=== Test: CheckerSpec Loading ===\n');

  // 1. Load SAMPLE-001 CheckerSpec
  console.log('1. Loading SAMPLE-001 CheckerSpec...');
  const spec = await loadCheckerSpec('SAMPLE-001');

  assert(spec !== null, 'CheckerSpec loaded successfully');
  assert(spec!.workItem.id === 'SAMPLE-001', 'Work item ID matches');
  assert(spec!.version === '1.0.0', 'Version is correct');
  assert(spec!.verification.checks.length > 0, 'Has verification checks');
  assert(spec!.validation.checks.length > 0, 'Has validation checks');

  // 2. Validate CheckerSpec structure
  console.log('\n2. Validating CheckerSpec structure...');
  const validation = await validateCheckerSpec(spec!);
  assert(validation.valid, 'CheckerSpec structure is valid');
  if (!validation.valid) {
    console.log('   Errors:', validation.errors);
  }

  // 3. Test loading non-existent spec
  console.log('\n3. Loading non-existent CheckerSpec...');
  const missing = await loadCheckerSpec('NON-EXISTENT');
  assert(missing === null, 'Returns null for missing spec');

  console.log('\n✅ CheckerSpec loading test PASSED\n');
}

// =============================================================================
// Test: V&V Evaluation
// =============================================================================

async function testVnVEvaluation(): Promise<void> {
  console.log('\n=== Test: V&V Evaluation ===\n');

  const spec = await loadCheckerSpec('SAMPLE-001');
  assert(spec !== null, 'CheckerSpec loaded');

  // 1. Evaluate with passing evidence
  console.log('1. Evaluating with passing evidence...');
  const passingEvidence: Evidence & { testResults?: TestEvidence } = {
    inputHash: 'sha256:abc123',
    outputHash: 'sha256:def456',
    timestamp: new Date().toISOString(),
    testResults: {
      runs: [
        {
          suite: 'smoke',
          runner: 'jest',
          status: 'pass',
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 5000,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      summary: {
        overallStatus: 'pass',
        suites: ['smoke'],
        totalTests: 10,
        totalPassed: 10,
        totalFailed: 0,
        totalSkipped: 0,
        totalDuration: 5000,
      },
    },
  };

  const result = await evaluateVnV(spec!, passingEvidence);

  assert(result.checkerSpecId === 'SAMPLE-001', 'CheckerSpec ID in result');
  assert(result.overallStatus === 'PASS', 'Overall status is PASS');
  assert(result.verification.status === 'passed', 'Verification passed');
  assert(result.validation.status === 'passed', 'Validation passed');

  console.log(`   V: ${result.verification.passed.length} passed, ${result.verification.failed.length} failed`);
  console.log(`   B: ${result.validation.passed.length} passed, ${result.validation.failed.length} failed`);

  console.log('\n✅ V&V evaluation test PASSED\n');
}

// =============================================================================
// Test: Gate Evaluation
// =============================================================================

async function testGateEvaluation(): Promise<void> {
  console.log('\n=== Test: Gate Evaluation ===\n');

  // 1. Test pre_dispatch gate with valid context
  console.log('1. Evaluating pre_dispatch gate (valid context)...');
  const validContext: GateContext = {
    workItemId: 'SAMPLE-001',
    checkerSpecId: 'SAMPLE-001',
    suiteResults: {
      smoke: {
        passed: true,
        total: 10,
        failed: 0,
        skipped: 0,
        duration: 5000,
        withinBudget: true,
      },
    },
    targetedTestsPassed: true,
    riskLevel: 'low',
  };

  const authorized = await evaluateGate('pre_dispatch', validContext);

  assert(authorized.gate === 'pre_dispatch', 'Gate name correct');
  assert(authorized.status === 'AUTHORIZED', 'Gate authorized');
  console.log(`   Status: ${authorized.status}`);
  if (authorized.warnings?.length) {
    console.log(`   Warnings: ${authorized.warnings.join(', ')}`);
  }

  // 2. Test pre_dispatch gate without CheckerSpec
  console.log('\n2. Evaluating pre_dispatch gate (missing CheckerSpec)...');
  const missingSpecContext: GateContext = {
    workItemId: 'SAMPLE-001',
    checkerSpecId: undefined,  // Missing!
    suiteResults: {},
    targetedTestsPassed: false,
  };

  const denied = await evaluateGate('pre_dispatch', missingSpecContext);

  assert(denied.status === 'DENIED', 'Gate denied without CheckerSpec');
  assert(denied.reasons.length > 0, 'Has denial reasons');
  console.log(`   Status: ${denied.status}`);
  console.log(`   Reasons: ${denied.reasons.join(', ')}`);

  // 3. Test PR gate
  console.log('\n3. Evaluating PR gate...');
  const prContext: GateContext = {
    workItemId: 'SAMPLE-001',
    checkerSpecId: 'SAMPLE-001',
    suiteResults: {
      smoke: {
        passed: true,
        total: 5,
        failed: 0,
        skipped: 0,
        duration: 3000,
        withinBudget: true,
      },
    },
    targetedTestsPassed: true,
    riskLevel: 'low',
  };

  const prDecision = await evaluateGate('pr', prContext);
  console.log(`   Status: ${prDecision.status}`);

  console.log('\n✅ Gate evaluation test PASSED\n');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Epic 7.5 V&V Framework - Integration Tests            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await initLedger();
    await initHooks();

    await testCheckerSpecLoading();
    await testVnVEvaluation();
    await testGateEvaluation();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  All V&V integration tests PASSED ✅');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();
