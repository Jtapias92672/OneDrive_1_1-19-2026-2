/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../stats/route';
import { approvalService } from '@/lib/governance/approval';
import { carsAssessor } from '@/lib/governance/cars';

describe('GET /api/governance/approvals/stats', () => {
  beforeEach(() => {
    approvalService.reset();
    carsAssessor.clearUserHistory();
  });

  it('returns empty stats initially', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pending).toBe(0);
    expect(data.approved).toBe(0);
    expect(data.rejected).toBe(0);
    expect(data.expired).toBe(0);
    expect(data.averageDecisionTime).toBe(0);
  });

  it('returns correct counts', async () => {
    const assessment = carsAssessor.assess(
      {
        environment: 'production',
        dataClassification: 3,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'test',
      },
      {
        type: 'deployment',
        target: 'test',
        reversible: true,
        estimatedImpact: 'high',
      }
    );

    // Create approved
    const req1 = await approvalService.createRequest({
      carsAssessment: assessment,
      summary: 'Approved',
    });
    await approvalService.submitDecision(req1.id, 'approver', 'approved');

    // Create rejected
    const req2 = await approvalService.createRequest({
      carsAssessment: assessment,
      summary: 'Rejected',
    });
    await approvalService.submitDecision(req2.id, 'approver', 'rejected');

    // Create pending
    await approvalService.createRequest({
      carsAssessment: assessment,
      summary: 'Pending',
    });

    const response = await GET();
    const data = await response.json();

    expect(data.pending).toBe(1);
    expect(data.approved).toBe(1);
    expect(data.rejected).toBe(1);
    expect(data.expired).toBe(0);
    expect(data.averageDecisionTime).toBeGreaterThanOrEqual(0);
  });
});
