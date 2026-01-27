/**
 * Claim Detector Tests
 * Epic 14: Computational Accuracy Layer
 */

import { ClaimDetector, claimDetector } from '../claims/claim-detector';

describe('ClaimDetector', () => {
  describe('detect', () => {
    it('detects mathematical claims', () => {
      const content = 'The result of 5 + 3 = 8 is correct.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'mathematical')).toBe(true);
    });

    it('detects scientific claims', () => {
      const content = 'The speed of light is 299,792,458 m/s in a vacuum.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'scientific')).toBe(true);
    });

    it('detects temporal claims', () => {
      const content = 'React was released in 2013 by Facebook.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'temporal')).toBe(true);
    });

    it('detects quantitative claims', () => {
      const content = 'The file size is 500 MB and has 1 million downloads.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'quantitative')).toBe(true);
    });

    it('detects technical claims', () => {
      const content = 'This algorithm runs in O(n log n) time with latency of 50 ms.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'technical')).toBe(true);
    });

    it('detects factual claims', () => {
      const content = 'JavaScript was invented by Brendan Eich and is the most popular language.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'factual')).toBe(true);
    });

    it('detects multiple claims in one content', () => {
      const content = `
        The speed of light is 299,792,458 m/s.
        React was released in 2013.
        The result of 10 + 5 = 15.
        This runs in O(n^2) time.
      `;
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThanOrEqual(4);
      expect(result.categories.scientific).toBeGreaterThan(0);
      expect(result.categories.temporal).toBeGreaterThan(0);
      expect(result.categories.mathematical).toBeGreaterThan(0);
      expect(result.categories.technical).toBeGreaterThan(0);
    });

    it('returns claims sorted by position', () => {
      const content = 'First 2024, then 50%, finally O(n).';
      const result = claimDetector.detect(content);

      for (let i = 1; i < result.claims.length; i++) {
        expect(result.claims[i].startIndex).toBeGreaterThan(result.claims[i - 1].startIndex);
      }
    });

    it('calculates claim density', () => {
      const content = '50% of users have 100 MB storage.';
      const result = claimDetector.detect(content);

      expect(result.claimDensity).toBeGreaterThan(0);
      expect(result.claimDensity).toBeLessThan(100);
    });

    it('extracts claim context', () => {
      const content = 'The speed of light is 299,792,458 m/s according to physics.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims[0].context).toBeDefined();
      expect(result.claims[0].context.length).toBeGreaterThan(result.claims[0].text.length);
    });

    it('assigns content ID', () => {
      const result = claimDetector.detect('Test 2024', 'my-content-id');
      expect(result.contentId).toBe('my-content-id');
    });

    it('generates content ID if not provided', () => {
      const result = claimDetector.detect('Test 2024');
      expect(result.contentId).toBeDefined();
      expect(result.contentId).toMatch(/^content-/);
    });

    it('handles content with no claims', () => {
      const content = 'This is a simple sentence with no verifiable claims.';
      const result = claimDetector.detect(content);

      expect(result.claims.length).toBe(0);
      expect(result.claimDensity).toBe(0);
    });

    it('handles empty content', () => {
      const result = claimDetector.detect('');
      expect(result.claims.length).toBe(0);
      expect(result.claimDensity).toBe(0);
    });

    it('avoids duplicate claims at same position', () => {
      // Some patterns might overlap
      const content = '50%';
      const result = claimDetector.detect(content);

      const positions = result.claims.map((c) => c.startIndex);
      const uniquePositions = new Set(positions);
      expect(positions.length).toBe(uniquePositions.size);
    });
  });

  describe('detectByCategory', () => {
    it('filters to specific category', () => {
      const content = 'React was released in 2013 and runs at 60 fps.';
      const result = claimDetector.detectByCategory(content, 'temporal');

      expect(result.claims.every((c) => c.category === 'temporal')).toBe(true);
      expect(result.categories.temporal).toBeGreaterThan(0);
      expect(result.categories.quantitative).toBe(0);
    });

    it('returns empty for non-matching category', () => {
      const content = '50% of users prefer dark mode.';
      const result = claimDetector.detectByCategory(content, 'scientific');

      expect(result.claims.length).toBe(0);
    });
  });

  describe('getDensityLevel', () => {
    it('returns low for density < 2', () => {
      expect(claimDetector.getDensityLevel(0)).toBe('low');
      expect(claimDetector.getDensityLevel(1)).toBe('low');
      expect(claimDetector.getDensityLevel(1.9)).toBe('low');
    });

    it('returns medium for density 2-5', () => {
      expect(claimDetector.getDensityLevel(2)).toBe('medium');
      expect(claimDetector.getDensityLevel(3.5)).toBe('medium');
      expect(claimDetector.getDensityLevel(4.9)).toBe('medium');
    });

    it('returns high for density >= 5', () => {
      expect(claimDetector.getDensityLevel(5)).toBe('high');
      expect(claimDetector.getDensityLevel(10)).toBe('high');
    });
  });

  describe('claim properties', () => {
    it('includes pattern name in matched patterns', () => {
      const content = 'The speed of light is 299,792,458 m/s';
      const result = claimDetector.detect(content);

      expect(result.claims[0].patterns.length).toBeGreaterThan(0);
      expect(typeof result.claims[0].patterns[0]).toBe('string');
    });

    it('includes confidence score', () => {
      const content = '10 + 5 = 15';
      const result = claimDetector.detect(content);

      expect(result.claims[0].confidence).toBeGreaterThan(0);
      expect(result.claims[0].confidence).toBeLessThanOrEqual(1);
    });

    it('includes start and end indices', () => {
      const content = 'The year is 2024.';
      const result = claimDetector.detect(content);

      const yearClaim = result.claims.find((c) => c.text === '2024');
      expect(yearClaim).toBeDefined();
      expect(yearClaim!.startIndex).toBe(content.indexOf('2024'));
      expect(yearClaim!.endIndex).toBe(content.indexOf('2024') + 4);
    });
  });
});
