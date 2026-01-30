/**
 * MCP Security Gateway - CARS Risk Assessment Engine
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.3 - Implement CARS risk assessment engine
 * @task 3.5.2.6 - Integrate CARS with gateway
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Central risk assessment engine for the CARS framework.
 *   Integrates tool risk matrix, context factors, and research-based detectors:
 *   - DeceptiveComplianceDetector (Anthropic Dec 2024)
 *   - RewardHackingDetector (Anthropic Nov 2025)
 */

import {
  CARSRiskLevel,
  escalateRiskLevel,
  riskLevelToString,
  requiresApproval,
  shouldBlock,
  getAutonomyLevel,
  getRiskLevelDescription,
  type RiskLevelString,
} from './risk-levels';

import { getToolRisk, isKnownTool } from './risk-matrix';

import {
  type CARSContext,
  calculateContextRiskModifier,
  requiresAdditionalApproval,
} from './context';

import {
  DeceptiveComplianceDetector,
  type DeceptiveComplianceContext,
  type DeceptiveComplianceAssessment,
} from './deceptive-compliance-detector';

import {
  RewardHackingDetector,
  type RewardHackingContext,
  type RewardHackingAssessment,
} from './reward-hacking-detector';

// ============================================
// TYPES
// ============================================

/**
 * Tool call request for assessment
 */
export interface ToolCallRequest {
  /** Tool name */
  tool: string;

  /** Tool description */
  description?: string;

  /** Tool parameters */
  params: Record<string, unknown>;
}

/**
 * Complete risk assessment result
 */
export interface RiskAssessment {
  /** Final calculated risk level */
  riskLevel: CARSRiskLevel;

  /** String representation of risk level */
  riskLevelString: RiskLevelString;

  /** Human-readable reasoning */
  reasoning: string;

  /** Whether human approval is required */
  requiresApproval: boolean;

  /** Whether execution should be blocked */
  shouldBlock: boolean;

  /** Recommended autonomy level */
  autonomyLevel: 'full' | 'supervised' | 'assisted' | 'manual';

  /** List of factors that influenced the assessment */
  contextFactors: string[];

  /** Base risk from tool matrix */
  baseRisk: CARSRiskLevel;

  /** Total risk modifier applied */
  totalModifier: number;

  /** Deceptive compliance assessment (if applicable) */
  deceptiveComplianceAssessment?: DeceptiveComplianceAssessment;

  /** Reward hacking assessment (if applicable) */
  rewardHackingAssessment?: RewardHackingAssessment;

  /** Recommended safeguards */
  safeguards: Safeguard[];

  /** Assessment timestamp */
  timestamp: string;

  /** Assessment ID for audit trail */
  assessmentId: string;
}

/**
 * Safeguard recommendation
 */
export interface Safeguard {
  type: string;
  description: string;
  required: boolean;
  implemented: boolean;
}

/**
 * CARS Engine configuration
 */
export interface CARSEngineConfig {
  /** Enable deceptive compliance detection */
  enableDeceptiveComplianceDetection: boolean;

  /** Enable reward hacking detection */
  enableRewardHackingDetection: boolean;

  /** Default to CRITICAL for unknown tools */
  unknownToolsAreCritical: boolean;

  /** Production environment risk escalation */
  productionEscalation: number;

  /** Approval threshold (risk level at which approval is required) */
  approvalThreshold: CARSRiskLevel;

  /** Block threshold (risk level at which execution is blocked) */
  blockThreshold: CARSRiskLevel;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: CARSEngineConfig = {
  enableDeceptiveComplianceDetection: true,
  enableRewardHackingDetection: true,
  unknownToolsAreCritical: true,
  productionEscalation: 1.0,
  approvalThreshold: CARSRiskLevel.MEDIUM,
  blockThreshold: CARSRiskLevel.CRITICAL,
};

// ============================================
// CARS ENGINE CLASS
// ============================================

/**
 * CARS Risk Assessment Engine
 *
 * Provides comprehensive risk assessment for MCP tool calls by:
 * 1. Looking up base risk from tool matrix
 * 2. Applying context-based modifiers (environment, role)
 * 3. Running deceptive compliance detection (Anthropic Dec 2024)
 * 4. Running reward hacking detection (Anthropic Nov 2025)
 * 5. Generating safeguard recommendations
 *
 * @example
 * ```typescript
 * const engine = new CARSEngine();
 *
 * const assessment = await engine.assess(
 *   { tool: 'filesystem_write', params: { path: '/etc/config' } },
 *   { userId: 'user-123', projectId: 'proj-456', environment: 'production', userRole: 'developer' },
 *   { agentValidatesOwnWork: true, externalValidationPresent: false, ... },
 *   undefined,
 *   'const result = sys.exit(0);'
 * );
 *
 * if (assessment.shouldBlock) {
 *   console.log('Execution blocked:', assessment.reasoning);
 * }
 * ```
 */
export class CARSEngine {
  private config: CARSEngineConfig;
  private deceptiveComplianceDetector: DeceptiveComplianceDetector;
  private rewardHackingDetector: RewardHackingDetector;

