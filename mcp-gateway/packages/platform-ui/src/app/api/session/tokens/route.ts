/**
 * FORGE Session Tokens API
 *
 * GET /api/session/tokens - Returns current token usage
 * POST /api/session/tokens - Update token counts
 */

import { NextResponse } from 'next/server';
import {
  getCurrentTokenUsage,
  getMockTokenUsage,
  addTokens,
  setTokens,
  resetSession,
  type TokenBreakdown,
} from '@/lib/token-tracker';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockTokenUsage(demoMode));
  }

  return NextResponse.json(getCurrentTokenUsage());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, category, count } = body as {
      action: 'add' | 'set' | 'reset';
      category?: keyof TokenBreakdown;
      count?: number;
    };

    switch (action) {
      case 'add':
        if (category && typeof count === 'number') {
          addTokens(category, count);
        }
        break;
      case 'set':
        if (category && typeof count === 'number') {
          setTokens(category, count);
        }
        break;
      case 'reset':
        resetSession();
        break;
    }

    return NextResponse.json(getCurrentTokenUsage());
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
