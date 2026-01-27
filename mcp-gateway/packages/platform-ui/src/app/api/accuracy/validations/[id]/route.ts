/**
 * GET /api/accuracy/validations/:id
 * Get validation result by claim ID
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { validationStore } from '@/lib/accuracy/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Validation ID is required' }, { status: 400 });
    }

    const result = await validationStore.get(id);

    if (!result) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
    }

    return NextResponse.json({
      claimId: result.claimId,
      claim: {
        text: result.claim.text,
        category: result.claim.category,
        context: result.claim.context,
      },
      tier: result.tier,
      source: result.source,
      status: result.status,
      expectedValue: result.expectedValue,
      actualValue: result.actualValue,
      match: result.match,
      confidence: result.confidence,
      confidenceFactors: result.confidenceFactors,
      wolframUsed: result.wolframUsed,
      wolframCost: result.wolframCost,
      validatedAt: result.validatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[GetValidation] Error:', error);
    return NextResponse.json({ error: 'Failed to get validation' }, { status: 500 });
  }
}
