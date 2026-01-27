/**
 * Governance Gateway
 * Unified entry point for governance decisions
 * Integrates Policy Engine + CARS Assessment + Approval Workflow
 */

import { PolicyEngine, policyEngine } from '../policy/policy-engine';
import { PolicyEvaluation } from '../types';
import { CARSAssessor, carsAssessor } from '../cars/cars-assessor';
import { CARSContext, CARSAction, CARSAssessment } from '../cars/types';
import { ApprovalService, approvalService } from '../approval/approval-service';
import { ApprovalRequest, ApprovalArtifact } from '../approval/types';

export interface GovernanceDecision {
  allowed: boolean;
  requiresApproval: boolean;
  approvalRequest?: ApprovalRequest;
  carsAssessment: CARSAssessment;
  policyEvaluation: PolicyEvaluation;
  reason?: string;
}

export interface GovernanceEvaluationInput {
  context: CARSContext;
  action: CARSAction;
  artifacts?: ApprovalArtifact[];
  workflowId?: string;
}

export class GovernanceGateway {
  constructor(
    private policyEngineInstance: PolicyEngine = policyEngine,
    private carsAssessorInstance: CARSAssessor = carsAssessor,
    private approvalServiceInstance: ApprovalService = approvalService
  ) {}

  /**
   * Evaluate governance for an operation
   * Returns a decision indicating whether operation can proceed
   */
  async evaluate(input: GovernanceEvaluationInput): Promise<GovernanceDecision> {
    const { context, action, artifacts = [], workflowId } = input;

    // 1. Run CARS assessment
    const carsAssessment = this.carsAssessorInstance.assess(context, action);

    // 2. Evaluate policies with CARS result
    const policyContext = {
      ...context,
      riskLevel: carsAssessment.risk.level,
      riskScore: carsAssessment.risk.score,
      actionType: action.type,
      actionTarget: action.target,
      reversible: action.reversible,
    };
    const policyResult = await this.policyEngineInstance.evaluate(policyContext);

    // 3. Determine if blocked by policy
    if (!policyResult.allowed) {
      return {
        allowed: false,
        requiresApproval: false,
        carsAssessment,
        policyEvaluation: policyResult,
        reason: policyResult.reason,
      };
    }

    // 4. Check if approval is required
    const needsApproval =
      policyResult.requiresApproval || carsAssessment.safeguards.approvalRequired;

    if (!needsApproval) {
      return {
        allowed: true,
        requiresApproval: false,
        carsAssessment,
        policyEvaluation: policyResult,
      };
    }

    // 5. Create approval request
    const approvalRequest = await this.approvalServiceInstance.createRequest({
      carsAssessment,
      summary: `${action.type} on ${action.target}`,
      details: `Risk level: ${carsAssessment.risk.level}, Score: ${carsAssessment.risk.score}`,
      artifacts,
      workflowId,
    });

    return {
      allowed: false, // Not allowed until approval
      requiresApproval: true,
      approvalRequest,
      carsAssessment,
      policyEvaluation: policyResult,
    };
  }

  /**
   * Check if an operation can proceed (for pending approvals)
   */
  async checkApprovalStatus(
    approvalRequestId: string
  ): Promise<{ canProceed: boolean; status: string; reason?: string }> {
    const request = await this.approvalServiceInstance.getById(approvalRequestId);

    if (!request) {
      return {
        canProceed: false,
        status: 'not_found',
        reason: 'Approval request not found',
      };
    }

    switch (request.status) {
      case 'approved':
        return { canProceed: true, status: 'approved' };
      case 'rejected':
        return {
          canProceed: false,
          status: 'rejected',
          reason: request.decisions.find((d) => d.decision === 'rejected')?.comments,
        };
      case 'expired':
        return {
          canProceed: false,
          status: 'expired',
          reason: 'Approval request has expired',
        };
      case 'pending':
        return {
          canProceed: false,
          status: 'pending',
          reason: `Waiting for ${request.requiredApprovals - request.receivedApprovals} more approval(s)`,
        };
      default:
        return {
          canProceed: false,
          status: 'unknown',
          reason: 'Unknown status',
        };
    }
  }

  /**
   * Record operation result for future risk calculations
   */
  recordOperationResult(userId: string, success: boolean): void {
    this.carsAssessorInstance.recordOperationResult(userId, success);
  }
}

export const governanceGateway = new GovernanceGateway();
