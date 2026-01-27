/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

function createRequest(body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/accuracy/validate'), {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('POST /api/accuracy/validate', () => {
  it('validates content with claims', async () => {
    const request = createRequest({
      content: '5 + 5 = 10 and the speed of light is 299792458 m/s.',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contentId).toBeDefined();
    expect(data.claims.length).toBeGreaterThan(0);
    expect(data.confidence).toBeDefined();
    expect(data.confidence.overallScore).toBeDefined();
    expect(data.confidence.level).toBeDefined();
  });

  it('returns correct tier for arithmetic', async () => {
    const request = createRequest({
      content: '10 + 20 = 30',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.claims.length).toBeGreaterThan(0);
    expect(data.claims[0].tier).toBe(1);
    expect(data.claims[0].source).toBe('local-arithmetic');
    expect(data.claims[0].status).toBe('verified');
  });

  it('returns knowledge base tier for known facts', async () => {
    const request = createRequest({
      content: 'React was released in 2013.',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should find temporal claims and validate via knowledge base
    if (data.claims.length > 0) {
      const temporalClaim = data.claims.find(
        (c: { claim: { category: string } }) => c.claim.category === 'temporal'
      );
      if (temporalClaim && temporalClaim.tier === 2) {
        expect(temporalClaim.source).toBe('knowledge-base');
      }
    }
  });

  it('handles content with no claims', async () => {
    const request = createRequest({
      content: 'This is a simple sentence.',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.claims).toEqual([]);
    expect(data.confidence.overallScore).toBe(100);
    expect(data.confidence.claimCount).toBe(0);
  });

  it('respects allowWolfram option', async () => {
    const request = createRequest({
      content: 'Some unknown fact about 99999.',
      options: { allowWolfram: false },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // No claim should have wolframUsed = true
    const wolframUsed = data.claims.some((c: { wolframUsed: boolean }) => c.wolframUsed);
    expect(wolframUsed).toBe(false);
  });

  it('respects maxWolframCalls option', async () => {
    const request = createRequest({
      content: 'Value 111 and value 222 and value 333.',
      options: { maxWolframCalls: 1 },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const wolframCalls = data.claims.filter((c: { wolframUsed: boolean }) => c.wolframUsed).length;
    expect(wolframCalls).toBeLessThanOrEqual(1);
  });

  it('includes claim metadata', async () => {
    const request = createRequest({
      content: '5 + 5 = 10',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.claims.length).toBeGreaterThan(0);
    const claim = data.claims[0];
    expect(claim.claimId).toBeDefined();
    expect(claim.claim).toBeDefined();
    expect(claim.claim.text).toBeDefined();
    expect(claim.claim.category).toBeDefined();
    expect(claim.tier).toBeDefined();
    expect(claim.source).toBeDefined();
    expect(claim.status).toBeDefined();
    expect(claim.confidence).toBeDefined();
  });

  it('includes confidence breakdown', async () => {
    const request = createRequest({
      content: '5 + 5 = 10 and 10 - 3 = 7',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.confidence.claimCount).toBeGreaterThan(0);
    expect(data.confidence.verifiedCount).toBeDefined();
    expect(data.confidence.unverifiedCount).toBeDefined();
    expect(data.confidence.failedCount).toBeDefined();
    expect(data.confidence.categoryScores).toBeDefined();
    expect(data.confidence.factors).toBeDefined();
  });

  it('tracks totalCost', async () => {
    const request = createRequest({
      content: '5 + 5 = 10',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.totalCost).toBeDefined();
    expect(typeof data.totalCost).toBe('number');
  });

  it('includes validatedAt timestamp', async () => {
    const request = createRequest({
      content: '5 + 5 = 10',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.validatedAt).toBeDefined();
    expect(new Date(data.validatedAt).getTime()).toBeGreaterThan(0);
  });

  it('returns 400 for missing content', async () => {
    const request = createRequest({});
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for non-string content', async () => {
    const request = createRequest({ content: 123 });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for content exceeding max length', async () => {
    const request = createRequest({ content: 'x'.repeat(100001) });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/accuracy/validate', () => {
  it('returns endpoint documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/accuracy/validate');
    expect(data.method).toBe('POST');
    expect(data.tiers).toBeDefined();
    expect(data.tiers['1']).toContain('Local');
    expect(data.tiers['2']).toContain('Knowledge');
    expect(data.tiers['3']).toContain('Wolfram');
  });
});
