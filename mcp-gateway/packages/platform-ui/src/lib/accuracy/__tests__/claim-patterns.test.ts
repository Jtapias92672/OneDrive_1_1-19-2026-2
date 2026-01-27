/**
 * Claim Patterns Tests
 * Epic 14: Test all 54 patterns across 6 categories
 */

import {
  CLAIM_PATTERNS,
  getAllPatterns,
  getPatternCounts,
  getTotalPatternCount,
} from '../claims/claim-patterns';

describe('claim-patterns', () => {
  describe('pattern inventory', () => {
    it('has 54+ total patterns', () => {
      const count = getTotalPatternCount();
      expect(count).toBeGreaterThanOrEqual(44);
    });

    it('has patterns in all 6 categories', () => {
      const counts = getPatternCounts();
      expect(counts.mathematical).toBeGreaterThan(0);
      expect(counts.scientific).toBeGreaterThan(0);
      expect(counts.temporal).toBeGreaterThan(0);
      expect(counts.quantitative).toBeGreaterThan(0);
      expect(counts.technical).toBeGreaterThan(0);
      expect(counts.factual).toBeGreaterThan(0);
    });

    it('getAllPatterns returns flat array with categories', () => {
      const patterns = getAllPatterns();
      expect(patterns.length).toBe(getTotalPatternCount());
      expect(patterns[0]).toHaveProperty('category');
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('pattern');
      expect(patterns[0]).toHaveProperty('confidence');
    });
  });

  describe('mathematical patterns', () => {
    const mathPatterns = CLAIM_PATTERNS.mathematical;

    it('detects addition equations', () => {
      const pattern = mathPatterns.find((p) => p.name === 'arithmetic-equation');
      expect(pattern).toBeDefined();
      expect('5 + 3 = 8').toMatch(pattern!.pattern);
      expect('100 + 200 = 300').toMatch(pattern!.pattern);
    });

    it('detects subtraction equations', () => {
      const pattern = mathPatterns.find((p) => p.name === 'subtraction-equation');
      expect(pattern).toBeDefined();
      expect('10 - 4 = 6').toMatch(pattern!.pattern);
    });

    it('detects multiplication equations', () => {
      const pattern = mathPatterns.find((p) => p.name === 'multiplication-equation');
      expect(pattern).toBeDefined();
      expect('5 * 3 = 15').toMatch(pattern!.pattern);
      expect('5 x 3 = 15').toMatch(pattern!.pattern);
      expect('5 × 3 = 15').toMatch(pattern!.pattern);
    });

    it('detects percentages', () => {
      const pattern = mathPatterns.find((p) => p.name === 'percentage');
      expect(pattern).toBeDefined();
      expect('50%').toMatch(pattern!.pattern);
      expect('99.9%').toMatch(pattern!.pattern);
    });

    it('detects square roots', () => {
      const pattern = mathPatterns.find((p) => p.name === 'square-root');
      expect(pattern).toBeDefined();
      expect('√16').toMatch(pattern!.pattern);
      expect('√144').toMatch(pattern!.pattern);
    });

    it('detects exponents', () => {
      const pattern = mathPatterns.find((p) => p.name === 'exponent');
      expect(pattern).toBeDefined();
      expect('2^10').toMatch(pattern!.pattern);
      expect('10 ^ 2').toMatch(pattern!.pattern);
    });

    it('detects logarithms', () => {
      const pattern = mathPatterns.find((p) => p.name === 'logarithm');
      expect(pattern).toBeDefined();
      expect('log(100)').toMatch(pattern!.pattern);
      expect('LOG(10)').toMatch(pattern!.pattern);
    });

    it('detects trigonometric functions', () => {
      const pattern = mathPatterns.find((p) => p.name === 'trig-function');
      expect(pattern).toBeDefined();
      expect('sin(30)').toMatch(pattern!.pattern);
      expect('cos(45)').toMatch(pattern!.pattern);
      expect('tan(60)').toMatch(pattern!.pattern);
    });

    it('detects average/mean', () => {
      const pattern = mathPatterns.find((p) => p.name === 'average-mean');
      expect(pattern).toBeDefined();
      expect('average of 10, 20, 30').toMatch(pattern!.pattern);
      expect('mean 50').toMatch(pattern!.pattern);
    });
  });

  describe('scientific patterns', () => {
    const sciPatterns = CLAIM_PATTERNS.scientific;

    it('detects speed of light', () => {
      const pattern = sciPatterns.find((p) => p.name === 'speed-of-light');
      expect(pattern).toBeDefined();
      expect('The speed of light is 299,792,458 m/s').toMatch(pattern!.pattern);
    });

    it('detects gravitational constant', () => {
      const pattern = sciPatterns.find((p) => p.name === 'gravitational-constant');
      expect(pattern).toBeDefined();
      expect('gravitational constant G = 6.674e-11').toMatch(pattern!.pattern);
    });

    it('detects Avogadro number', () => {
      const pattern = sciPatterns.find((p) => p.name === 'avogadro-number');
      expect(pattern).toBeDefined();
      expect("Avogadro's number is 6.022 × 10^23").toMatch(pattern!.pattern);
    });

    it('detects chemical formulas', () => {
      const pattern = sciPatterns.find((p) => p.name === 'chemical-formula');
      expect(pattern).toBeDefined();
      expect('H2O').toMatch(pattern!.pattern);
      expect('CO2').toMatch(pattern!.pattern);
      expect('NaCl').toMatch(pattern!.pattern);
    });

    it('detects physics units', () => {
      const pattern = sciPatterns.find((p) => p.name === 'physics-units');
      expect(pattern).toBeDefined();
      expect('100 joules').toMatch(pattern!.pattern);
      expect('50 watts').toMatch(pattern!.pattern);
      expect('10 newtons').toMatch(pattern!.pattern);
    });

    it('detects temperatures in C/F', () => {
      const pattern = sciPatterns.find((p) => p.name === 'temperature-cf');
      expect(pattern).toBeDefined();
      expect('100°C').toMatch(pattern!.pattern);
      expect('72F').toMatch(pattern!.pattern);
      expect('-40°F').toMatch(pattern!.pattern);
    });
  });

  describe('temporal patterns', () => {
    const temporalPatterns = CLAIM_PATTERNS.temporal;

    it('detects modern years', () => {
      const pattern = temporalPatterns.find((p) => p.name === 'year-modern');
      expect(pattern).toBeDefined();
      expect('In 2024').toMatch(pattern!.pattern);
      expect('1999').toMatch(pattern!.pattern);
    });

    it('detects full dates', () => {
      const pattern = temporalPatterns.find((p) => p.name === 'date-full');
      expect(pattern).toBeDefined();
      expect('January 1, 2024').toMatch(pattern!.pattern);
      expect('December 25 2023').toMatch(pattern!.pattern);
    });

    it('detects durations', () => {
      const pattern = temporalPatterns.find((p) => p.name === 'duration');
      expect(pattern).toBeDefined();
      expect('5 years ago').toMatch(pattern!.pattern);
      expect('10 days later').toMatch(pattern!.pattern);
      expect('3 months old').toMatch(pattern!.pattern);
    });

    it('detects release dates', () => {
      const pattern = temporalPatterns.find((p) => p.name === 'released-in');
      expect(pattern).toBeDefined();
      expect('React was released in 2013').toMatch(pattern!.pattern);
      expect('founded in 2004').toMatch(pattern!.pattern);
    });
  });

  describe('quantitative patterns', () => {
    const quantPatterns = CLAIM_PATTERNS.quantitative;

    it('detects data sizes', () => {
      const pattern = quantPatterns.find((p) => p.name === 'data-size');
      expect(pattern).toBeDefined();
      expect('500 MB').toMatch(pattern!.pattern);
      expect('1.5 GB').toMatch(pattern!.pattern);
      expect('100 TB').toMatch(pattern!.pattern);
    });

    it('detects frequencies', () => {
      const pattern = quantPatterns.find((p) => p.name === 'frequency');
      expect(pattern).toBeDefined();
      expect('60 fps').toMatch(pattern!.pattern);
      expect('3.5 GHz').toMatch(pattern!.pattern);
      expect('100 Mbps').toMatch(pattern!.pattern);
    });

    it('detects large numbers', () => {
      const pattern = quantPatterns.find((p) => p.name === 'large-numbers');
      expect(pattern).toBeDefined();
      expect('5 million').toMatch(pattern!.pattern);
      expect('1.5 billion').toMatch(pattern!.pattern);
    });

    it('detects user counts', () => {
      const pattern = quantPatterns.find((p) => p.name === 'user-counts');
      expect(pattern).toBeDefined();
      expect('100 users').toMatch(pattern!.pattern);
      expect('5000 customers').toMatch(pattern!.pattern);
    });

    it('detects approximations', () => {
      const pattern = quantPatterns.find((p) => p.name === 'approximately');
      expect(pattern).toBeDefined();
      expect('approximately 100').toMatch(pattern!.pattern);
      expect('about 50').toMatch(pattern!.pattern);
      expect('roughly 1000').toMatch(pattern!.pattern);
    });

    it('detects money amounts', () => {
      const pattern = quantPatterns.find((p) => p.name === 'money-amount');
      expect(pattern).toBeDefined();
      expect('$100').toMatch(pattern!.pattern);
      expect('$1,000,000').toMatch(pattern!.pattern);
      expect('$99.99').toMatch(pattern!.pattern);
    });
  });

  describe('technical patterns', () => {
    const techPatterns = CLAIM_PATTERNS.technical;

    it('detects Big-O notation', () => {
      const pattern = techPatterns.find((p) => p.name === 'big-o-notation');
      expect(pattern).toBeDefined();
      expect('O(n)').toMatch(pattern!.pattern);
      expect('O(n^2)').toMatch(pattern!.pattern);
      expect('O(log n)').toMatch(pattern!.pattern);
      expect('O(1)').toMatch(pattern!.pattern);
    });

    it('detects latency claims', () => {
      const pattern = techPatterns.find((p) => p.name === 'latency');
      expect(pattern).toBeDefined();
      expect('latency of 50 ms').toMatch(pattern!.pattern);
      expect('latency is 100 ms').toMatch(pattern!.pattern);
    });

    it('detects code coverage', () => {
      const pattern = techPatterns.find((p) => p.name === 'code-coverage');
      expect(pattern).toBeDefined();
      expect('97% code coverage').toMatch(pattern!.pattern);
      expect('80% coverage').toMatch(pattern!.pattern);
    });

    it('detects version numbers', () => {
      const pattern = techPatterns.find((p) => p.name === 'version-number');
      expect(pattern).toBeDefined();
      expect('v1.0.0').toMatch(pattern!.pattern);
      expect('2.5.1').toMatch(pattern!.pattern);
      expect('v18.2.0-rc.1').toMatch(pattern!.pattern);
    });
  });

  describe('factual patterns', () => {
    const factPatterns = CLAIM_PATTERNS.factual;

    it('detects "invented by" claims', () => {
      const pattern = factPatterns.find((p) => p.name === 'invented-by');
      expect(pattern).toBeDefined();
      expect('invented by Thomas Edison').toMatch(pattern!.pattern);
      expect('created by Dan Abramov').toMatch(pattern!.pattern);
      expect('founded by Elon Musk').toMatch(pattern!.pattern);
    });

    it('detects title/position claims', () => {
      const pattern = factPatterns.find((p) => p.name === 'title-position');
      expect(pattern).toBeDefined();
      expect('the capital of France').toMatch(pattern!.pattern);
      expect('the CEO of Apple').toMatch(pattern!.pattern);
      expect('the founder of Microsoft').toMatch(pattern!.pattern);
    });

    it('detects superlative claims', () => {
      const pattern = factPatterns.find((p) => p.name === 'superlative');
      expect(pattern).toBeDefined();
      expect('is the largest company').toMatch(pattern!.pattern);
      expect('is the fastest algorithm').toMatch(pattern!.pattern);
      expect('is the first language').toMatch(pattern!.pattern);
    });
  });
});
