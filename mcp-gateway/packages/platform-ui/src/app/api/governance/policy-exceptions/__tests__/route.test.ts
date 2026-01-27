/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { organizationStore } from '@/lib/governance/organization';

function createRequest(body?: unknown, params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/governance/policy-exceptions');
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

describe('/api/governance/policy-exceptions', () => {
  beforeEach(() => {
    organizationStore.reset();
  });

  describe('GET', () => {
    it('returns empty list initially', async () => {
      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('returns created exceptions', async () => {
      await organizationStore.createException({
        policyId: 'policy-1',
        requesterId: 'user-1',
        reason: 'Testing',
        scope: 'Test scope',
        durationDays: 7,
      });

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data).toHaveLength(1);
      expect(data[0].reason).toBe('Testing');
    });

    it('filters by status', async () => {
      const exc = await organizationStore.createException({
        policyId: 'policy-1',
        requesterId: 'user-1',
        reason: 'Test',
        scope: 'Scope',
        durationDays: 7,
      });

      await organizationStore.reviewException(exc.id, 'reviewer', true);

      const pendingResponse = await GET(createRequest(undefined, { status: 'pending' }));
      const approvedResponse = await GET(createRequest(undefined, { status: 'approved' }));

      expect((await pendingResponse.json())).toHaveLength(0);
      expect((await approvedResponse.json())).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('creates policy exception request', async () => {
      const request = createRequest({
        policyId: 'default-org-policy',
        requesterId: 'user-123',
        requesterName: 'John Doe',
        reason: 'Need to process tier 4 data for audit',
        scope: 'Audit workflow only',
        durationDays: 30,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toMatch(/^exc-/);
      expect(data.status).toBe('pending');
      expect(data.reason).toBe('Need to process tier 4 data for audit');
      expect(data.expiresAt).toBeDefined();
    });

    it('returns 400 when policyId is missing', async () => {
      const request = createRequest({
        requesterId: 'user-123',
        reason: 'Test',
        scope: 'Test',
        durationDays: 7,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when durationDays is invalid', async () => {
      const request = createRequest({
        policyId: 'policy-1',
        requesterId: 'user-123',
        reason: 'Test',
        scope: 'Test',
        durationDays: 0,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
