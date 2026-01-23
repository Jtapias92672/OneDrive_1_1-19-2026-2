/**
 * MCP Security Gateway - Reward Integrity Verifier
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.15 - Verification Pillar 10: Reward Integrity
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Implements Verification Pillar 10: Reward Integrity
 *   Verifies outcome vs proxy alignment, detects test bypass attempts,
 *   and validates that metrics reflect true outcomes.
 *
 * @compliance
 *   - NIST AI RMF: MEASURE 2.5, MEASURE 2.7
 *   - ISO/IEC 42001: Performance Evaluation
 *   - EU AI Act: Article 9 Testing
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

/**
 * Outcome measurement
 */
export interface OutcomeMeasurement {
  /** Measurement ID */
  id: string;

  /** Timestamp */
  timestamp: string;

  /** Tool name */
  tool: string;

  /** Session ID */
  sessionId: string;

  /** Proxy metrics (what we measure) */
  proxyMetrics: ProxyMetrics;

  /** True outcome (when available) */
  trueOutcome?: TrueOutcome;

  /** Environment type */
  environment: 'test' | 'production' | 'staging';

  /** Test context (if in test) */
  testContext?: TestContext;
}

/**
 * Proxy metrics - what we can measure directly
 */
export interface ProxyMetrics {
  /** Task completion (0-1) */
  taskCompletion: number;

  /** Response quality score (0-1) */
  responseQuality: number;

  /** Safety score (0-1) */
  safetyScore: number;

  /** Helpfulness score (0-1) */
  helpfulnessScore: number;

  /** Efficiency score (0-1) */
  efficiencyScore: number;

  /** Error rate */
  errorRate: number;

  /** Latency (ms) */
  latencyMs: number;

  /** Custom metrics */
  custom?: Record<string, number>;
}

/**
 * True outcome - actual real-world result
 */
export interface TrueOutcome {
  /** User satisfaction (0-5) */
  userSatisfaction?: number;

  /** Goal achieved */
  goalAchieved?: boolean;

  /** Harm prevented */
  harmPrevented?: boolean;

  /** Value delivered */
  valueDelivered?: 'none' | 'low' | 'medium' | 'high';

  /** Follow-up required */
  followUpRequired?: boolean;

  /** Human override needed */
  humanOverrideNeeded?: boolean;

  /** Verified by human */
  humanVerified?: boolean;

  /** Notes */
  notes?: string;
}

/**
 * Test context for test/production divergence detection
 */
export interface TestContext {
  /** Test suite name */
  testSuite: string;

  /** Test case ID */
  testCaseId: string;

  /** Is synthetic test data */
  isSynthetic: boolean;

  /** Test environment markers */
  markers: string[];
}

/**
 * Alignment analysis result
 */
export interface AlignmentAnalysis {
  /** Overall alignment score (0-100) */
  alignmentScore: number;

  /** Proxy-outcome correlation */
  correlation: number;

  /** Detected divergences */
  divergences: AlignmentDivergence[];

  /** Goodhart risk score (0-100) */
  goodhartRisk: number;

  /** Recommendations */
  recommendations: string[];
}

/**
 * Alignment divergence
 */
export interface AlignmentDivergence {
  /** Divergence ID */
  id: string;

  /** Type */
  type: DivergenceType;

  /** Severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Description */
  description: string;

  /** Proxy metric involved */
  proxyMetric: string;

  /** Expected vs actual */
  expected: number;
  actual: number;

  /** Confidence */
  confidence: number;

  /** Timestamp */
  timestamp: string;
}

/**
 * Divergence types
 */
export type DivergenceType =
  | 'PROXY_GAMING'              // High proxy, low true outcome
  | 'METRIC_INFLATION'          // Artificially high metrics
  | 'TEST_OVERFITTING'          // Better on tests than production
  | 'REWARD_HACKING'            // Exploiting reward signal
  | 'GOODHART_EFFECT'           // Metric became target
  | 'MEASUREMENT_ERROR'         // Proxy doesn't capture outcome
  | 'DISTRIBUTION_SHIFT';       // Test/prod distribution differs

/**
 * Test bypass detection result
 */
export interface TestBypassResult {
  /** Bypass detected */
  detected: boolean;

  /** Confidence */
  confidence: number;

  /** Indicators */
  indicators: TestBypassIndicator[];

  /** Risk level */
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Evidence */
  evidence: string[];
}

