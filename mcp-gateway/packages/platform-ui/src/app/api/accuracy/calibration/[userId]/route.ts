/**
 * GET/POST /api/accuracy/calibration/:userId
 * Get user calibration stats or create prediction
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { calibrationService } from '@/lib/accuracy/calibration';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const stats = calibrationService.getStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[GetCalibration] Error:', error);
    return NextResponse.json({ error: 'Failed to get calibration stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { taskId, taskType, predictedSuccess, predictedConfidence } = body;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (!taskType || typeof taskType !== 'string') {
      return NextResponse.json({ error: 'taskType is required' }, { status: 400 });
    }

    if (typeof predictedSuccess !== 'boolean') {
      return NextResponse.json({ error: 'predictedSuccess must be a boolean' }, { status: 400 });
    }

    if (
      typeof predictedConfidence !== 'number' ||
      predictedConfidence < 0 ||
      predictedConfidence > 100
    ) {
      return NextResponse.json(
        { error: 'predictedConfidence must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    const prediction = calibrationService.createPrediction(
      userId,
      taskId,
      taskType,
      predictedSuccess,
      predictedConfidence
    );

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error('[CreatePrediction] Error:', error);
    return NextResponse.json({ error: 'Failed to create prediction' }, { status: 500 });
  }
}
