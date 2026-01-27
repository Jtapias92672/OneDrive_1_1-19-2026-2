/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { approvalService } from '@/lib/governance/approval';
import { carsAssessor } from '@/lib/governance/cars';

function createRequest(body?: unknown, params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/governance/approvals');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('/api/governance/approvals', () => {
  beforeEach(() => {
    approvalService.reset();
    carsAssessor.clearUserHistory();
  });

  describe('GET', () => {
    it('returns empty list initially', async () => {
      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('returns created approvals', async () => {
      // Create an approval
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

      await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Test approval',
      });

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.length).toBe(1);
      expect(data[0].summary).toBe('Test approval');
    });

    it('filters by status', async () => {
      const assessment = carsAssessor.assess(
        {
          environment: 'production',
          dataClassification: 3,
          scope: 'single-file',
          userId: 'user-123',
          workflowType: 'test',
        },
        {
          type: 'test',
          target: 'test',
          reversible: true,
          estimatedImpact: 'high',
        }
      );

      const req = await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Test',
      });
      await approvalService.submitDecision(req.id, 'approver', 'approved');

      const pendingResponse = await GET(createRequest(undefined, { status: 'pending' }));
      const approvedResponse = await GET(createRequest(undefined, { status: 'approved' }));

      expect((await pendingResponse.json()).length).toBe(0);
      expect((await approvedResponse.json()).length).toBe(1);
    });
  });

  describe('POST', () => {
    it('creates approval request', async () => {
      const request = createRequest({
        context: {
          environment: 'production',
          dataClassification: 3,
          scope: 'multiple-files',
          userId: 'user-123',
          workflowType: 'deployment',
        },
        action: {
          type: 'deployment',
          target: 'api-server',
          reversible: false,
          estimatedImpact: 'high',
        },
        summary: 'Deploy to production',
        details: 'Deploying new API version',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toMatch(/^apr-/);
      expect(data.status).toBe('pending');
      expect(data.summary).toBe('Deploy to production');
      expect(data.carsAssessment).toBeDefined();
    });

    it('returns 400 when context is missing', async () => {
      const request = createRequest({
        action: { type: 'test', target: 'test', reversible: true, estimatedImpact: 'low' },
        summary: 'Test',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when summary is missing', async () => {
      const request = createRequest({
        context: {
          environment: 'development',
          dataClassification: 1,
          scope: 'single-file',
          userId: 'user-123',
          workflowType: 'test',
        },
        action: { type: 'test', target: 'test', reversible: true, estimatedImpact: 'low' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
