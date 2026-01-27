/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

function createRequest(body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/accuracy/detect'), {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('POST /api/accuracy/detect', () => {
  it('detects claims in content', async () => {
    const request = createRequest({
      content: 'The speed of light is 299,792,458 m/s and React was released in 2013.',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.claims.length).toBeGreaterThan(0);
    expect(data.claimDensity).toBeDefined();
    expect(data.categories).toBeDefined();
    expect(data.densityLevel).toBeDefined();
  });

  it('returns contentId if provided', async () => {
    const request = createRequest({
      content: 'Test content with year 2024.',
      contentId: 'my-custom-id',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.contentId).toBe('my-custom-id');
  });

  it('filters by category when specified', async () => {
    const request = createRequest({
      content: 'Released in 2024 and costs $100.',
      category: 'temporal',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.claims.every((c: { category: string }) => c.category === 'temporal')).toBe(true);
  });

  it('returns 400 when content is missing', async () => {
    const request = createRequest({});

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 when content is not a string', async () => {
    const request = createRequest({ content: 123 });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 when content exceeds max length', async () => {
    const request = createRequest({
      content: 'x'.repeat(100001),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('handles content with no claims', async () => {
    const request = createRequest({
      content: 'This is a simple sentence.',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.claims).toEqual([]);
    expect(data.claimDensity).toBe(0);
  });

  it('handles empty content', async () => {
    const request = createRequest({
      content: '',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('detects multiple claim categories', async () => {
    const request = createRequest({
      content: `
        The speed of light is 299,792,458 m/s.
        React was released in 2013.
        The result of 10 + 5 = 15.
        File size is 500 MB.
      `,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.categories.scientific).toBeGreaterThan(0);
    expect(data.categories.temporal).toBeGreaterThan(0);
    expect(data.categories.mathematical).toBeGreaterThan(0);
    expect(data.categories.quantitative).toBeGreaterThan(0);
  });

  it('includes claim context', async () => {
    const request = createRequest({
      content: 'The answer is 42 according to the guide.',
    });

    const response = await POST(request);
    const data = await response.json();

    if (data.claims.length > 0) {
      expect(data.claims[0].context).toBeDefined();
      expect(data.claims[0].context.length).toBeGreaterThan(0);
    }
  });

  it('includes claim metadata', async () => {
    const request = createRequest({
      content: 'Test 2024',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.claims.length).toBeGreaterThan(0);
    const claim = data.claims[0];
    expect(claim.id).toBeDefined();
    expect(claim.text).toBeDefined();
    expect(claim.category).toBeDefined();
    expect(claim.startIndex).toBeDefined();
    expect(claim.endIndex).toBeDefined();
    expect(claim.confidence).toBeDefined();
    expect(claim.patterns).toBeDefined();
  });
});

describe('GET /api/accuracy/detect', () => {
  it('returns endpoint documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/accuracy/detect');
    expect(data.method).toBe('POST');
    expect(data.categories).toContain('mathematical');
    expect(data.categories).toContain('scientific');
    expect(data.categories).toContain('temporal');
  });
});
