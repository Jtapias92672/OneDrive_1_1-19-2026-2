/**
 * Tier 1 Validator Tests
 * Epic 14: Local/Static Validation
 */

import { Tier1Validator } from '../tier1-validator';
import { DetectedClaim, ClaimCategory } from '../../claims/types';

function createClaim(text: string, category: ClaimCategory): DetectedClaim {
  return {
    id: `claim-${Date.now()}`,
    text,
    category,
    context: text,
    startIndex: 0,
    endIndex: text.length,
    confidence: 0.9,
    patterns: ['test-pattern'],
  };
}

describe('Tier1Validator', () => {
  let validator: Tier1Validator;

  beforeEach(() => {
    validator = new Tier1Validator();
  });

  describe('arithmetic validation', () => {
    it('validates correct addition', async () => {
      const claim = createClaim('5 + 3 = 8', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
      expect(result!.tier).toBe(1);
      expect(result!.source).toBe('local-arithmetic');
      expect(result!.confidence).toBe(100);
      expect(result!.match).toBe(true);
    });

    it('validates correct subtraction', async () => {
      const claim = createClaim('10 - 4 = 6', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
      expect(result!.match).toBe(true);
    });

    it('validates correct multiplication', async () => {
      const claim = createClaim('7 * 8 = 56', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('validates multiplication with x symbol', async () => {
      const claim = createClaim('5 x 4 = 20', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('validates correct division', async () => {
      const claim = createClaim('20 / 4 = 5', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('fails incorrect arithmetic', async () => {
      const claim = createClaim('5 + 3 = 9', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
      expect(result!.confidence).toBe(0);
      expect(result!.match).toBe(false);
    });

    it('validates decimal arithmetic', async () => {
      const claim = createClaim('2.5 + 2.5 = 5', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('returns null for non-arithmetic mathematical claims', async () => {
      const claim = createClaim('50%', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });
  });

  describe('constant validation', () => {
    it('validates speed of light', async () => {
      const claim = createClaim('The speed of light is 299792458 m/s', 'scientific');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
      expect(result!.tier).toBe(1);
      expect(result!.source).toBe('local-constant');
      expect(result!.confidence).toBe(95);
    });

    it('validates speed of light with commas', async () => {
      const claim = createClaim('The speed of light is 299,792,458 m/s', 'scientific');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('fails incorrect speed of light', async () => {
      const claim = createClaim('The speed of light is 300000000 m/s', 'scientific');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
    });

    it('validates pi', async () => {
      const claim = createClaim('pi is 3.14159', 'scientific');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('validates Avogadro number', async () => {
      const claim = createClaim("Avogadro's number is 6.022e23", 'scientific');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('verified');
    });

    it('returns null for unknown scientific claims', async () => {
      const claim = createClaim('Some unknown constant', 'scientific');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });
  });

  describe('category handling', () => {
    it('returns null for temporal claims', async () => {
      const claim = createClaim('Released in 2013', 'temporal');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });

    it('returns null for quantitative claims', async () => {
      const claim = createClaim('500 MB', 'quantitative');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });

    it('returns null for technical claims', async () => {
      const claim = createClaim('O(n log n)', 'technical');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });

    it('returns null for factual claims', async () => {
      const claim = createClaim('invented by someone', 'factual');
      const result = await validator.validate(claim);

      expect(result).toBeNull();
    });
  });

  describe('result properties', () => {
    it('includes expected and actual values', async () => {
      const claim = createClaim('5 + 5 = 10', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.expectedValue).toBe('10');
      expect(result!.actualValue).toBe('10');
    });

    it('includes confidence factors', async () => {
      const claim = createClaim('5 + 5 = 10', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.confidenceFactors.length).toBeGreaterThan(0);
      expect(result!.confidenceFactors[0].name).toBeDefined();
      expect(result!.confidenceFactors[0].weight).toBeDefined();
      expect(result!.confidenceFactors[0].score).toBeDefined();
      expect(result!.confidenceFactors[0].reason).toBeDefined();
    });

    it('sets wolframUsed to false', async () => {
      const claim = createClaim('5 + 5 = 10', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.wolframUsed).toBe(false);
      expect(result!.wolframCost).toBe(0);
    });

    it('includes validatedAt timestamp', async () => {
      const claim = createClaim('5 + 5 = 10', 'mathematical');
      const result = await validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result!.validatedAt).toBeInstanceOf(Date);
    });
  });
});
