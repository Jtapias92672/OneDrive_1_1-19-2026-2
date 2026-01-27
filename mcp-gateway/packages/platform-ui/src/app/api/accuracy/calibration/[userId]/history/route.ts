/**
 * GET /api/accuracy/calibration/:userId/history
 * Get user's prediction history
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

    const history = calibrationService.getHistory(userId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('[GetCalibrationHistory] Error:', error);
    return NextResponse.json({ error: 'Failed to get calibration history' }, { status: 500 });
  }
}
