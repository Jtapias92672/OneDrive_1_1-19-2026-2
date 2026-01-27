/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../assess/route';
import { carsAssessor } from '@/lib/governance/cars';

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/governance/cars/assess'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/governance/cars/assess', () => {
  beforeEach(() => {
    carsAssessor.clearUserHistory();
  });

  it('performs CARS assessment successfully', async () => {
    const request = createRequest({
      context: {
        environment: 'development',
        dataClassification: 1,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'figma-to-code',
      },
      action: {
        type: 'code-generation',
        target: 'src/components/Button',
        reversible: true,
        estimatedImpact: 'low',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toMatch(/^cars-/);
    expect(data.risk.level).toBe('low');
    expect(data.risk.score).toBeLessThanOrEqual(25);
    expect(data.risk.factors).toHaveLength(6);
    expect(data.safeguards).toBeDefined();
  });

  it('returns high risk for production environment', async () => {
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
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.risk.level).toBe('high');
    expect(data.safeguards.approvalRequired).toBe(true);
  });

  it('returns 400 for missing context', async () => {
    const request = createRequest({
      action: {
        type: 'test',
        target: 'test',
        reversible: true,
        estimatedImpact: 'low',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid environment', async () => {
    const request = createRequest({
      context: {
        environment: 'invalid',
        dataClassification: 1,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'test',
      },
      action: {
        type: 'test',
        target: 'test',
        reversible: true,
        estimatedImpact: 'low',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid dataClassification', async () => {
    const request = createRequest({
      context: {
        environment: 'development',
        dataClassification: 5,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'test',
      },
      action: {
        type: 'test',
        target: 'test',
        reversible: true,
        estimatedImpact: 'low',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing action', async () => {
    const request = createRequest({
      context: {
        environment: 'development',
        dataClassification: 1,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'test',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid estimatedImpact', async () => {
    const request = createRequest({
      context: {
        environment: 'development',
        dataClassification: 1,
        scope: 'single-file',
        userId: 'user-123',
        workflowType: 'test',
      },
      action: {
        type: 'test',
        target: 'test',
        reversible: true,
        estimatedImpact: 'extreme',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
