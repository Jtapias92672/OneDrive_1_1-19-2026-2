/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { policyStore } from '@/lib/governance/policy';

function createRequest(body?: unknown, params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/governance/policies');
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

describe('GET /api/governance/policies', () => {
  beforeEach(() => {
    policyStore.reset();
  });

  it('returns all policies including defaults', async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('returns only enabled policies when enabled=true', async () => {
    // Create a disabled policy
    await policyStore.create({
      name: 'Disabled',
      enabled: false,
      conditions: [],
      actions: [],
    });

    const response = await GET(createRequest(undefined, { enabled: 'true' }));
    const data = await response.json();

    expect(data.every((p: { enabled: boolean }) => p.enabled)).toBe(true);
  });
});

describe('POST /api/governance/policies', () => {
  beforeEach(() => {
    policyStore.reset();
  });

  it('creates a new policy', async () => {
    const request = createRequest({
      name: 'Test Policy',
      conditions: [{ field: 'test', operator: 'eq', value: true }],
      actions: [{ type: 'log' }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Policy');
  });

  it('returns 400 when name is missing', async () => {
    const request = createRequest({
      conditions: [],
      actions: [],
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when conditions is missing', async () => {
    const request = createRequest({
      name: 'Test',
      actions: [],
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when actions is missing', async () => {
    const request = createRequest({
      name: 'Test',
      conditions: [],
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid condition structure', async () => {
    const request = createRequest({
      name: 'Test',
      conditions: [{ field: 'test' }], // Missing operator and value
      actions: [],
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid action structure', async () => {
    const request = createRequest({
      name: 'Test',
      conditions: [],
      actions: [{}], // Missing type
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
