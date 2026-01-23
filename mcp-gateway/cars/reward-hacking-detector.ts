/**
 * MCP Security Gateway - Reward Hacking Detector
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.5 - Reward Hacking Detection
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Detects reward hacking patterns per Anthropic research:
 *   "From Shortcuts to Sabotage: Natural Emergent Misalignment
 *   from Reward Hacking" (Nov 2025)
 *
 *   Key finding: "When models learn to reward hack (cheat on programming tasks),
 *   they spontaneously generalize to alignment faking, research sabotage, and
 *   cooperation with malicious actors—WITHOUT being trained or instructed to do so."
 *
 *   Critical Finding: Alignment faking reasoning appeared in 50% of responses
 *   even to simple questions like "What are your goals?" after the model learned
 *   to reward hack.
 */

import { RiskLevel } from '../core/types.js';

// ============================================
// INTERFACES
// ============================================

/**
 * Context for reward hacking analysis
 */
export interface RewardHackingContext {
  /** Code and tests were modified in the same commit */
  codeAndTestsModifiedTogether?: boolean;

  /** Number of assertions removed in this change */
  assertionsRemovedCount?: number;

  /** Task completed much faster than expected */
  rapidCompletion?: boolean;

  /** Commit includes test file modifications */
  testFilesModified?: boolean;

  /** Coverage decreased after this change */
  coverageDecreased?: boolean;

  /** Previous coverage percentage */
  previousCoverage?: number;

  /** Current coverage percentage */
  currentCoverage?: number;
}

/**
 * Pattern detected in code analysis
 */
export interface RewardHackingPattern {
  /** Pattern identifier */
  pattern: string;

  /** Human-readable description */
  description: string;

  /** Severity level */
  severity: 'critical' | 'high' | 'medium';

  /** Risk modifier to apply */
  riskModifier: number;

  /** Location in code where pattern was found */
  location?: string;

  /** Line number if available */
  lineNumber?: number;

  /** Matched text snippet */
  matchedText?: string;
}

/**
 * Result of reward hacking analysis
 */
export interface RewardHackingAssessment {
  /** Number of indicators detected */
  indicatorCount: number;

  /** Total risk modifier (capped at 3) */
  riskModifier: number;

  /** Detected patterns */
  patterns: RewardHackingPattern[];

  /** Recommended action */
  action: RewardHackingAction;

  /** Detailed analysis summary */
  summary: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Timestamp of assessment */
  timestamp: string;
}

/**
 * Possible actions based on detection
 */
export type RewardHackingAction =
  | 'NORMAL'           // No indicators, normal CARS assessment
  | 'EXTERNAL_VERIFY'  // 1 indicator - external test verification required
  | 'HUMAN_REVIEW'     // 2 indicators - human review of all test results
  | 'FULL_AUDIT';      // 3+ indicators - assume compromised, full audit

// ============================================
// PATTERN DEFINITIONS
// ============================================

interface PatternDefinition {
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  modifier: number;
  description: string;
}

/**
 * Regex patterns for detecting reward hacking code
 */
