/**
 * GET/PATCH /api/accuracy/calibration/prediction/:id
 * Get or resolve a prediction
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { calibrationService } from '@/lib/accuracy/calibration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
    }

    const prediction = calibrationService.getPrediction(id);

    if (!prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('[GetPrediction] Error:', error);
    return NextResponse.json({ error: 'Failed to get prediction' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
    }

    const { actualSuccess, actualConfidence } = body;

    if (typeof actualSuccess !== 'boolean') {
      return NextResponse.json({ error: 'actualSuccess must be a boolean' }, { status: 400 });
    }

    const prediction = calibrationService.resolvePrediction(id, actualSuccess, actualConfidence);

    return NextResponse.json(prediction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve prediction';
    console.error('[ResolvePrediction] Error:', error);

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
