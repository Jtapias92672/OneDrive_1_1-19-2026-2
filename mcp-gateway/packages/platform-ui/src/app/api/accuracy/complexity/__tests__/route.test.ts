/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/accuracy/complexity'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/accuracy/complexity', () => {
  it('analyzes simple task', async () => {
    const request = createRequest({
      description: 'Fix a typo',
      fileCount: 1,
      linesChanged: 1,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toBeDefined();
    expect(data.level).toBeDefined();
    expect(data.factors).toBeDefined();
    expect(data.recommendedWorkflow).toBeDefined();
  });

  it('returns all 5 factors', async () => {
    const request = createRequest({
      description: 'Test task',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.factors.codeSize).toBeDefined();
    expect(data.factors.dependencies).toBeDefined();
    expect(data.factors.contextRequired).toBeDefined();
    expect(data.factors.novelty).toBeDefined();
    expect(data.factors.riskLevel).toBeDefined();
  });

  it('returns higher complexity for complex task', async () => {
    const simpleReq = createRequest({
      description: 'Simple fix',
      fileCount: 1,
    });

    const complexReq = createRequest({
      description: 'Major database refactor with security implications',
      fileCount: 50,
      linesChanged: 2000,
      dependencyCount: 25,
      isNewFeature: true,
      hasSecurityImplications: true,
      affectsPublicApi: true,
    });

    const simpleRes = await POST(simpleReq);
    const complexRes = await POST(complexReq);

    const simpleData = await simpleRes.json();
    const complexData = await complexRes.json();

    expect(complexData.score).toBeGreaterThan(simpleData.score);
  });

  it('generates warnings for risky tasks', async () => {
    const request = createRequest({
      description: 'Security update',
      hasSecurityImplications: true,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.warnings.length).toBeGreaterThan(0);
  });

  it('returns 400 for missing description', async () => {
    const request = createRequest({});
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for description exceeding max length', async () => {
    const request = createRequest({
      description: 'x'.repeat(10001),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/accuracy/complexity', () => {
  it('returns endpoint documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/accuracy/complexity');
    expect(data.factors.length).toBe(5);
    expect(data.requiredFields).toContain('description');
  });
});
