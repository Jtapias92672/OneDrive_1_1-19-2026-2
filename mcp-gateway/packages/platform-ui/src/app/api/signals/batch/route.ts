import { NextRequest, NextResponse } from 'next/server';
import {
  IngestSignalsRequest,
  IngestSignalsResponse,
  BehaviorSignal,
  SignalType,
} from '@/lib/persona/types';

// Valid signal types for validation
const VALID_SIGNAL_TYPES: SignalType[] = [
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

// In-memory storage for development (replace with PostgreSQL in production)
const signalStore: BehaviorSignal[] = [];

/**
 * Validate a single signal against the BehaviorSignal schema.
 */
function validateSignal(signal: unknown): { valid: boolean; reason?: string } {
  if (!signal || typeof signal !== 'object') {
    return { valid: false, reason: 'Invalid signal object' };
  }

  const s = signal as Record<string, unknown>;

  if (typeof s.id !== 'string' || !s.id) {
    return { valid: false, reason: 'Missing or invalid id' };
  }

  if (typeof s.userId !== 'string' || !s.userId) {
    return { valid: false, reason: 'Missing or invalid userId' };
  }

  if (typeof s.sessionId !== 'string' || !s.sessionId) {
    return { valid: false, reason: 'Missing or invalid sessionId' };
  }

  if (!VALID_SIGNAL_TYPES.includes(s.signalType as SignalType)) {
    return { valid: false, reason: `Invalid signalType: ${s.signalType}` };
  }

  if (s.context !== undefined && typeof s.context !== 'object') {
    return { valid: false, reason: 'Invalid context (must be object)' };
  }

  return { valid: true };
}

/**
 * POST /api/signals/batch
 * Receive and store a batch of behavioral signals.
 */
export async function POST(request: NextRequest): Promise<NextResponse<IngestSignalsResponse>> {
  try {
    const body = (await request.json()) as IngestSignalsRequest;

    if (!body.batch || !Array.isArray(body.batch.signals)) {
      return NextResponse.json(
        {
          accepted: 0,
          rejected: 0,
          errors: [{ signalId: 'batch', reason: 'Invalid batch format' }],
        },
        { status: 400 }
      );
    }

    const { signals, batchId } = body.batch;
    let accepted = 0;
    let rejected = 0;
    const errors: { signalId: string; reason: string }[] = [];

    for (const signal of signals) {
      const validation = validateSignal(signal);

      if (validation.valid) {
        // Store signal (async, non-blocking in production)
        signalStore.push({
          ...signal,
          createdAt: new Date(signal.createdAt),
        } as BehaviorSignal);
        accepted++;
      } else {
        rejected++;
        errors.push({
          signalId: (signal as { id?: string })?.id || 'unknown',
          reason: validation.reason || 'Validation failed',
        });
      }
    }

    console.log(
      `[SignalIngestion] Batch ${batchId}: ${accepted} accepted, ${rejected} rejected`
    );

    return NextResponse.json({
      accepted,
      rejected,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[SignalIngestion] Error processing batch:', error);
    return NextResponse.json(
      {
        accepted: 0,
        rejected: 0,
        errors: [{ signalId: 'batch', reason: 'Internal server error' }],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/batch
 * Retrieve stored signals (for development/testing only).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const signalType = searchParams.get('signalType');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  let filtered = [...signalStore];

  if (userId) {
    filtered = filtered.filter((s) => s.userId === userId);
  }

  if (signalType) {
    filtered = filtered.filter((s) => s.signalType === signalType);
  }

  // Return most recent first, limited
  const result = filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return NextResponse.json({
    signals: result,
    total: filtered.length,
    returned: result.length,
  });
}
