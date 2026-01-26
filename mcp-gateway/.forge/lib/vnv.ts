/**
 * FORGE V&V Engine - Verification & Validation Evaluation
 * Pattern: CheckerSpec → Evidence → VnVResult
 *
 * Epic 7.5: Quality layer for agent orchestration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  CheckerSpec,
  VnVResult,
  VnVBlockResult,
  GateDecision,
  GateContext,
  GateName,
  GateStatus,
  Check,
  CheckPriority,
  VnVStatus,
  Evidence,
  TestEvidence,
  VnVSummary,
  RiskLevel,
} from './types.js';
import { logEvent } from './ledger.js';

// =============================================================================
// Configuration
// =============================================================================

const FORGE_ROOT = path.join(process.cwd(), '.forge');
const CHECKER_DIR = path.join(FORGE_ROOT, 'checker');
const WORK_ITEMS_DIR = path.join(FORGE_ROOT, 'work_items');
const GOVERNANCE_DIR = path.join(FORGE_ROOT, 'governance');

// =============================================================================
// YAML Utilities
// =============================================================================

async function readYaml<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return yaml.load(content) as T;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// CheckerSpec Operations
// =============================================================================

/**
 * Load CheckerSpec for a work item
 */
export async function loadCheckerSpec(workItemId: string): Promise<CheckerSpec | null> {
  const specPath = path.join(WORK_ITEMS_DIR, workItemId, 'checker_spec.yaml');

  if (!(await fileExists(specPath))) {
    await logEvent('checker_spec_invalid', {
      data: { workItemId, reason: 'File not found', path: specPath },
    });
    return null;
  }

  try {
    const spec = await readYaml<CheckerSpec>(specPath);

    // Basic validation
    if (!spec.version || !spec.workItem || !spec.verification || !spec.validation) {
      await logEvent('checker_spec_invalid', {
        data: { workItemId, reason: 'Missing required fields' },
      });
      return null;
    }

    await logEvent('checker_spec_loaded', {
      data: { workItemId, specId: spec.workItem.id },
    });

    return spec;
  } catch (error) {
    await logEvent('checker_spec_invalid', {
      data: { workItemId, reason: (error as Error).message },
    });
    return null;
  }
}

/**
 * Validate CheckerSpec against schema
 */