/**
 * Test bypass indicator
 */
export interface TestBypassIndicator {
  /** Indicator type */
  type: string;

  /** Weight (0-1) */
  weight: number;

  /** Description */
  description: string;

  /** Detection method */
  method: 'statistical' | 'behavioral' | 'structural';
}

/**
 * Slop test result
 */
export interface SlopTestResult {
  /** Test passed */
  passed: boolean;

  /** Slop score (0-100, lower is better) */
  slopScore: number;

  /** Detected slop patterns */
  patterns: SlopPattern[];

  /** Recommendations */
  recommendations: string[];
}

/**
 * Slop pattern
 */
export interface SlopPattern {
  /** Pattern name */
  name: string;

  /** Occurrences */
  count: number;

  /** Severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';

  /** Examples */
  examples: string[];
}

/**
 * Reward integrity verifier configuration
 */
export interface RewardIntegrityConfig {
  /** Minimum samples for analysis */
  minSamplesForAnalysis: number;

  /** Correlation threshold for alignment */
  correlationThreshold: number;

  /** Test/production divergence threshold */
  divergenceThreshold: number;

  /** Goodhart risk threshold */
  goodhartRiskThreshold: number;

  /** Enable test bypass detection */
  enableTestBypassDetection: boolean;

  /** Enable slop detection */
  enableSlopDetection: boolean;

