import { NextResponse } from 'next/server';
import { approvalService } from '@/lib/governance/approval';
import { auditLogger } from '@/lib/governance/audit';
import { workflowEngine } from '@/lib/governance/workflow';
import { RiskLevel } from '@/lib/governance/cars/types';

interface ComplianceIssue {
  severity: 'warning' | 'error';
  message: string;
  action?: string;
}

interface GovernanceStatus {
  policyCompliant: boolean;
  complianceScore: number;
  maxApprovedDataTier: 1 | 2 | 3 | 4;
  currentDataTier: number;
  evidencePackCount: number;
  pendingReviewCount: number;
  activeWorkflowCount: number;
  auditEventsLast7Days: number;
  lastAuditExport?: string;
  currentRiskLevel: RiskLevel;
  openHighRiskItems: number;
  lastAssessment: string;
  nextScheduledReview?: string;
  issues: ComplianceIssue[];
}

/**
 * GET /api/governance/status
 * Aggregate compliance status for P2 dashboard
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get pending approvals
    const pendingApprovals = await approvalService.getPending();
    const pendingReviewCount = pendingApprovals.length;

    // Get approval stats
    const approvalStats = await approvalService.getStats();

    // Get audit stats
    const auditStats = await auditLogger.getStats();

    // Get workflows
    const workflows = await workflowEngine.list();
    const activeWorkflowCount = workflows.filter(
      (w) => w.status === 'running' || w.status === 'awaiting-approval'
    ).length;

    // Calculate compliance score
    // Base score of 100, subtract for issues
    let complianceScore = 100;
    const issues: ComplianceIssue[] = [];

    // Deduct for pending high-risk approvals
    const highRiskPending = pendingApprovals.filter(
      (a) => a.riskLevel === 'high' || a.riskLevel === 'critical'
    );
    if (highRiskPending.length > 0) {
      complianceScore -= highRiskPending.length * 10;
      issues.push({
        severity: 'warning',
        message: `${highRiskPending.length} high-risk approval(s) pending`,
        action: 'Review pending approvals',
      });
    }

    // Deduct for expired approvals
    if (approvalStats.expired > 0) {
      complianceScore -= approvalStats.expired * 5;
      issues.push({
        severity: 'error',
        message: `${approvalStats.expired} approval(s) expired`,
        action: 'Review expired approvals',
      });
    }

    // Deduct for failed workflows
    const failedWorkflows = workflows.filter((w) => w.status === 'failed');
    if (failedWorkflows.length > 0) {
      complianceScore -= failedWorkflows.length * 5;
      issues.push({
        severity: 'warning',
        message: `${failedWorkflows.length} workflow(s) failed`,
        action: 'Review failed workflows',
      });
    }

    // Clamp score to 0-100
    complianceScore = Math.max(0, Math.min(100, complianceScore));

    // Determine current risk level based on pending items
    let currentRiskLevel: RiskLevel = 'low';
    if (highRiskPending.some((a) => a.riskLevel === 'critical')) {
      currentRiskLevel = 'critical';
    } else if (highRiskPending.some((a) => a.riskLevel === 'high')) {
      currentRiskLevel = 'high';
    } else if (pendingApprovals.length > 0) {
      currentRiskLevel = 'medium';
    }

    // Count open high-risk items
    const openHighRiskItems = highRiskPending.length;

    // Evidence pack count (placeholder - would be from evidence service)
    const evidencePackCount = workflows.filter((w) => w.status === 'completed').length;

    // Calculate audit events in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = await auditLogger.query({ startDate: sevenDaysAgo });
    const auditEventsLast7Days = recentEvents.length;

    const status: GovernanceStatus = {
      policyCompliant: complianceScore >= 80,
      complianceScore,
      maxApprovedDataTier: 3, // Organization policy setting
      currentDataTier: 2, // Based on current workflows
      evidencePackCount,
      pendingReviewCount,
      activeWorkflowCount,
      auditEventsLast7Days,
      currentRiskLevel,
      openHighRiskItems,
      lastAssessment: new Date().toISOString(),
      issues,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('[Governance] Failed to get status:', error);
    return NextResponse.json(
      { error: 'Failed to get governance status' },
      { status: 500 }
    );
  }
}