  constructor(config: Partial<CARSEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deceptiveComplianceDetector = new DeceptiveComplianceDetector();
    this.rewardHackingDetector = new RewardHackingDetector();
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assess(
    request: ToolCallRequest,
    context?: CARSContext,
    deceptiveContext?: DeceptiveComplianceContext,
    rewardHackingContext?: RewardHackingContext,
    codeToAnalyze?: string
  ): Promise<RiskAssessment> {
    const contextFactors: string[] = [];
    let totalModifier = 0;

    // ========================================
    // 1. Get base risk from tool matrix
    // ========================================
    let riskLevel = getToolRisk(request.tool);
    const baseRisk = riskLevel;

    if (!isKnownTool(request.tool)) {
      contextFactors.push(`Unknown tool '${request.tool}' - defaulting to CRITICAL`);
    }

    // ========================================
    // 2. Apply context-based modifiers
    // ========================================
    if (context) {
      // Production environment escalation
      if (context.environment === 'production') {
        const escalation = this.config.productionEscalation;
        riskLevel = escalateRiskLevel(riskLevel, escalation);
        totalModifier += escalation;
        contextFactors.push(`Production environment (+${escalation} risk level)`);
      }

      // Staging environment
      if (context.environment === 'staging') {
        const escalation = 0.5;
        riskLevel = escalateRiskLevel(riskLevel, escalation);
        totalModifier += escalation;
        contextFactors.push(`Staging environment (+${escalation} risk level)`);
      }

      // Role-based modifiers
      const contextModifier = calculateContextRiskModifier(context);
      if (contextModifier !== 0) {
        riskLevel = escalateRiskLevel(riskLevel, contextModifier);
        totalModifier += contextModifier;
        contextFactors.push(
          `Role '${context.userRole}' modifier (+${contextModifier} risk level)`
        );
      }

      // Additional approval for production developers
      if (requiresAdditionalApproval(context)) {
        contextFactors.push('Additional approval required (context policy)');
      }
    }

    // ========================================
    // 3. Deceptive compliance detection
    // ========================================
    let deceptiveComplianceAssessment: DeceptiveComplianceAssessment | undefined;

    if (this.config.enableDeceptiveComplianceDetection && deceptiveContext) {
      deceptiveComplianceAssessment =
        this.deceptiveComplianceDetector.detect(deceptiveContext);

      if (deceptiveComplianceAssessment.riskModifier > 0) {
        riskLevel = escalateRiskLevel(
          riskLevel,
          deceptiveComplianceAssessment.riskModifier
        );
        totalModifier += deceptiveComplianceAssessment.riskModifier;

        const indicators = deceptiveComplianceAssessment.indicators
          .map(i => i.name)
          .join(', ');
        contextFactors.push(
          `Deceptive compliance indicators: ${indicators} (+${deceptiveComplianceAssessment.riskModifier} levels)`
        );
      }
    }

    // ========================================
    // 4. Reward hacking detection
    // ========================================
    let rewardHackingAssessment: RewardHackingAssessment | undefined;

    if (this.config.enableRewardHackingDetection && codeToAnalyze) {
      rewardHackingAssessment = this.rewardHackingDetector.analyzeCode(
        codeToAnalyze,
        rewardHackingContext
      );

      if (rewardHackingAssessment.riskModifier > 0) {
        riskLevel = escalateRiskLevel(
          riskLevel,
          rewardHackingAssessment.riskModifier
        );
        totalModifier += rewardHackingAssessment.riskModifier;

        const patterns = rewardHackingAssessment.patterns
          .map(p => p.pattern)
          .join(', ');
        contextFactors.push(
          `Reward hacking patterns: ${patterns} (+${rewardHackingAssessment.riskModifier} levels)`
        );
      }
    }

    // ========================================
    // 5. Generate safeguards
    // ========================================
    const safeguards = this.generateSafeguards(
      riskLevel,
      deceptiveComplianceAssessment,
      rewardHackingAssessment
    );

    // ========================================
    // 6. Build assessment result
    // ========================================
    const assessment: RiskAssessment = {
      riskLevel,
      riskLevelString: riskLevelToString(riskLevel),
      reasoning: this.generateReasoning(request.tool, riskLevel, contextFactors),
      requiresApproval:
        requiresApproval(riskLevel) ||
        riskLevel >= this.config.approvalThreshold,
      shouldBlock:
        shouldBlock(riskLevel) || riskLevel >= this.config.blockThreshold,
      autonomyLevel: getAutonomyLevel(riskLevel),
      contextFactors,
      baseRisk,
      totalModifier,
      deceptiveComplianceAssessment,
      rewardHackingAssessment,
      safeguards,
      timestamp: new Date().toISOString(),
      assessmentId: this.generateAssessmentId(),
    };

    return assessment;
  }

  /**
   * Quick assessment without research detectors
   */
  assessQuick(request: ToolCallRequest, context?: CARSContext): RiskAssessment {
    const contextFactors: string[] = [];
    let riskLevel = getToolRisk(request.tool);
    const baseRisk = riskLevel;
    let totalModifier = 0;

    if (context) {
      if (context.environment === 'production') {
        riskLevel = escalateRiskLevel(riskLevel, 1);
        totalModifier += 1;
        contextFactors.push('Production environment (+1 risk level)');
      }
    }

    return {
      riskLevel,
      riskLevelString: riskLevelToString(riskLevel),
      reasoning: this.generateReasoning(request.tool, riskLevel, contextFactors),
      requiresApproval: requiresApproval(riskLevel),
      shouldBlock: shouldBlock(riskLevel),
      autonomyLevel: getAutonomyLevel(riskLevel),
      contextFactors,
      baseRisk,
      totalModifier,
      safeguards: [],
      timestamp: new Date().toISOString(),
      assessmentId: this.generateAssessmentId(),
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    toolName: string,
    riskLevel: CARSRiskLevel,
    factors: string[]
  ): string {
    const levelDescription = getRiskLevelDescription(riskLevel);
    const base = `Tool '${toolName}' assessed at ${riskLevelToString(riskLevel).toUpperCase()} risk. ${levelDescription}`;

    if (factors.length === 0) {
      return base;
    }

    return `${base}\n\nFactors:\n${factors.map(f => `• ${f}`).join('\n')}`;
  }

  /**
   * Generate safeguard recommendations
   */
  private generateSafeguards(
    riskLevel: CARSRiskLevel,
    deceptiveAssessment?: DeceptiveComplianceAssessment,
    rewardHackingAssessment?: RewardHackingAssessment
  ): Safeguard[] {
    const safeguards: Safeguard[] = [];

    // Risk level based safeguards
    if (riskLevel >= CARSRiskLevel.MEDIUM) {
      safeguards.push({
        type: 'human_notification',
        description: 'Notify human operator of operation',
        required: true,
        implemented: false,
      });
    }

    if (riskLevel >= CARSRiskLevel.HIGH) {
      safeguards.push({
        type: 'human_approval',
        description: 'Require human approval before execution',
        required: true,
        implemented: false,
      });
    }

    if (riskLevel >= CARSRiskLevel.CRITICAL) {
      safeguards.push({
        type: 'manual_execution',
        description: 'Human must execute manually',
        required: true,
        implemented: false,
      });
    }

    // Deceptive compliance safeguards
    if (deceptiveAssessment && deceptiveAssessment.action !== 'PROCEED') {
      safeguards.push({
        type: 'external_validation',
        description: 'Require external validation of results',
        required: true,
        implemented: false,
      });

      if (deceptiveAssessment.action === 'ESCALATE' || deceptiveAssessment.action === 'BLOCK') {
        safeguards.push({
          type: 'full_audit',
          description: 'Full audit trail of agent reasoning',
          required: true,
          implemented: false,
        });
      }
    }

    // Reward hacking safeguards
    if (rewardHackingAssessment && rewardHackingAssessment.action !== 'NORMAL') {
      safeguards.push({
        type: 'test_isolation',
        description: 'Run tests in isolated environment',
        required: true,
        implemented: false,
      });

      if (rewardHackingAssessment.action === 'FULL_AUDIT') {
        safeguards.push({
          type: 'code_review',
          description: 'Mandatory human code review',
          required: true,
          implemented: false,
        });
      }
    }

    return safeguards;
  }

  /**
   * Generate unique assessment ID
   */
  private generateAssessmentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `cars_${timestamp}_${random}`;
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<CARSEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CARSEngineConfig {
    return { ...this.config };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/** Default engine instance */
let defaultEngine: CARSEngine | null = null;

/**
 * Get or create the default CARS engine
 */
export function getDefaultCARSEngine(): CARSEngine {
  if (!defaultEngine) {
    defaultEngine = new CARSEngine();
  }
  return defaultEngine;
}

/**
 * Create a new CARS engine with custom config
 */
export function createCARSEngine(config?: Partial<CARSEngineConfig>): CARSEngine {
  return new CARSEngine(config);
}

/**
 * Quick risk assessment using default engine
 */
export async function assessRisk(
  request: ToolCallRequest,
  context?: CARSContext,
  deceptiveContext?: DeceptiveComplianceContext,
  rewardHackingContext?: RewardHackingContext,
  codeToAnalyze?: string
): Promise<RiskAssessment> {
  return getDefaultCARSEngine().assess(
    request,
    context,
    deceptiveContext,
    rewardHackingContext,
    codeToAnalyze
  );
}

// ============================================
// EXPORTS
// ============================================

export default CARSEngine;
