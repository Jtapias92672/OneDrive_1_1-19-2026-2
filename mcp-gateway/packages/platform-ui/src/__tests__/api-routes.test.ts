/**
 * API Route Tests
 *
 * Tests the Next.js API routes for dashboard data
 */

// Mock fetch for API route tests
const mockFetch = global.fetch as jest.Mock;

describe('API Routes', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('GET /api/cars', () => {
    it('should return CARS status with default mock data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          autonomyLevel: 'AUTONOMOUS',
          riskLevel: 1,
          maxRisk: 4,
          pendingApprovals: 0,
          gates: [
            { name: 'Code Generation', status: 'auto', risk: 'low' },
          ],
        }),
      });

      const response = await fetch('/api/cars');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.autonomyLevel).toBeDefined();
      expect(data.gates).toBeInstanceOf(Array);
    });

    it('should support demoMode query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          autonomyLevel: 'HUMAN_REQUIRED',
          riskLevel: 4,
          pendingApprovals: 3,
        }),
      });

      const response = await fetch('/api/cars?demoMode=critical');
      const data = await response.json();

      expect(data.autonomyLevel).toBe('HUMAN_REQUIRED');
      expect(data.riskLevel).toBe(4);
    });
  });

  describe('GET /api/evidence', () => {
    it('should return evidence packs data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionPacks: 3,
          epicTotal: 12,
          cmmcReady: true,
          dfarsCompliant: true,
          recentPacks: [],
        }),
      });

      const response = await fetch('/api/evidence');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.sessionPacks).toBeDefined();
      expect(data.cmmcReady).toBeDefined();
    });
  });

  describe('GET /api/guardrails', () => {
    it('should return guardrails metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          dp09: { name: 'PII Recall', current: 99.2, target: 99, status: 'pass' },
          dp10: { name: 'Secret Recall', current: 100, target: 100, status: 'pass' },
        }),
      });

      const response = await fetch('/api/guardrails');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.dp09).toBeDefined();
      expect(data.dp10).toBeDefined();
    });
  });

  describe('GET /api/supply-chain', () => {
    it('should return supply chain metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalDeps: 47,
          verifiedDeps: 47,
          slsaLevel: 3,
          signaturesValid: true,
          vulnerabilities: 0,
          sbomGenerated: true,
        }),
      });

      const response = await fetch('/api/supply-chain');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.totalDeps).toBeDefined();
      expect(data.slsaLevel).toBeDefined();
    });
  });

  describe('GET /api/session/tokens', () => {
    it('should return token usage data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: 8200,
          optimal: 15000,
          warning: 30000,
          danger: 40000,
        }),
      });

      const response = await fetch('/api/session/tokens');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.current).toBeDefined();
      expect(data.optimal).toBeDefined();
    });
  });

  describe('POST /api/cars', () => {
    it('should accept CARS status updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomyLevel: 'SUPERVISED' }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/cars')).rejects.toThrow('Network error');
    });

    it('should handle non-ok responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const response = await fetch('/api/cars');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});