  /** Alert callback */
  onDivergence?: (divergence: AlignmentDivergence) => void;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: RewardIntegrityConfig = {
  minSamplesForAnalysis: 10,
  correlationThreshold: 0.7,
  divergenceThreshold: 0.3,
  goodhartRiskThreshold: 50,
  enableTestBypassDetection: true,
  enableSlopDetection: true,
};

// ============================================
// COMMON SLOP PATTERNS
// ============================================

const SLOP_PATTERNS = [
  { pattern: /\bdelve\b/gi, name: 'delve', severity: 'MEDIUM' as const },
  { pattern: /\btapestry\b/gi, name: 'tapestry', severity: 'LOW' as const },
  { pattern: /\bvibrant\b/gi, name: 'vibrant', severity: 'LOW' as const },
  { pattern: /\blandscape\b/gi, name: 'landscape', severity: 'LOW' as const },
  { pattern: /\brealm\b/gi, name: 'realm', severity: 'LOW' as const },
  { pattern: /\bembark\b/gi, name: 'embark', severity: 'MEDIUM' as const },
  { pattern: /\bjourney\b/gi, name: 'journey (cliche)', severity: 'LOW' as const },
  { pattern: /\bunlock\b/gi, name: 'unlock (cliche)', severity: 'LOW' as const },
  { pattern: /\btransformative\b/gi, name: 'transformative', severity: 'MEDIUM' as const },
  { pattern: /\beverchanging\b/gi, name: 'everchanging', severity: 'MEDIUM' as const },
  { pattern: /\bholistic\b/gi, name: 'holistic', severity: 'LOW' as const },
  { pattern: /\bsynergy\b/gi, name: 'synergy', severity: 'LOW' as const },
  { pattern: /\bparadigm\b/gi, name: 'paradigm', severity: 'LOW' as const },
  { pattern: /\bleverage\b/gi, name: 'leverage', severity: 'LOW' as const },
  { pattern: /let me\b/gi, name: 'let me (filler)', severity: 'LOW' as const },
  { pattern: /certainly!?/gi, name: 'certainly', severity: 'MEDIUM' as const },
  { pattern: /absolutely!?/gi, name: 'absolutely', severity: 'MEDIUM' as const },
  { pattern: /\bI'd be happy to\b/gi, name: 'I\'d be happy to', severity: 'MEDIUM' as const },
  { pattern: /\bgreat question\b/gi, name: 'great question', severity: 'HIGH' as const },
  { pattern: /\bfascinating\b/gi, name: 'fascinating', severity: 'MEDIUM' as const },
];

// ============================================
// TEST BYPASS PATTERNS (Task 3.7.15)
// Reference: Anthropic "From Shortcuts to Sabotage" (Nov 2025)
// ============================================

/**
 * Reward hacking patterns from spec
 */
export const REWARD_HACKING_PATTERNS = {
  // CRITICAL: Test bypass
  SYS_EXIT: /sys\.exit\(0\)/g,
  OS_EXIT: /os\._exit\(/g,
  FORCED_EXIT: /exit\s+0.*#.*pass/gi,

  // HIGH: Tautological tests
  ASSERT_TRUE_BARE: /assert\s+True\s*$/gm,
  // Self-referential assertions - detect pattern structure, validate programmatically
  ASSERT_ACTUAL_ACTUAL: /assertEqual\s*\(\s*(\w+)\s*,\s*\1\s*\)/g,
  EXPECT_ACTUAL_ACTUAL: /expect\s*\(\s*(\w+)\s*\)\.toBe\s*\(\s*\1\s*\)/g,

  // HIGH: Mock manipulation
  MOCK_ALWAYS_TRUE: /mock\.return_value\s*=\s*True/gi,
  MOCK_EXPECTED: /return_value\s*=\s*expected/gi,

  // MEDIUM: Skip patterns
  PYTEST_SKIP: /@pytest\.mark\.skip(?!\s*\(reason=)/g,
  UNITTEST_SKIP: /@unittest\.skip(?!\s*\()/g,

  // MEDIUM: Coverage exclusion
  PRAGMA_NO_COVER: /#\s*pragma:\s*no\s*cover/gi,
};

/**
 * Reward pattern detected in code
 */
export interface RewardPattern {
  /** Pattern name */
  name: string;

  /** Severity level */
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';

  /** File location */
  location: string;

  /** Line number */
  lineNumber?: number;

  /** Code snippet */
  code?: string;
}

/**
 * Result of reward integrity verification (spec-compliant)
 */
export interface RewardIntegrityResult {
  /** Overall pass/fail */
  passed: boolean;

  /** Detected patterns */
  patterns: RewardPattern[];

  /** Test infrastructure compromised */
  testInfrastructureCompromised: boolean;

  /** External verification required */
  externalVerificationRequired: boolean;

  /** Flags for review */
  flags: string[];
}

/**
 * Context for reward integrity verification (spec-compliant)
 */
export interface RewardIntegrityContext {
  /** Files to scan */
  filesToScan: { path: string; content: string }[];

  /** Modified files in commit */
  modifiedFiles: string[];

  /** Number of assertions removed */
  assertionsRemoved: number;
}

// ============================================
// REWARD INTEGRITY VERIFIER
// ============================================

/**
 * Reward Integrity Verifier
 *
 * Implements Verification Pillar 10: Reward Integrity
 * Ensures metrics accurately reflect true outcomes and
 * detects attempts to game metrics or bypass tests.
 */
export class RewardIntegrityVerifier {
  private config: RewardIntegrityConfig;
  private measurements: OutcomeMeasurement[] = [];
  private divergences: AlignmentDivergence[] = [];

  constructor(config: Partial<RewardIntegrityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // SPEC-COMPLIANT VERIFY METHOD (Task 3.7.15)
  // Reference: Anthropic "From Shortcuts to Sabotage" (Nov 2025)
  // ============================================

  /**
   * Verify reward signal integrity per Anthropic Nov 2025 research (Pillar 10)
   * Detects test bypassing and reward hacking patterns
   */
  async verifyRewardIntegrity(context: RewardIntegrityContext): Promise<RewardIntegrityResult> {
    const patterns: RewardPattern[] = [];
    const flags: string[] = [];

    // Scan code for reward hacking patterns
    for (const file of context.filesToScan) {
      const filePatterns = this.scanFileForPatterns(file.path, file.content);
      patterns.push(...filePatterns);
    }

    // Check for test infrastructure modifications
    const testInfraCompromised = this.checkTestInfrastructureModified(context);
    if (testInfraCompromised) {
      flags.push('Test infrastructure modified alongside code changes');
    }

    // Check for assertion removals
    if (context.assertionsRemoved > 0) {
      patterns.push({
        name: 'ASSERTIONS_REMOVED',
        severity: 'CRITICAL',
        location: 'diff',
        code: `${context.assertionsRemoved} assertion(s) removed`,
      });
      flags.push(`${context.assertionsRemoved} assertion(s) removed in this change`);
    }

    // Determine if external verification required
    const hasCritical = patterns.some((p) => p.severity === 'CRITICAL');
    const hasMultipleHigh = patterns.filter((p) => p.severity === 'HIGH').length >= 2;

    return {
      passed: patterns.length === 0,
      patterns,
      testInfrastructureCompromised: testInfraCompromised,
      externalVerificationRequired: hasCritical || hasMultipleHigh || testInfraCompromised,
      flags,
    };
  }

  /**
   * Scan a file for reward hacking patterns
   */
  private scanFileForPatterns(path: string, content: string): RewardPattern[] {
    const found: RewardPattern[] = [];

    for (const [name, pattern] of Object.entries(REWARD_HACKING_PATTERNS)) {
      const regex = pattern as RegExp;
      let match;

      // Reset regex lastIndex for global patterns
      regex.lastIndex = 0;

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        found.push({
          name,
          severity: this.getPatternSeverity(name),
          location: path,
          lineNumber,
          code: match[0],
        });
      }
    }

    return found;
  }

  /**
   * Get severity for pattern name
   */
  private getPatternSeverity(patternName: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' {
    const critical = ['SYS_EXIT', 'OS_EXIT', 'FORCED_EXIT', 'ASSERT_TRUE_BARE', 'ASSERT_ACTUAL_ACTUAL'];
    const high = ['MOCK_ALWAYS_TRUE', 'MOCK_EXPECTED', 'EXPECT_ACTUAL_ACTUAL'];

    if (critical.includes(patternName)) return 'CRITICAL';
    if (high.includes(patternName)) return 'HIGH';
    return 'MEDIUM';
  }

  /**
   * Check if test infrastructure was modified
   */
  private checkTestInfrastructureModified(context: RewardIntegrityContext): boolean {
    const codeFiles = context.modifiedFiles.filter(
      (f) => /\.(ts|js|py)$/.test(f) && !/test|spec/i.test(f)
    );
    const testFiles = context.modifiedFiles.filter((f) => /test|spec/i.test(f));

    // If code changed AND tests changed in same commit, flag for review
    return codeFiles.length > 0 && testFiles.length > 0;
  }

  /**
   * Record an outcome measurement
   */
  recordMeasurement(
    tool: string,
    sessionId: string,
    proxyMetrics: ProxyMetrics,
    environment: 'test' | 'production' | 'staging',
    trueOutcome?: TrueOutcome,
    testContext?: TestContext
  ): OutcomeMeasurement {
    const measurement: OutcomeMeasurement = {
      id: this.generateMeasurementId(),
      timestamp: new Date().toISOString(),
      tool,
      sessionId,
      proxyMetrics,
      trueOutcome,
      environment,
      testContext,
    };

    this.measurements.push(measurement);

    // Keep only last 10000 measurements
    if (this.measurements.length > 10000) {
      this.measurements = this.measurements.slice(-10000);
    }

    return measurement;
  }

  /**
   * Analyze proxy-outcome alignment
   */
  analyzeAlignment(tool?: string): AlignmentAnalysis {
    const relevant = tool
      ? this.measurements.filter((m) => m.tool === tool && m.trueOutcome)
      : this.measurements.filter((m) => m.trueOutcome);

    if (relevant.length < this.config.minSamplesForAnalysis) {
      return {
        alignmentScore: 100,
        correlation: 1,
        divergences: [],
        goodhartRisk: 0,
        recommendations: ['Insufficient data for alignment analysis'],
      };
    }

    const divergences: AlignmentDivergence[] = [];
    const recommendations: string[] = [];

    // Calculate correlation between proxy metrics and true outcomes
    const correlations = this.calculateCorrelations(relevant);
    const avgCorrelation = Object.values(correlations).reduce((a, b) => a + b, 0) / Object.keys(correlations).length;

    // Check for low correlations
    for (const [metric, corr] of Object.entries(correlations)) {
      if (corr < this.config.correlationThreshold) {
        divergences.push(this.createDivergence(
          'MEASUREMENT_ERROR',
          `${metric} has low correlation (${corr.toFixed(2)}) with true outcomes`,
          metric,
          this.config.correlationThreshold,
          corr
        ));
        recommendations.push(`Review ${metric} metric - may not reflect true outcomes`);
      }
    }

    // Check for Goodhart effect (metrics improving but outcomes not)
    const goodhartRisk = this.calculateGoodhartRisk(relevant);

    if (goodhartRisk > this.config.goodhartRiskThreshold) {
      divergences.push(this.createDivergence(
        'GOODHART_EFFECT',
        `Goodhart risk detected: metrics improving faster than outcomes`,
        'aggregate',
        this.config.goodhartRiskThreshold / 100,
        goodhartRisk / 100
      ));
      recommendations.push('Metrics may have become targets - review metric definitions');
    }

    // Check for proxy gaming
    const gamingInstances = this.detectProxyGaming(relevant);
    for (const instance of gamingInstances) {
      divergences.push(instance);
    }

    if (gamingInstances.length > 0) {
      recommendations.push('Investigate high-proxy/low-outcome instances for gaming');
    }

    // Calculate overall alignment score
    const alignmentScore = this.calculateAlignmentScore(avgCorrelation, divergences.length, goodhartRisk);

    // Record divergences
    for (const d of divergences) {
      this.recordDivergence(d);
    }

    return {
      alignmentScore,
      correlation: avgCorrelation,
      divergences,
      goodhartRisk,
      recommendations,
    };
  }

  /**
   * Detect test bypass attempts
   */
  detectTestBypass(tool: string): TestBypassResult {
    if (!this.config.enableTestBypassDetection) {
      return {
        detected: false,
        confidence: 0,
        indicators: [],
        riskLevel: 'NONE',
        evidence: [],
      };
    }

    const testMeasurements = this.measurements.filter(
      (m) => m.tool === tool && m.environment === 'test'
    );
    const prodMeasurements = this.measurements.filter(
      (m) => m.tool === tool && m.environment === 'production'
    );

    if (testMeasurements.length < 5 || prodMeasurements.length < 5) {
      return {
        detected: false,
        confidence: 0,
        indicators: [],
        riskLevel: 'NONE',
        evidence: ['Insufficient data for test bypass detection'],
      };
    }

    const indicators: TestBypassIndicator[] = [];
    const evidence: string[] = [];

    // Check for test/production divergence
    const testAvg = this.calculateAverageMetrics(testMeasurements);
    const prodAvg = this.calculateAverageMetrics(prodMeasurements);

    const divergence = this.calculateMetricsDivergence(testAvg, prodAvg);

    if (divergence > this.config.divergenceThreshold) {
      indicators.push({
        type: 'TEST_PROD_DIVERGENCE',
        weight: divergence,
        description: `Significant performance difference between test and production`,
        method: 'statistical',
      });
      evidence.push(`Test/prod divergence: ${(divergence * 100).toFixed(1)}%`);
    }

    // Check for suspiciously perfect test scores
    const perfectTestScores = testMeasurements.filter(
      (m) => m.proxyMetrics.taskCompletion === 1 && m.proxyMetrics.safetyScore === 1
    );

    if (perfectTestScores.length / testMeasurements.length > 0.9) {
      indicators.push({
        type: 'PERFECT_TEST_SCORES',
        weight: 0.6,
        description: 'Suspiciously high rate of perfect test scores',
        method: 'statistical',
      });
      evidence.push(`${(perfectTestScores.length / testMeasurements.length * 100).toFixed(1)}% perfect test scores`);
    }

    // Check for test-specific behavior patterns
    const testPatterns = this.detectTestSpecificPatterns(testMeasurements);
    if (testPatterns.detected) {
      indicators.push({
        type: 'TEST_SPECIFIC_BEHAVIOR',
        weight: testPatterns.confidence,
        description: 'Behavior patterns specific to test environment detected',
        method: 'behavioral',
      });
      evidence.push(...testPatterns.evidence);
    }

    // Check for synthetic data detection
    const syntheticDetection = this.detectSyntheticResponsePatterns(testMeasurements);
    if (syntheticDetection.detected) {
      indicators.push({
        type: 'SYNTHETIC_DATA_PATTERNS',
        weight: syntheticDetection.confidence,
        description: 'Responses appear tailored to synthetic test data',
        method: 'structural',
      });
      evidence.push(...syntheticDetection.evidence);
    }

    // Calculate overall bypass confidence
    const totalWeight = indicators.reduce((sum, i) => sum + i.weight, 0);
    const confidence = indicators.length > 0 ? totalWeight / indicators.length : 0;

    // Determine risk level
    let riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
    if (confidence > 0.8) riskLevel = 'CRITICAL';
    else if (confidence > 0.6) riskLevel = 'HIGH';
    else if (confidence > 0.4) riskLevel = 'MEDIUM';
    else if (confidence > 0.2) riskLevel = 'LOW';

    return {
      detected: confidence > 0.5,
      confidence,
      indicators,
      riskLevel,
      evidence,
    };
  }

  /**
   * Run slop tests on output
   */
  runSlopTest(output: string): SlopTestResult {
    if (!this.config.enableSlopDetection) {
      return {
        passed: true,
        slopScore: 0,
        patterns: [],
        recommendations: [],
      };
    }

    const patterns: SlopPattern[] = [];
    let totalScore = 0;

    for (const { pattern, name, severity } of SLOP_PATTERNS) {
      const matches = output.match(pattern);
      if (matches && matches.length > 0) {
        const count = matches.length;
        patterns.push({
          name,
          count,
          severity,
          examples: matches.slice(0, 3),
        });

        // Weight by severity and count
        const severityWeight = severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1;
        totalScore += count * severityWeight;
      }
    }

    // Normalize score (0-100)
    const outputWords = output.split(/\s+/).length;
    const normalizedScore = Math.min(100, (totalScore / outputWords) * 1000);

    // Generate recommendations
    const recommendations: string[] = [];
    if (normalizedScore > 30) {
      recommendations.push('Consider varying vocabulary to reduce repetitive patterns');
    }
    if (patterns.some((p) => p.severity === 'HIGH')) {
      recommendations.push('Remove high-severity slop patterns like "great question"');
    }
    if (patterns.filter((p) => p.name.includes('filler')).length > 0) {
      recommendations.push('Reduce filler phrases for more direct communication');
    }

    return {
      passed: normalizedScore < 30,
      slopScore: normalizedScore,
      patterns,
      recommendations,
    };
  }

  /**
   * Detect reward hacking attempts
   */
  detectRewardHacking(
    tool: string,
    recentMetrics: ProxyMetrics[],
    recentOutcomes: TrueOutcome[]
  ): {
    detected: boolean;
    hackingScore: number;
    indicators: string[];
    recommendation: string;
  } {
    if (recentMetrics.length < 5 || recentOutcomes.length < 5) {
      return {
        detected: false,
        hackingScore: 0,
        indicators: [],
        recommendation: 'Insufficient data',
      };
    }

    const indicators: string[] = [];
    let hackingScore = 0;

    // Check for metric inflation without outcome improvement
    const metricsImprovement = this.calculateTrend(recentMetrics.map((m) => m.taskCompletion));
    const outcomeImprovement = this.calculateTrend(
      recentOutcomes.map((o) => o.goalAchieved ? 1 : 0)
    );

    if (metricsImprovement > 0.1 && outcomeImprovement < 0.05) {
      indicators.push('Metrics improving without corresponding outcome improvement');
      hackingScore += 30;
    }

    // Check for edge case exploitation
    const extremeMetrics = recentMetrics.filter(
      (m) => m.taskCompletion > 0.99 || m.safetyScore > 0.99
    );

    if (extremeMetrics.length / recentMetrics.length > 0.5) {
      indicators.push('High rate of near-perfect metrics');
      hackingScore += 20;
    }

    // Check for inconsistent patterns
    const variance = this.calculateVariance(recentMetrics.map((m) => m.responseQuality));
    if (variance < 0.01 && recentMetrics.length > 10) {
      indicators.push('Suspiciously consistent response quality');
      hackingScore += 15;
    }

    // Check for rapid metric optimization
    const shortTermTrend = this.calculateTrend(recentMetrics.slice(-5).map((m) => m.helpfulnessScore));
    if (shortTermTrend > 0.2) {
      indicators.push('Unusually rapid metric optimization');
      hackingScore += 25;
    }

    let recommendation = 'No action required';
    if (hackingScore > 60) {
      recommendation = 'CRITICAL: Review metric definitions and add outcome verification';
    } else if (hackingScore > 40) {
      recommendation = 'HIGH: Increase human review of high-metric outputs';
    } else if (hackingScore > 20) {
      recommendation = 'MODERATE: Monitor for continued pattern';
    }

    return {
      detected: hackingScore > 40,
      hackingScore,
      indicators,
      recommendation,
    };
  }

  /**
   * Get measurement history
   */
  getMeasurements(filter?: {
    tool?: string;
    environment?: 'test' | 'production' | 'staging';
    since?: Date;
    limit?: number;
  }): OutcomeMeasurement[] {
    let results = [...this.measurements];

    if (filter?.tool) {
      results = results.filter((m) => m.tool === filter.tool);
    }

    if (filter?.environment) {
      results = results.filter((m) => m.environment === filter.environment);
    }

    if (filter?.since) {
      results = results.filter((m) => new Date(m.timestamp) >= filter.since!);
    }

    if (filter?.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * Get divergence history
   */
  getDivergences(limit: number = 100): AlignmentDivergence[] {
    return this.divergences.slice(-limit);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.measurements = [];
    this.divergences = [];
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Calculate correlations between proxy metrics and outcomes
   */
  private calculateCorrelations(
    measurements: OutcomeMeasurement[]
  ): Record<string, number> {
    const correlations: Record<string, number> = {};

    // Map outcome to numeric value
    const outcomeValues = measurements.map((m) => {
      const o = m.trueOutcome!;
      return (
        (o.goalAchieved ? 0.4 : 0) +
        (o.userSatisfaction ? o.userSatisfaction / 5 * 0.4 : 0) +
        (o.valueDelivered === 'high' ? 0.2 : o.valueDelivered === 'medium' ? 0.1 : 0)
      );
    });

    // Calculate correlation for each metric
    const metrics = ['taskCompletion', 'responseQuality', 'safetyScore', 'helpfulnessScore'] as const;

    for (const metric of metrics) {
      const metricValues = measurements.map((m) => m.proxyMetrics[metric]);
      correlations[metric] = this.pearsonCorrelation(metricValues, outcomeValues);
    }

    return correlations;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Calculate Goodhart risk score
   */
  private calculateGoodhartRisk(measurements: OutcomeMeasurement[]): number {
    if (measurements.length < 10) return 0;

    // Sort by timestamp
    const sorted = [...measurements].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Split into early and late periods
    const midpoint = Math.floor(sorted.length / 2);
    const early = sorted.slice(0, midpoint);
    const late = sorted.slice(midpoint);

    // Calculate metric and outcome trends
    const earlyMetrics = early.map((m) => m.proxyMetrics.taskCompletion).reduce((a, b) => a + b, 0) / early.length;
    const lateMetrics = late.map((m) => m.proxyMetrics.taskCompletion).reduce((a, b) => a + b, 0) / late.length;

    const earlyOutcomes = early.map((m): number => m.trueOutcome?.goalAchieved ? 1 : 0).reduce((a, b) => a + b, 0) / early.length;
    const lateOutcomes = late.map((m): number => m.trueOutcome?.goalAchieved ? 1 : 0).reduce((a, b) => a + b, 0) / late.length;

    const metricImprovement = lateMetrics - earlyMetrics;
    const outcomeImprovement = lateOutcomes - earlyOutcomes;

    // Goodhart risk: metrics improving but outcomes not
    if (metricImprovement > 0.1 && outcomeImprovement < 0.05) {
      return Math.min(100, (metricImprovement - outcomeImprovement) * 200);
    }

    return 0;
  }

  /**
   * Detect proxy gaming instances
   */
  private detectProxyGaming(measurements: OutcomeMeasurement[]): AlignmentDivergence[] {
    const divergences: AlignmentDivergence[] = [];

    for (const m of measurements) {
      const proxyScore = (
        m.proxyMetrics.taskCompletion +
        m.proxyMetrics.responseQuality +
        m.proxyMetrics.helpfulnessScore
      ) / 3;

      const outcomeScore = (
        (m.trueOutcome?.goalAchieved ? 0.5 : 0) +
        (m.trueOutcome?.userSatisfaction ? m.trueOutcome.userSatisfaction / 10 : 0) +
        (m.trueOutcome?.valueDelivered === 'high' ? 0.3 : m.trueOutcome?.valueDelivered === 'medium' ? 0.15 : 0)
      );

      // Gaming: high proxy, low outcome
      if (proxyScore > 0.8 && outcomeScore < 0.4) {
        divergences.push(this.createDivergence(
          'PROXY_GAMING',
          `High proxy score (${proxyScore.toFixed(2)}) with low outcome (${outcomeScore.toFixed(2)})`,
          'aggregate',
          0.8,
          proxyScore
        ));
      }
    }

    return divergences;
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(measurements: OutcomeMeasurement[]): ProxyMetrics {
    const avg: ProxyMetrics = {
      taskCompletion: 0,
      responseQuality: 0,
      safetyScore: 0,
      helpfulnessScore: 0,
      efficiencyScore: 0,
      errorRate: 0,
      latencyMs: 0,
    };

    for (const m of measurements) {
      avg.taskCompletion += m.proxyMetrics.taskCompletion;
      avg.responseQuality += m.proxyMetrics.responseQuality;
      avg.safetyScore += m.proxyMetrics.safetyScore;
      avg.helpfulnessScore += m.proxyMetrics.helpfulnessScore;
      avg.efficiencyScore += m.proxyMetrics.efficiencyScore;
      avg.errorRate += m.proxyMetrics.errorRate;
      avg.latencyMs += m.proxyMetrics.latencyMs;
    }

    const n = measurements.length;
    avg.taskCompletion /= n;
    avg.responseQuality /= n;
    avg.safetyScore /= n;
    avg.helpfulnessScore /= n;
    avg.efficiencyScore /= n;
    avg.errorRate /= n;
    avg.latencyMs /= n;

    return avg;
  }

  /**
   * Calculate metrics divergence
   */
  private calculateMetricsDivergence(a: ProxyMetrics, b: ProxyMetrics): number {
    const diffs = [
      Math.abs(a.taskCompletion - b.taskCompletion),
      Math.abs(a.responseQuality - b.responseQuality),
      Math.abs(a.safetyScore - b.safetyScore),
      Math.abs(a.helpfulnessScore - b.helpfulnessScore),
    ];

    return diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  }

  /**
   * Detect test-specific patterns
   */
  private detectTestSpecificPatterns(
    measurements: OutcomeMeasurement[]
  ): { detected: boolean; confidence: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    // Check for patterns in test case IDs
    const testCases = measurements
      .filter((m) => m.testContext?.testCaseId)
      .map((m) => m.testContext!.testCaseId);

    const uniqueTestCases = new Set(testCases);
    if (uniqueTestCases.size < testCases.length * 0.5) {
      evidence.push('Low variety in test cases');
      score += 0.3;
    }

    // Check for synthetic data markers
    const syntheticCount = measurements.filter((m) => m.testContext?.isSynthetic).length;
    if (syntheticCount / measurements.length > 0.8) {
      evidence.push('High proportion of synthetic test data');
      score += 0.2;
    }

    return {
      detected: score > 0.4,
      confidence: score,
      evidence,
    };
  }

  /**
   * Detect synthetic response patterns
   */
  private detectSyntheticResponsePatterns(
    measurements: OutcomeMeasurement[]
  ): { detected: boolean; confidence: number; evidence: string[] } {
    // Simplified detection - in production would analyze response content
    const evidence: string[] = [];
    let score = 0;

    // Check for uniform response characteristics
    const qualities = measurements.map((m) => m.proxyMetrics.responseQuality);
    const variance = this.calculateVariance(qualities);

    if (variance < 0.05) {
      evidence.push('Unusually uniform response quality');
      score += 0.4;
    }

    return {
      detected: score > 0.3,
      confidence: score,
      evidence,
    };
  }

  /**
   * Calculate trend (slope) of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Calculate alignment score
   */
  private calculateAlignmentScore(
    correlation: number,
    divergenceCount: number,
    goodhartRisk: number
  ): number {
    let score = correlation * 100;
    score -= divergenceCount * 10;
    score -= goodhartRisk * 0.3;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create a divergence record
   */
  private createDivergence(
    type: DivergenceType,
    description: string,
    metric: string,
    expected: number,
    actual: number
  ): AlignmentDivergence {
    const diff = Math.abs(expected - actual);
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    if (diff > 0.5) severity = 'CRITICAL';
    else if (diff > 0.3) severity = 'HIGH';
    else if (diff > 0.2) severity = 'MEDIUM';

    return {
      id: this.generateDivergenceId(),
      type,
      severity,
      description,
      proxyMetric: metric,
      expected,
      actual,
      confidence: Math.min(diff * 2, 1),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record a divergence
   */
  private recordDivergence(divergence: AlignmentDivergence): void {
    this.divergences.push(divergence);

    if (this.divergences.length > 1000) {
      this.divergences = this.divergences.slice(-1000);
    }

    if (this.config.onDivergence) {
      this.config.onDivergence(divergence);
    }
  }

  /**
   * Generate measurement ID
   */
  private generateMeasurementId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `meas_${timestamp}_${random}`;
  }

  /**
   * Generate divergence ID
   */
  private generateDivergenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `div_${timestamp}_${random}`;
  }
}

// ============================================
// EXPORTS
// ============================================

export default RewardIntegrityVerifier;
