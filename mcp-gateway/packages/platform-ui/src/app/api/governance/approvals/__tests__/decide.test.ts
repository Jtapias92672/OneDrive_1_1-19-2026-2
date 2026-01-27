/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../[id]/decide/route';
import { GET } from '../[id]/route';
import { approvalService } from '@/lib/governance/approval';
import { carsAssessor } from '@/lib/governance/cars';

function createDecideRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/governance/approvals/test/decide'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createGetRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/governance/approvals/test'), {
    method: 'GET',
  });
}

async function createTestApproval(): Promise<string> {
  const assessment = carsAssessor.assess(
    {
      environment: 'production',
      dataClassification: 3,
      scope: 'multiple-files',
      userId: 'user-123',
      workflowType: 'test',
    },
    {
      type: 'deployment',
      target: 'test',
      reversible: false,
      estimatedImpact: 'high',
    }
  );

  const request = await approvalService.createRequest({
    carsAssessment: assessment,
    summary: 'Test approval',
  });

  return request.id;
}

describe('/api/governance/approvals/[id]/decide', () => {
  beforeEach(() => {
    approvalService.reset();
    carsAssessor.clearUserHistory();
  });

  describe('POST /api/governance/approvals/:id/decide', () => {
    it('submits approval decision', async () => {
      const approvalId = await createTestApproval();

      const request = createDecideRequest({
        approverId: 'approver-1',
        approverName: 'John Doe',
        decision: 'approved',
        comments: 'Looks good to me',
      });

      const response = await POST(request, { params: Promise.resolve({ id: approvalId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('approved');
      expect(data.decisions).toHaveLength(1);
      expect(data.decisions[0].approverId).toBe('approver-1');
    });

    it('submits rejection decision', async () => {
      const approvalId = await createTestApproval();

      const request = createDecideRequest({
        approverId: 'approver-1',
        decision: 'rejected',
        comments: 'Needs more testing',
      });

      const response = await POST(request, { params: Promise.resolve({ id: approvalId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('rejected');
    });

    it('returns 400 when approverId is missing', async () => {
      const approvalId = await createTestApproval();

      const request = createDecideRequest({
        decision: 'approved',
      });

      const response = await POST(request, { params: Promise.resolve({ id: approvalId }) });
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid decision', async () => {
      const approvalId = await createTestApproval();

      const request = createDecideRequest({
        approverId: 'approver-1',
        decision: 'maybe',
      });

      const response = await POST(request, { params: Promise.resolve({ id: approvalId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent approval', async () => {
      const request = createDecideRequest({
        approverId: 'approver-1',
        decision: 'approved',
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'fake-id' }) });
      expect(response.status).toBe(404);
    });

    it('returns 409 when approver already decided', async () => {
      const approvalId = await createTestApproval();

      // First decision
      await approvalService.submitDecision(approvalId, 'approver-1', 'approved');

      // Make a new request - the request is now approved, so this should fail
      // We need to use a critical-risk approval that requires 2 approvals
      approvalService.reset();
      const assessment = carsAssessor.assess(
        {
          environment: 'production',
          dataClassification: 4,
          scope: 'system-wide',
          userId: 'user-123',
          workflowType: 'test',
        },
        {
          type: 'deployment',
          target: 'test',
          reversible: false,
          estimatedImpact: 'high',
        }
      );
      const criticalRequest = await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Critical test',
      });

      // First decision
      await approvalService.submitDecision(criticalRequest.id, 'approver-1', 'approved');

      // Try duplicate
      const request = createDecideRequest({
        approverId: 'approver-1',
        decision: 'approved',
      });

      const response = await POST(request, { params: Promise.resolve({ id: criticalRequest.id }) });
      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/governance/approvals/:id', () => {
    it('returns approval details', async () => {
      const approvalId = await createTestApproval();

      const response = await GET(createGetRequest(), { params: Promise.resolve({ id: approvalId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(approvalId);
      expect(data.status).toBe('pending');
      expect(data.carsAssessment).toBeDefined();
    });

    it('returns 404 for non-existent approval', async () => {
      const response = await GET(createGetRequest(), { params: Promise.resolve({ id: 'fake-id' }) });
      expect(response.status).toBe(404);
    });
  });
});
