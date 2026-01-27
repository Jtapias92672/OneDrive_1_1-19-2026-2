/**
 * GET /api/accuracy/confidence/:contentId
 * Get confidence score for content
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { validationStore } from '@/lib/accuracy/validation';
import { confidenceCalculator } from '@/lib/accuracy/confidence';

interface RouteParams {
  params: Promise<{ contentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { contentId } = await params;

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    const validation = await validationStore.getContentValidation(contentId);

    if (!validation) {
      return NextResponse.json({ error: 'Content validation not found' }, { status: 404 });
    }

    const confidence = validation.confidence;

    return NextResponse.json({
      contentId: confidence.contentId,
      overallScore: confidence.overallScore,
      level: confidence.level,
      label: confidenceCalculator.getLabel(confidence.overallScore),
      color: confidenceCalculator.getColor(confidence.overallScore),
      hexColor: confidenceCalculator.getHexColor(confidence.overallScore),
      claimCount: confidence.claimCount,
      verifiedCount: confidence.verifiedCount,
      unverifiedCount: confidence.unverifiedCount,
      failedCount: confidence.failedCount,
      categoryScores: confidence.categoryScores,
      factors: confidence.factors,
    });
  } catch (error) {
    console.error('[GetConfidence] Error:', error);
    return NextResponse.json({ error: 'Failed to get confidence' }, { status: 500 });
  }
}