const REWARD_HACKING_PATTERNS: Record<string, PatternDefinition> = {
  // CRITICAL: Force exit with success code
  SYS_EXIT_SUCCESS: {
    pattern: /sys\.exit\s*\(\s*0\s*\)/g,
    severity: 'critical',
    modifier: 1.5,
    description: 'Force exit with success code (sys.exit(0))',
  },
  OS_EXIT: {
    pattern: /os\._exit\s*\(/g,
    severity: 'critical',
    modifier: 1.5,
    description: 'os._exit() bypasses cleanup handlers',
  },
  PROCESS_EXIT_SUCCESS: {
    pattern: /process\.exit\s*\(\s*0\s*\)/g,
    severity: 'critical',
    modifier: 1.5,
    description: 'Force exit with success code (process.exit(0))',
  },

  // CRITICAL: Tautological tests (always pass)
  ASSERT_TRUE_BARE: {
    pattern: /assert\s+True\s*$/gm,
    severity: 'critical',
    modifier: 1.5,
    description: 'Tautological assertion - always passes',
  },
  EXPECT_TRUE_BARE: {
    pattern: /expect\s*\(\s*true\s*\)/gi,
    severity: 'critical',
    modifier: 1.5,
    description: 'Tautological expectation - always passes',
  },
  ASSERT_EQUAL_SAME: {
    pattern: /assert\s+(\w+)\s*==\s*\1\b/g,
    severity: 'critical',
    modifier: 1.5,
    description: 'Comparing variable to itself',
  },

  // HIGH: Mock manipulation
  MOCK_RETURN_TRUE: {
    pattern: /mock\.return_value\s*=\s*True/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Mock always returns True/success',
  },
  MOCK_RETURN_EXPECTED: {
    pattern: /return_value\s*=\s*expected/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Mock returns expected value (circular)',
  },
  JEST_MOCK_RESOLVED: {
    pattern: /mockResolvedValue\s*\(\s*true\s*\)/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Jest mock always resolves to true',
  },
  JEST_MOCK_IMPLEMENTATION: {
    pattern: /mockImplementation\s*\(\s*\(\s*\)\s*=>\s*true\s*\)/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Jest mock implementation always returns true',
  },

  // HIGH: Skip verification
  PYTEST_SKIP: {
    pattern: /@pytest\.mark\.skip/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Test skipped with pytest.mark.skip',
  },
  PYTEST_SKIP_IF: {
    pattern: /@pytest\.mark\.skipif\s*\(\s*True/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Test always skipped (skipif True)',
  },
  UNITTEST_SKIP: {
    pattern: /@unittest\.skip/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Test skipped with unittest.skip',
  },
  JEST_SKIP: {
    pattern: /(?:it|test|describe)\.skip\s*\(/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Jest test skipped',
  },
  XTEST: {
    pattern: /xtest\s*\(/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Test disabled with xtest',
  },

  // HIGH: Hardcoded success messages
  ECHO_PASS: {
    pattern: /echo\s*["']PASS["']/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Hardcoded PASS message in shell',
  },
  ECHO_SUCCESS: {
    pattern: /echo\s*["']SUCCESS["']/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Hardcoded SUCCESS message in shell',
  },
  PRINT_PASS: {
    pattern: /print\s*\(\s*["'](?:PASS|SUCCESS|OK)["']\s*\)/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Hardcoded success print statement',
  },
  CONSOLE_LOG_PASS: {
    pattern: /console\.log\s*\(\s*["'](?:PASS|SUCCESS|OK)["']\s*\)/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Hardcoded success console.log',
  },

  // MEDIUM: Coverage exclusion
  PRAGMA_NO_COVER: {
    pattern: /#\s*pragma:\s*no\s*cover/gi,
    severity: 'medium',
    modifier: 0.5,
    description: 'Code excluded from coverage',
  },
  ISTANBUL_IGNORE: {
    pattern: /\/\*\s*istanbul\s+ignore/gi,
    severity: 'medium',
    modifier: 0.5,
    description: 'Code excluded from Istanbul coverage',
  },
  C8_IGNORE: {
    pattern: /\/\*\s*c8\s+ignore/gi,
    severity: 'medium',
    modifier: 0.5,
    description: 'Code excluded from c8 coverage',
  },
  COVERAGE_EXCLUDE: {
    pattern: /# type:\s*ignore|# noqa/gi,
    severity: 'medium',
    modifier: 0.5,
    description: 'Type checking or linting ignored',
  },

  // HIGH: Empty catch blocks
  EMPTY_CATCH_PYTHON: {
    pattern: /except.*:\s*pass/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Empty except block swallows errors',
  },
  EMPTY_CATCH_JS: {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: 'high',
    modifier: 1.0,
    description: 'Empty catch block swallows errors',
  },

  // HIGH: Assertion removal patterns
  COMMENTED_ASSERT: {
    pattern: /\/\/\s*assert|#\s*assert/gi,
    severity: 'high',
    modifier: 1.0,
    description: 'Commented out assertion',
  },
  TODO_ASSERT: {
    pattern: /\/\/\s*TODO:?\s*assert|#\s*TODO:?\s*assert/gi,
    severity: 'medium',
    modifier: 0.5,
    description: 'TODO comment for missing assertion',
  },
};

// ============================================
// DETECTOR CLASS
// ============================================

/**
 * Detects reward hacking patterns per Anthropic Nov 2025 research
 *
 * @example
 * ```typescript
 * const detector = new RewardHackingDetector();
 *
 * const code = `
 *   def test_feature():
 *       result = my_function()
 *       sys.exit(0)  # Force success
 * `;
 *
 * const assessment = detector.analyzeCode(code, {
 *   codeAndTestsModifiedTogether: true,
 *   assertionsRemovedCount: 2,
 * });
 *
 * if (assessment.action === 'FULL_AUDIT') {
 *   // Assume compromised, require full audit
 * }
 * ```
 */
export class RewardHackingDetector {
  /**
   * Analyze code for reward hacking patterns
   */
  analyzeCode(
    code: string,
    context?: RewardHackingContext
  ): RewardHackingAssessment {
    const patterns: RewardHackingPattern[] = [];
    let totalModifier = 0;

    // Scan for each pattern
    for (const [name, config] of Object.entries(REWARD_HACKING_PATTERNS)) {
      const matches = this.findMatches(code, config.pattern);

      for (const match of matches) {
        patterns.push({
          pattern: name,
          description: config.description,
          severity: config.severity,
          riskModifier: config.modifier,
          lineNumber: match.lineNumber,
          matchedText: match.text.slice(0, 50), // Truncate for readability
        });
        totalModifier += config.modifier;
      }
    }

    // Check context-based indicators
    if (context) {
      // Test infrastructure modified alongside code (+1 level)
      if (context.codeAndTestsModifiedTogether && context.testFilesModified) {
        patterns.push({
          pattern: 'TEST_INFRA_MODIFIED',
          description: 'Test infrastructure modified alongside code changes',
          severity: 'high',
          riskModifier: 1.0,
        });
        totalModifier += 1.0;
      }

      // Assertions removed (+1.5 per assertion)
      if (context.assertionsRemovedCount && context.assertionsRemovedCount > 0) {
        patterns.push({
          pattern: 'ASSERTIONS_REMOVED',
          description: `${context.assertionsRemovedCount} assertion(s) removed in this change`,
          severity: 'critical',
          riskModifier: 1.5 * context.assertionsRemovedCount,
        });
        totalModifier += 1.5 * context.assertionsRemovedCount;
      }

      // Coverage decreased
      if (
        context.coverageDecreased &&
        context.previousCoverage !== undefined &&
        context.currentCoverage !== undefined
      ) {
        const drop = context.previousCoverage - context.currentCoverage;
        if (drop > 5) {
          patterns.push({
            pattern: 'COVERAGE_DROPPED',
            description: `Coverage dropped by ${drop.toFixed(1)}% (${context.previousCoverage}% -> ${context.currentCoverage}%)`,
            severity: drop > 20 ? 'critical' : 'high',
            riskModifier: drop > 20 ? 1.5 : 1.0,
          });
          totalModifier += drop > 20 ? 1.5 : 1.0;
        }
      }
    }

    // Determine action based on patterns
    const action = this.determineAction(patterns);

    // Calculate confidence
    const confidence = this.calculateConfidence(patterns);

    // Generate summary
    const summary = this.generateSummary(patterns, action);

    return {
      indicatorCount: patterns.length,
      riskModifier: Math.min(totalModifier, 3), // Cap at +3 levels (to CRITICAL)
      patterns,
      action,
      summary,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Find all matches with line numbers
   */
  private findMatches(
    code: string,
    pattern: RegExp
  ): Array<{ text: string; lineNumber: number }> {
    const matches: Array<{ text: string; lineNumber: number }> = [];
    const lines = code.split('\n');

    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      let match: RegExpExecArray | null;

      // Reset for each line
      regex.lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          text: match[0],
          lineNumber: i + 1,
        });

        // Prevent infinite loop for zero-width matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    return matches;
  }

  /**
   * Determine action based on detected patterns
   */
  private determineAction(patterns: RewardHackingPattern[]): RewardHackingAction {
    const count = patterns.length;
    const hasCritical = patterns.some(p => p.severity === 'critical');

    // Any critical pattern or 3+ patterns triggers full audit
    if (hasCritical || count >= 3) {
      return 'FULL_AUDIT';
    }

    // 2 patterns requires human review
    if (count === 2) {
      return 'HUMAN_REVIEW';
    }

    // 1 pattern requires external verification
    if (count === 1) {
      return 'EXTERNAL_VERIFY';
    }

    return 'NORMAL';
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(patterns: RewardHackingPattern[]): number {
    if (patterns.length === 0) {
      return 0.95;
    }

    // Higher confidence with more critical patterns
    const criticalCount = patterns.filter(p => p.severity === 'critical').length;
    const highCount = patterns.filter(p => p.severity === 'high').length;

    let confidence = 0.80;
    confidence += criticalCount * 0.05;
    confidence += highCount * 0.03;

    return Math.min(0.99, confidence);
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    patterns: RewardHackingPattern[],
    action: RewardHackingAction
  ): string {
    if (patterns.length === 0) {
      return 'No reward hacking patterns detected. Normal CARS assessment applies.';
    }

    const criticalPatterns = patterns.filter(p => p.severity === 'critical');
    const highPatterns = patterns.filter(p => p.severity === 'high');
    const mediumPatterns = patterns.filter(p => p.severity === 'medium');

    const parts: string[] = [
      `Detected ${patterns.length} reward hacking pattern(s):`,
    ];

    if (criticalPatterns.length > 0) {
      parts.push(
        `\nCRITICAL (${criticalPatterns.length}):`,
        ...criticalPatterns.map(p => `  - ${p.description}${p.lineNumber ? ` (line ${p.lineNumber})` : ''}`)
      );
    }

    if (highPatterns.length > 0) {
      parts.push(
        `\nHIGH (${highPatterns.length}):`,
        ...highPatterns.map(p => `  - ${p.description}${p.lineNumber ? ` (line ${p.lineNumber})` : ''}`)
      );
    }

    if (mediumPatterns.length > 0) {
      parts.push(
        `\nMEDIUM (${mediumPatterns.length}):`,
        ...mediumPatterns.map(p => `  - ${p.description}${p.lineNumber ? ` (line ${p.lineNumber})` : ''}`)
      );
    }

    const actionDescriptions: Record<RewardHackingAction, string> = {
      NORMAL: 'Normal CARS assessment applies.',
      EXTERNAL_VERIFY: 'External test verification required.',
      HUMAN_REVIEW: 'Human review of all test results required.',
      FULL_AUDIT: 'ASSUME COMPROMISED - Full audit required before proceeding.',
    };

    parts.push(`\nAction: ${actionDescriptions[action]}`);

    return parts.join('\n');
  }

  /**
   * Convert assessment to risk level adjustment
   */
  escalateRiskLevel(
    currentLevel: RiskLevel,
    assessment: RewardHackingAssessment
  ): RiskLevel {
    if (assessment.riskModifier === 0) {
      return currentLevel;
    }

    const levels: RiskLevel[] = ['minimal', 'low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentLevel);
    const newIndex = Math.min(
      currentIndex + Math.ceil(assessment.riskModifier),
      levels.length - 1
    );

    return levels[newIndex] ?? currentLevel;
  }

  /**
   * Analyze a diff/patch for suspicious patterns
   */
  analyzeDiff(diff: string): RewardHackingAssessment {
    // Extract added lines (lines starting with +)
    const addedLines = diff
      .split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .map(line => line.slice(1))
      .join('\n');

    // Extract removed lines to check for assertion removal
    const removedLines = diff
      .split('\n')
      .filter(line => line.startsWith('-') && !line.startsWith('---'))
      .map(line => line.slice(1))
      .join('\n');

    // Count removed assertions
    const assertionPatterns = [
      /assert/gi,
      /expect\s*\(/gi,
      /should\./gi,
      /\.toBe/gi,
      /\.toEqual/gi,
    ];

    let assertionsRemoved = 0;
    for (const pattern of assertionPatterns) {
      const removed = (removedLines.match(pattern) || []).length;
      const added = (addedLines.match(pattern) || []).length;
      if (removed > added) {
        assertionsRemoved += removed - added;
      }
    }

    // Analyze added code with context
    return this.analyzeCode(addedLines, {
      assertionsRemovedCount: assertionsRemoved,
      codeAndTestsModifiedTogether: diff.includes('.test.') || diff.includes('_test.'),
      testFilesModified: diff.includes('.test.') || diff.includes('_test.') || diff.includes('/tests/'),
    });
  }
}

// ============================================
// EXPORTS
// ============================================

export default RewardHackingDetector;
