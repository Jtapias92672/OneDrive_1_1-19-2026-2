/**
 * @jest-environment node
 */

import { GET } from '../route';

describe('GET /api/accuracy/frontier', () => {
  it('returns all frontier zones', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.zones).toBeDefined();
    expect(data.zones.length).toBe(12);
    expect(data.stats).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it('includes zone stats', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.stats.totalZones).toBe(12);
    expect(data.stats.greenZones).toBeGreaterThan(0);
    expect(data.stats.overallSuccessRate).toBeGreaterThan(0);
  });

  it('zones have required properties', async () => {
    const response = await GET();
    const data = await response.json();

    for (const zone of data.zones) {
      expect(zone.taskType).toBeDefined();
      expect(zone.successRate).toBeDefined();
      expect(zone.status).toBeDefined();
      expect(zone.recommendedWorkflow).toBeDefined();
    }
  });
});
