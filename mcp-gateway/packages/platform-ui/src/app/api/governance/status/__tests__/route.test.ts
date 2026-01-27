/**
 * @jest-environment node
 */

import { GET } from '../route';
import { approvalService } from '@/lib/governance/approval';
import { auditLogger } from '@/lib/governance/audit';
import { workflowEngine } from '@/lib/governance/workflow';
import { policyStore } from '@/lib/governance/policy/policy-store';
import { carsAssessor } from '@/lib/governance/cars';

describe('GET /api/governance/status', () => {
  beforeEach(() => {
    approvalService.reset();
    auditLogger.reset();
    workflowEngine.reset();
    policyStore.reset();
    carsAssessor.clearUserHistory();
  });

  it('returns governance status with all fields', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.policyCompliant).toBeDefined();
    expect(data.complianceScore).toBeGreaterThanOrEqual(0);
    expect(data.complianceScore).toBeLessThanOrEqual(100);
    expect(data.maxApprovedDataTier).toBeDefined();
    expect(data.currentDataTier).toBeDefined();
    expect(data.evidencePackCount).toBeDefined();
    expect(data.pendingReviewCount).toBeDefined();
    expect(data.activeWorkflowCount).toBeDefined();
    expect(data.auditEventsLast7Days).toBeDefined();
    expect(data.currentRiskLevel).toBeDefined();
    expect(data.openHighRiskItems).toBeDefined();
    expect(data.lastAssessment).toBeDefined();
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it('returns full compliance score when no issues', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.policyCompliant).toBe(true);
    expect(data.complianceScore).toBe(100);
    expect(data.issues).toHaveLength(0);
  });

  it('tracks pending approvals count', async () => {
    // Create a workflow that needs approval
    await workflowEngine.start(
      'figma-to-code',
      { environment: 'production', dataClassification: 2 },
      'user-123'
    );

    const response = await GET();
    const data = await response.json();

    expect(data.pendingReviewCount).toBe(1);
  });

  it('tracks active workflow count', async () => {
    // Create a low-risk workflow that runs immediately
    await workflowEngine.start(
      'figma-to-code',
      { environment: 'development' },
      'user-123'
    );

    const response = await GET();
    const data = await response.json();

    // Should have evidence packs from completed workflow
    expect(data.evidencePackCount).toBe(1);
  });
});
