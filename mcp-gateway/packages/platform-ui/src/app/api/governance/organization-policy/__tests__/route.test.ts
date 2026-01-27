/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { organizationStore } from '@/lib/governance/organization';

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/governance/organization-policy'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/governance/organization-policy', () => {
  beforeEach(() => {
    organizationStore.reset();
  });

  describe('GET', () => {
    it('returns default organization policy', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('default-org-policy');
      expect(data.name).toBeDefined();
      expect(data.status).toBe('active');
      expect(data.maxDataTier).toBeDefined();
      expect(data.requireApprovalForProduction).toBe(true);
      expect(data.requireEvidencePackForRelease).toBe(true);
      expect(data.auditRetentionDays).toBeDefined();
      expect(Array.isArray(data.frameworks)).toBe(true);
    });
  });

  describe('POST', () => {
    it('updates organization policy', async () => {
      const request = createRequest({
        updatedBy: 'admin-user',
        maxDataTier: 2,
        requireApprovalForProduction: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.maxDataTier).toBe(2);
      expect(data.requireApprovalForProduction).toBe(false);
      expect(data.updatedBy).toBe('admin-user');
    });

    it('returns 400 when updatedBy is missing', async () => {
      const request = createRequest({
        maxDataTier: 2,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('updates frameworks', async () => {
      const request = createRequest({
        updatedBy: 'admin-user',
        frameworks: ['SOC2', 'HIPAA', 'GDPR'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.frameworks).toEqual(['SOC2', 'HIPAA', 'GDPR']);
    });
  });
});
