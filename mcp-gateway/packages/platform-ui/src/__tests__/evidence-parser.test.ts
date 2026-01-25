/**
 * Evidence Parser Tests
 */

import { getMockEvidencePacksSummary } from '../lib/parsers/evidence-parser';

describe('Evidence Parser', () => {
  describe('getMockEvidencePacksSummary', () => {
    it('should return evidence summary for normal mode', () => {
      const result = getMockEvidencePacksSummary('normal');
      expect(result).toBeDefined();
      expect(result.sessionPacks).toBe(3);
      expect(result.epicTotal).toBe(12);
      expect(result.cmmcReady).toBe(true);
      expect(result.dfarsCompliant).toBe(true);
      expect(result.lastGenerated).toBe('2 min ago');
    });

    it('should return increased packs for warning mode', () => {
      const result = getMockEvidencePacksSummary('warning');
      expect(result.sessionPacks).toBe(5);
      expect(result.cmmcReady).toBe(true);
      expect(result.dfarsCompliant).toBe(true);
      expect(result.lastGenerated).toBe('2 min ago');
    });

    it('should return non-compliant state for critical mode', () => {
      const result = getMockEvidencePacksSummary('critical');
      expect(result.sessionPacks).toBe(8);
      expect(result.cmmcReady).toBe(false);
      expect(result.dfarsCompliant).toBe(false);
      expect(result.lastGenerated).toBe('15 min ago');
    });

    it('should return recent packs array', () => {
      const result = getMockEvidencePacksSummary();
      expect(result.recentPacks).toBeInstanceOf(Array);
      expect(result.recentPacks.length).toBe(3);
    });

    it('should have signed packs in normal mode', () => {
      const result = getMockEvidencePacksSummary('normal');
      expect(result.recentPacks[0].signed).toBe(true);
      expect(result.recentPacks[1].signed).toBe(true);
      expect(result.recentPacks[2].signed).toBe(true);
    });

    it('should have unsigned pack in critical mode', () => {
      const result = getMockEvidencePacksSummary('critical');
      expect(result.recentPacks[0].signed).toBe(true);
      expect(result.recentPacks[1].signed).toBe(true);
      expect(result.recentPacks[2].signed).toBe(false);
    });

    it('should have pack with required properties', () => {
      const result = getMockEvidencePacksSummary();
      const pack = result.recentPacks[0];
      expect(pack).toHaveProperty('id');
      expect(pack).toHaveProperty('task');
      expect(pack).toHaveProperty('timestamp');
      expect(pack).toHaveProperty('size');
      expect(pack).toHaveProperty('signed');
    });

    it('should default to normal mode', () => {
      const result = getMockEvidencePacksSummary();
      expect(result.sessionPacks).toBe(3);
      expect(result.cmmcReady).toBe(true);
    });
  });
});