export async function validateCheckerSpec(spec: CheckerSpec): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Required fields
  if (!spec.version) errors.push('Missing version');
  if (!spec.workItem?.id) errors.push('Missing workItem.id');
  if (!spec.workItem?.title) errors.push('Missing workItem.title');
  if (!spec.intent?.summary) errors.push('Missing intent.summary');
  if (!spec.intent?.acceptanceCriteria?.length) errors.push('Missing acceptanceCriteria');
  if (!spec.verification?.checks?.length) errors.push('No verification checks defined');
  if (!spec.validation?.checks?.length) errors.push('No validation checks defined');
  if (!spec.definitionOfDone?.length) errors.push('Missing definitionOfDone');

  // Check ID format
  for (const check of spec.verification?.checks || []) {
    if (!check.id.match(/^V-\d+$/)) {
      errors.push(`Invalid verification check ID: ${check.id} (expected V-N format)`);
    }
  }
  for (const check of spec.validation?.checks || []) {
    if (!check.id.match(/^B-\d+$/)) {
      errors.push(`Invalid validation check ID: ${check.id} (expected B-N format)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// V&V Evaluation
// =============================================================================

/**
 * Evaluate verification checks against evidence
 */
export async function evaluateVerification(
  spec: CheckerSpec,
  evidence: Evidence & { testResults?: TestEvidence }
): Promise<VnVBlockResult> {
  const checks = spec.verification.checks;
  const mustPass = checks.filter((c) => c.priority === 'must').map((c) => c.id);
  const passed: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const check of checks) {
    const result = await evaluateCheck(check, evidence);
    if (result === 'passed') {
      passed.push(check.id);
    } else if (result === 'failed') {
      failed.push(check.id);
    } else {
      skipped.push(check.id);
    }
  }

  // Status: must-priority checks determine overall status
  const mustFailed = mustPass.filter((id) => failed.includes(id));
  const status: VnVStatus = mustFailed.length > 0 ? 'failed' : 'passed';

  return { mustPass, passed, failed, skipped, status };
}

/**
 * Evaluate validation checks against evidence
 */
export async function evaluateValidation(
  spec: CheckerSpec,
  evidence: Evidence & { testResults?: TestEvidence }
): Promise<VnVBlockResult> {
  const checks = spec.validation.checks;
  const mustPass = checks.filter((c) => c.priority === 'must').map((c) => c.id);
  const passed: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const check of checks) {
    const result = await evaluateCheck(check, evidence);
    if (result === 'passed') {
      passed.push(check.id);
    } else if (result === 'failed') {
      failed.push(check.id);
    } else {
      skipped.push(check.id);
    }
  }

  const mustFailed = mustPass.filter((id) => failed.includes(id));
  const status: VnVStatus = mustFailed.length > 0 ? 'failed' : 'passed';

  return { mustPass, passed, failed, skipped, status };
}

/**
 * Evaluate a single check against evidence
 */
async function evaluateCheck(
  check: Check,
  evidence: Evidence & { testResults?: TestEvidence }
): Promise<'passed' | 'failed' | 'skipped'> {
  // If check references specific test IDs, verify they passed
  if (check.testIds && check.testIds.length > 0 && evidence.testResults) {
    const allTestsPassed = check.testIds.every((testId) => {
      // Check if any test run contains this test and it passed
      return evidence.testResults!.runs.some((run) => {
        if (run.status !== 'pass') return false;
        // If we have detailed failure info, check this test isn't in it
        if (run.failures) {
          return !run.failures.some((f) => f.testId === testId || f.testName.includes(testId));
        }
        return true;
      });
    });
    return allTestsPassed ? 'passed' : 'failed';
  }

  // If automated check with no specific tests, use overall evidence
  if (check.automated !== false) {
    if (evidence.outputHash) {
      return 'passed'; // Evidence exists, assume passed
    }
    return 'skipped';
  }

  // Manual check - skip for automated evaluation
  return 'skipped';
}

/**
 * Full V&V evaluation
 */
export async function evaluateVnV(
  spec: CheckerSpec,
  evidence: Evidence & { testResults?: TestEvidence }
): Promise<VnVResult> {
  const verification = await evaluateVerification(spec, evidence);
  const validation = await evaluateValidation(spec, evidence);

  const overallStatus =
    verification.status === 'passed' && validation.status === 'passed' ? 'PASS' : 'FAIL';

  const result: VnVResult = {
    checkerSpecId: spec.workItem.id,
    workItemId: spec.workItem.id,
    evaluatedAt: new Date().toISOString(),
    verification,
    validation,
    overallStatus,
    summary: `V: ${verification.passed.length}/${verification.mustPass.length + verification.passed.length} passed, ` +
      `B: ${validation.passed.length}/${validation.mustPass.length + validation.passed.length} passed`,
  };

  await logEvent(overallStatus === 'PASS' ? 'vnv_passed' : 'vnv_failed', {
    data: { workItemId: spec.workItem.id, result },
  });

  return result;
}

// =============================================================================
// Gate Evaluation
// =============================================================================

interface GateRules {
  version: string;
  gates: Record<string, GateRule>;
  complexity: ComplexityRules;
}

interface GateRule {
  name: string;
  description: string;
  requiredSuites: string[];
  requireTargetedTests?: boolean;
  requireCheckerSpec?: boolean;
  denyIf?: DenyCondition[];
  warnIf?: WarnCondition[];
}

interface DenyCondition {
  condition: string;
  reason: string;
  overridable?: boolean;
}

interface WarnCondition {
  condition: string;
  message: string;
}

interface ComplexityRules {
  maxActiveWorkItemsPerRun: number;
  requireDecompositionIf: {
    storyPointsAtLeast: number;
    touchedModulesAtLeast: number;
  };
}

/**
 * Load gate rules
 */
async function loadGateRules(): Promise<GateRules> {
  const rulesPath = path.join(GOVERNANCE_DIR, 'gate_rules.yaml');
  return readYaml<GateRules>(rulesPath);
}

/**
 * Evaluate a gate
 */
export async function evaluateGate(
  gateName: GateName,
  context: GateContext
): Promise<GateDecision> {
  const rules = await loadGateRules();
  const gate = rules.gates[gateName];

  if (!gate) {
    return {
      gate: gateName,
      status: 'DENIED',
      reasons: [`Gate '${gateName}' not defined in rules`],
      evaluatedAt: new Date().toISOString(),
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];
  let status: GateStatus = 'AUTHORIZED';

  // 1. Check required suites
  for (const suite of gate.requiredSuites || []) {
    const suiteResult = context.suiteResults[suite];
    if (!suiteResult || !suiteResult.passed) {
      status = 'DENIED';
      reasons.push(`Required suite '${suite}' not passed`);
    }
  }

  // 2. Check targeted tests
  if (gate.requireTargetedTests && !context.targetedTestsPassed) {
    status = 'DENIED';
    reasons.push('Targeted tests required but not passed');
  }

  // 3. Check CheckerSpec requirement
  if (gate.requireCheckerSpec !== false && !context.checkerSpecId) {
    status = 'DENIED';
    reasons.push('CheckerSpec required for this gate');
  }

  // 4. Evaluate deny conditions
  for (const deny of gate.denyIf || []) {
    if (evaluateCondition(deny.condition, context)) {
      if (!deny.overridable) {
        status = 'DENIED';
        reasons.push(deny.reason);
      } else {
        warnings.push(`Overridable: ${deny.reason}`);
      }
    }
  }

  // 5. Evaluate warn conditions
  for (const warn of gate.warnIf || []) {
    if (evaluateCondition(warn.condition, context)) {
      warnings.push(warn.message);
    }
  }

  // 6. Check complexity rules for pre_dispatch
  if (gateName === 'pre_dispatch') {
    const spec = context.checkerSpecId
      ? await loadCheckerSpec(context.workItemId || '')
      : null;

    if (spec) {
      const points = spec.workItem.storyPoints || 0;
      const modules = spec.workItem.touchedModules?.length || 0;

      if (points >= rules.complexity.requireDecompositionIf.storyPointsAtLeast) {
        status = 'DENIED';
        reasons.push(`Story points (${points}) exceed threshold - decomposition required`);
      }

      if (modules >= rules.complexity.requireDecompositionIf.touchedModulesAtLeast) {
        warnings.push(`Touches ${modules} modules - consider decomposition`);
      }
    }
  }

  const decision: GateDecision = {
    gate: gateName,
    status,
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined,
    evaluatedAt: new Date().toISOString(),
    context,
  };

  await logEvent(status === 'AUTHORIZED' ? 'gate_authorized' : 'gate_denied', {
    data: { gate: gateName, decision },
  });

  return decision;
}

/**
 * Evaluate a condition expression
 */
function evaluateCondition(condition: string, context: GateContext): boolean {
  // Simple condition evaluator
  // Supports: smoke.failed > 0, risk.level == 'high', coverage < 80

  try {
    // Replace context variables
    let expr = condition;

    // Suite results
    for (const [suite, result] of Object.entries(context.suiteResults || {})) {
      expr = expr.replace(new RegExp(`${suite}\\.passed`, 'g'), String(result.passed));
      expr = expr.replace(new RegExp(`${suite}\\.failed`, 'g'), String(result.failed));
      expr = expr.replace(new RegExp(`${suite}\\.notRun`, 'g'), String(!result));
    }

    // Coverage
    expr = expr.replace(/coverage\.delta/g, String(context.coverageDelta || 0));
    expr = expr.replace(/coverage/g, String(context.coveragePercent || 0));

    // Risk level
    expr = expr.replace(/risk\.level/g, `'${context.riskLevel || 'low'}'`);

    // CheckerSpec
    expr = expr.replace(/checkerSpec\.missing/g, String(!context.checkerSpecId));

    // Boolean evaluations
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map((s) => s.trim());
      return left === right;
    }
    if (expr.includes('!=')) {
      const [left, right] = expr.split('!=').map((s) => s.trim());
      return left !== right;
    }
    if (expr.includes('>=')) {
      const [left, right] = expr.split('>=').map((s) => parseFloat(s.trim()));
      return left >= right;
    }
    if (expr.includes('<=')) {
      const [left, right] = expr.split('<=').map((s) => parseFloat(s.trim()));
      return left <= right;
    }
    if (expr.includes('>')) {
      const [left, right] = expr.split('>').map((s) => parseFloat(s.trim()));
      return left > right;
    }
    if (expr.includes('<')) {
      const [left, right] = expr.split('<').map((s) => parseFloat(s.trim()));
      return left < right;
    }

    // Boolean literal
    return expr.trim() === 'true';
  } catch {
    return false;
  }
}

// =============================================================================
// Summary Generation
// =============================================================================

/**
 * Generate V&V summary for Receipt Pack
 */
export function generateVnVSummary(result: VnVResult, gates: GateDecision[]): VnVSummary {
  return {
    verification: {
      status: result.verification.status,
      totalChecks: result.verification.passed.length + result.verification.failed.length + result.verification.skipped.length,
      mustChecks: result.verification.mustPass.length,
      mustPassed: result.verification.mustPass.filter((id) => result.verification.passed.includes(id)).length,
      mustFailed: result.verification.mustPass.filter((id) => result.verification.failed.includes(id)).length,
      passedIds: result.verification.passed,
      failedIds: result.verification.failed,
    },
    validation: {
      status: result.validation.status,
      totalChecks: result.validation.passed.length + result.validation.failed.length + result.validation.skipped.length,
      mustChecks: result.validation.mustPass.length,
      mustPassed: result.validation.mustPass.filter((id) => result.validation.passed.includes(id)).length,
      mustFailed: result.validation.mustPass.filter((id) => result.validation.failed.includes(id)).length,
      passedIds: result.validation.passed,
      failedIds: result.validation.failed,
    },
    gatesEvaluated: gates.map((g) => ({
      gate: g.gate,
      status: g.status,
      evaluatedAt: g.evaluatedAt,
    })),
    overallStatus: result.overallStatus,
  };
}

// =============================================================================
// Exports
// =============================================================================

export const vnv = {
  // CheckerSpec
  loadCheckerSpec,
  validateCheckerSpec,

  // V&V Evaluation
  evaluateVerification,
  evaluateValidation,
  evaluateVnV,

  // Gate Evaluation
  evaluateGate,

  // Summary
  generateVnVSummary,
};

export default vnv;
