/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../evaluate/route';
import { policyStore } from '@/lib/governance/policy';

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/governance/policies/evaluate'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/governance/policies/evaluate', () => {
  beforeEach(() => {
    policyStore.reset();
  });

  it('evaluates context against policies', async () => {
    const request = createRequest({
      context: {
        riskLevel: 'low',
        environment: 'development',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation).toBeDefined();
    expect(data.evaluation.allowed).toBeDefined();
    expect(data.evaluation.requiresApproval).toBeDefined();
    expect(data.evaluation.matchedPolicies).toBeDefined();
    expect(data.auditEventId).toBeDefined();
  });

  it('blocks high-risk operations by default', async () => {
    const request = createRequest({
      context: {
        riskLevel: 'critical',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.requiresApproval).toBe(true);
  });

  it('blocks tier 4 data by default', async () => {
    const request = createRequest({
      context: {
        dataClassification: 4,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.allowed).toBe(false);
  });

  it('requires approval for production environment', async () => {
    const request = createRequest({
      context: {
        environment: 'production',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.requiresApproval).toBe(true);
  });

  it('blocks when token budget exceeded', async () => {
    const request = createRequest({
      context: {
        tokenUsagePercent: 150,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.allowed).toBe(false);
    expect(data.evaluation.reason).toBe('Token budget exceeded');
  });

  it('returns 400 when context is missing', async () => {
    const request = createRequest({});

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when context is not an object', async () => {
    const request = createRequest({
      context: 'invalid',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('evaluates custom policies', async () => {
    await policyStore.create({
      name: 'Custom Block',
      priority: 200, // High priority
      conditions: [{ field: 'customField', operator: 'eq', value: 'blocked' }],
      actions: [{ type: 'block', params: { reason: 'Custom block reason' } }],
    });

    const request = createRequest({
      context: {
        customField: 'blocked',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.evaluation.allowed).toBe(false);
    expect(data.evaluation.reason).toBe('Custom block reason');
  });
});
