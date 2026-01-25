/**
 * FORGE Guardrails API
 *
 * GET /api/guardrails - Returns privacy filter metrics (DP-09/DP-10)
 *
 * These metrics track:
 * - DP-09: PII Recall (target ≥99%)
 * - DP-10: Secret Recall (target 100%)
 */

import { NextResponse } from 'next/server';
import type { Guardrail } from '@/lib/dashboard/types';

export interface GuardrailsResponse {
  dp09: Guardrail;
  dp10: Guardrail;
  lastSync: string;
}

// In-memory state (would connect to real privacy filter metrics in production)
let guardrailsState: GuardrailsResponse = {
  dp09: {
    name: 'PII Recall',
    target: 99,
    current: 100,
    status: 'pass',
    critical: true,
  },
  dp10: {
    name: 'Secret Recall',
    target: 100,
    current: 100,
    status: 'pass',
    critical: true,
  },
  lastSync: '2 min ago',
};

/**
 * Get mock guardrails based on demo mode
 */
function getMockGuardrails(demoMode: 'normal' | 'warning' | 'critical'): GuardrailsResponse {
  return {
    dp09: {
      name: 'PII Recall',
      target: 99,
      current: demoMode === 'critical' ? 97.1 : 99.2,
      status: demoMode === 'critical' ? 'fail' : 'pass',
      critical: true,
    },
    dp10: {
      name: 'Secret Recall',
      target: 100,
      current: demoMode === 'critical' ? 98.5 : 100,
      status: demoMode === 'critical' ? 'fail' : 'pass',
      critical: true,
    },
    lastSync: '2 min ago',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockGuardrails(demoMode));
  }

  return NextResponse.json({
    ...guardrailsState,
    _source: 'state',
  });
}

/**
 * POST /api/guardrails - Update guardrails state (for testing)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, guardrail, current } = body as {
      action: 'update' | 'reset' | 'simulate';
      guardrail?: 'dp09' | 'dp10';
      current?: number;
    };

    switch (action) {
      case 'update':
        if (guardrail && typeof current === 'number') {
          guardrailsState[guardrail].current = current;
          guardrailsState[guardrail].status =
            current >= guardrailsState[guardrail].target ? 'pass' : 'fail';
          guardrailsState.lastSync = 'just now';
        }
        break;
      case 'simulate':
        // Simulate a detection run
        guardrailsState.dp09.current = 99 + Math.random();
        guardrailsState.dp10.current = 99.5 + Math.random() * 0.5;
        guardrailsState.dp09.status = guardrailsState.dp09.current >= 99 ? 'pass' : 'fail';
        guardrailsState.dp10.status = guardrailsState.dp10.current >= 100 ? 'pass' : 'fail';
        guardrailsState.lastSync = 'just now';
        break;
      case 'reset':
        guardrailsState = {
          dp09: {
            name: 'PII Recall',
            target: 99,
            current: 100,
            status: 'pass',
            critical: true,
          },
          dp10: {
            name: 'Secret Recall',
            target: 100,
            current: 100,
            status: 'pass',
            critical: true,
          },
          lastSync: 'just now',
        };
        break;
    }

    return NextResponse.json(guardrailsState);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
