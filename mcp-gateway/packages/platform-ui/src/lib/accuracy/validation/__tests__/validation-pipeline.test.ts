/**
 * Validation Pipeline Tests
 * Epic 14: Tier Escalation and Confidence
 */

import { ValidationPipeline } from '../validation-pipeline';
import { Tier1Validator } from '../tier1-validator';
import { Tier2Validator } from '../tier2-validator';
import { Tier3Validator } from '../tier3-validator';
import { ValidationStore } from '../validation-store';
import { KnowledgeBase } from '../knowledge-base';
import { WolframClient, WolframCache } from '../../wolfram';
import { DetectedClaim, ClaimCategory } from '../../claims/types';

function createClaim(
  text: string,
  category: ClaimCategory,
  id?: string
): DetectedClaim {
  return {
    id: id || `claim-${Date.now()}-${Math.random()}`,
    text,
    category,
    context: text,
    startIndex: 0,
    endIndex: text.length,
    confidence: 0.9,
    patterns: ['test-pattern'],
  };
}

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;
  let store: ValidationStore;

  beforeEach(() => {
    const tier1 = new Tier1Validator();
    const cache = new WolframCache();
    const knowledgeBase = new KnowledgeBase();
    const tier2 = new Tier2Validator(knowledgeBase, cache);
    const wolframClient = new WolframClient({}, cache);
    const tier3 = new Tier3Validator(wolframClient);
    store = new ValidationStore();
    pipeline = new ValidationPipeline(tier1, tier2, tier3, store);
  });

  afterEach(() => {
    store.reset();
  });

  describe('tier escalation', () => {
    it('validates arithmetic at tier 1', async () => {
      const claims = [createClaim('5 + 3 = 8', 'mathematical')];
      const result = await pipeline.validate(claims);

      expect(result.claims.length).toBe(1);
      expect(result.claims[0].tier).toBe(1);
      expect(result.claims[0].source).toBe('local-arithmetic');
      expect(result.claims[0].status).toBe('verified');
    });

    it('validates constants at tier 1', async () => {
      const claims = [createClaim('speed of light is 299792458 m/s', 'scientific')];
      const result = await pipeline.validate(claims);

      expect(result.claims.length).toBe(1);
      expect(result.claims[0].tier).toBe(1);
      expect(result.claims[0].source).toBe('local-constant');
    });

    it('escalates to tier 2 for known facts', async () => {
      const claims = [createClaim('React was released in 2013', 'temporal')];
      const result = await pipeline.validate(claims);

      expect(result.claims.length).toBe(1);
      expect(result.claims[0].tier).toBe(2);
      expect(result.claims[0].source).toBe('knowledge-base');
    });

    it('escalates to tier 3 for unknown claims when Wolfram allowed', async () => {
      const claims = [createClaim('Some unknown claim about 12345', 'quantitative')];
      const result = await pipeline.validate(claims, { allowWolfram: true });

      expect(result.claims.length).toBe(1);
      // Will use tier 3 or be unverified
      expect([0, 3]).toContain(result.claims[0].tier);
    });

    it('stops at tier 2 when Wolfram not allowed', async () => {
      const claims = [createClaim('Some unknown claim about 12345', 'quantitative')];
      const result = await pipeline.validate(claims, { allowWolfram: false });

      expect(result.claims.length).toBe(1);
      expect(result.claims[0].tier).not.toBe(3);
      expect(result.claims[0].wolframUsed).toBe(false);
    });
  });

  describe('multiple claims', () => {
    it('validates multiple claims', async () => {
      const claims = [
        createClaim('5 + 5 = 10', 'mathematical'),
        createClaim('React released in 2013', 'temporal'),
        createClaim('speed of light is 299792458 m/s', 'scientific'),
      ];

      const result = await pipeline.validate(claims);

      expect(result.claims.length).toBe(3);
      expect(result.claims.filter((c) => c.status === 'verified').length).toBe(3);
    });

    it('handles mixed verified and unverified claims', async () => {
      const claims = [
        createClaim('5 + 5 = 10', 'mathematical'), // verified
        createClaim('unknown fact xyz', 'factual'), // unverified
      ];

      const result = await pipeline.validate(claims, { allowWolfram: false });

      expect(result.claims.length).toBe(2);
      expect(result.claims[0].status).toBe('verified');
      // Second claim may be unverified or have partial validation
    });
  });

  describe('Wolfram budget', () => {
    it('respects maxWolframCalls limit', async () => {
      // Create multiple claims that would need Wolfram
      const claims = [
        createClaim('unknown1 12345', 'quantitative'),
        createClaim('unknown2 67890', 'quantitative'),
        createClaim('unknown3 11111', 'quantitative'),
      ];

      const result = await pipeline.validate(claims, {
        allowWolfram: true,
        maxWolframCalls: 2,
      });

      const wolframCalls = result.claims.filter((c) => c.wolframUsed).length;
      expect(wolframCalls).toBeLessThanOrEqual(2);
    });

    it('tracks total Wolfram cost', async () => {
      const claims = [createClaim('unknown claim 999', 'quantitative')];
      const result = await pipeline.validate(claims, { allowWolfram: true });

      expect(result.totalCost).toBeDefined();
      expect(typeof result.totalCost).toBe('number');
    });
  });

  describe('confidence calculation', () => {
    it('calculates high confidence for all verified', async () => {
      const claims = [
        createClaim('5 + 5 = 10', 'mathematical'),
        createClaim('10 - 3 = 7', 'mathematical'),
      ];

      const result = await pipeline.validate(claims);

      expect(result.confidence.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.confidence.level).toBe('high');
    });

    it('calculates lower confidence for unverified claims', async () => {
      const claims = [
        createClaim('some unknown claim xyz 12345', 'factual'), // unverified
        createClaim('10 - 3 = 7', 'mathematical'), // verified
      ];

      const result = await pipeline.validate(claims, { allowWolfram: false });

      // One should be verified, one unverified
      expect(result.confidence.overallScore).toBeLessThan(100);
      expect(result.confidence.unverifiedCount).toBeGreaterThan(0);
    });

    it('includes category scores', async () => {
      const claims = [
        createClaim('5 + 5 = 10', 'mathematical'),
        createClaim('speed of light is 299792458 m/s', 'scientific'),
      ];

      const result = await pipeline.validate(claims);

      expect(result.confidence.categoryScores.mathematical).toBeDefined();
      expect(result.confidence.categoryScores.scientific).toBeDefined();
    });

    it('includes confidence factors', async () => {
      const claims = [createClaim('5 + 5 = 10', 'mathematical')];
      const result = await pipeline.validate(claims);

      expect(result.confidence.factors.length).toBeGreaterThan(0);
      expect(result.confidence.factors[0].name).toBeDefined();
    });

    it('handles empty claims array', async () => {
      const result = await pipeline.validate([]);

      expect(result.claims.length).toBe(0);
      expect(result.confidence.overallScore).toBe(100);
      expect(result.confidence.level).toBe('high');
    });
  });

  describe('caching', () => {
    it('stores results when cacheResults is true', async () => {
      const claims = [createClaim('5 + 5 = 10', 'mathematical', 'test-claim-1')];
      await pipeline.validate(claims, { cacheResults: true });

      const stored = await store.get('test-claim-1');
      expect(stored).not.toBeNull();
    });

    it('stores content validation', async () => {
      const claims = [createClaim('5 + 5 = 10', 'mathematical')];
      const result = await pipeline.validate(claims, { cacheResults: true });

      const stored = await store.getContentValidation(result.contentId);
      expect(stored).not.toBeNull();
    });
  });

  describe('result properties', () => {
    it('includes contentId', async () => {
      const claims = [createClaim('5 + 5 = 10', 'mathematical')];
      const result = await pipeline.validate(claims);

      expect(result.contentId).toBeDefined();
    });

    it('includes validatedAt timestamp', async () => {
      const claims = [createClaim('5 + 5 = 10', 'mathematical')];
      const result = await pipeline.validate(claims);

      expect(result.validatedAt).toBeInstanceOf(Date);
    });

    it('includes claim counts', async () => {
      const claims = [
        createClaim('5 + 5 = 10', 'mathematical'),
        createClaim('10 - 3 = 7', 'mathematical'),
      ];

      const result = await pipeline.validate(claims);

      expect(result.confidence.claimCount).toBe(2);
      expect(result.confidence.verifiedCount).toBe(2);
    });
  });
});
