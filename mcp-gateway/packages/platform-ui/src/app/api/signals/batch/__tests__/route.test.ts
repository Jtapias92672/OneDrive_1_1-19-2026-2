/**
 * @jest-environment node
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

function createRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/signals/batch'), {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('POST /api/signals/batch', () => {
  it('accepts valid signal batch', async () => {
    const request = createRequest({
      batch: {
        signals: [
          {
            id: 'sig-1',
            userId: 'user-1',
            sessionId: 'session-1',
            signalType: 'page_viewed',
            context: { page: 'home' },
            createdAt: new Date().toISOString(),
          },
        ],
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accepted).toBe(1);
    expect(data.rejected).toBe(0);
  });

  it('rejects signals with missing id', async () => {
    const request = createRequest({
      batch: {
        signals: [
          {
            userId: 'user-1',
            sessionId: 'session-1',
            signalType: 'page_viewed',
            createdAt: new Date().toISOString(),
          },
        ],
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.accepted).toBe(0);
    expect(data.rejected).toBe(1);
    expect(data.errors?.[0].reason).toBe('Missing or invalid id');
  });

  it('rejects signals with invalid signalType', async () => {
    const request = createRequest({
      batch: {
        signals: [
          {
            id: 'sig-1',
            userId: 'user-1',
            sessionId: 'session-1',
            signalType: 'invalid_type',
            createdAt: new Date().toISOString(),
          },
        ],
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.accepted).toBe(0);
    expect(data.rejected).toBe(1);
    expect(data.errors?.[0].reason).toContain('Invalid signalType');
  });

  it('handles mixed valid and invalid signals', async () => {
    const request = createRequest({
      batch: {
        signals: [
          {
            id: 'sig-1',
            userId: 'user-1',
            sessionId: 'session-1',
            signalType: 'page_viewed',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sig-2',
            // Missing userId
            sessionId: 'session-1',
            signalType: 'page_viewed',
            createdAt: new Date().toISOString(),
          },
        ],
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.accepted).toBe(1);
    expect(data.rejected).toBe(1);
  });

  it('returns 400 for invalid batch format', async () => {
    const request = createRequest({
      invalid: 'format',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.errors?.[0].reason).toBe('Invalid batch format');
  });

  it('accepts all valid signal types', async () => {
    const validTypes = [
      'task_started',
      'task_completed',
      'task_abandoned',
      'output_accepted',
      'output_rejected',
      'help_requested',
      'feature_discovered',
      'feature_ignored',
      'page_viewed',
      'widget_interacted',
      'persona_override',
      'progressive_question_answered',
      'progressive_question_skipped',
    ];

    const signals = validTypes.map((signalType, i) => ({
      id: `sig-${i}`,
      userId: 'user-1',
      sessionId: 'session-1',
      signalType,
      createdAt: new Date().toISOString(),
    }));

    const request = createRequest({
      batch: {
        signals,
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.accepted).toBe(validTypes.length);
    expect(data.rejected).toBe(0);
  });

  it('accepts signals with context', async () => {
    const request = createRequest({
      batch: {
        signals: [
          {
            id: 'sig-1',
            userId: 'user-1',
            sessionId: 'session-1',
            signalType: 'feature_discovered',
            context: {
              featureId: 'templates',
              featureName: 'Template Gallery',
            },
            createdAt: new Date().toISOString(),
          },
        ],
        batchId: 'batch-1',
        clientTimestamp: new Date().toISOString(),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.accepted).toBe(1);
  });
});

describe('GET /api/signals/batch', () => {
  it('returns stored signals', async () => {
    // First, add some signals
    await POST(
      createRequest({
        batch: {
          signals: [
            {
              id: 'sig-get-1',
              userId: 'user-get-1',
              sessionId: 'session-1',
              signalType: 'page_viewed',
              createdAt: new Date().toISOString(),
            },
          ],
          batchId: 'batch-get',
          clientTimestamp: new Date().toISOString(),
        },
      })
    );

    const request = new NextRequest(
      new URL('http://localhost:3000/api/signals/batch?userId=user-get-1')
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.signals.length).toBeGreaterThan(0);
  });

  it('filters by userId', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/signals/batch?userId=user-get-1')
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.signals.every((s: { userId: string }) => s.userId === 'user-get-1')).toBe(
      true
    );
  });

  it('respects limit parameter', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/signals/batch?limit=5')
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.returned).toBeLessThanOrEqual(5);
  });
});
