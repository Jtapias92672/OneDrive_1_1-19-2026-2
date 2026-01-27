/**
 * POST /api/accuracy/complexity
 * Analyze task complexity
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { complexityAnalyzer } from '@/lib/accuracy/complexity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    if (description.length > 10000) {
      return NextResponse.json(
        { error: 'description exceeds maximum length of 10000' },
        { status: 400 }
      );
    }

    const result = complexityAnalyzer.analyze({
      description,
      fileCount: body.fileCount,
      linesChanged: body.linesChanged,
      dependencyCount: body.dependencyCount,
      isNewFeature: body.isNewFeature,
      affectsPublicApi: body.affectsPublicApi,
      hasSecurityImplications: body.hasSecurityImplications,
      requiresExternalData: body.requiresExternalData,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AnalyzeComplexity] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze complexity' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/accuracy/complexity',
    method: 'POST',
    description: 'Analyze task complexity using 5-factor scoring',
    factors: ['codeSize', 'dependencies', 'contextRequired', 'novelty', 'riskLevel'],
    levels: ['low', 'medium', 'high', 'extreme'],
    requiredFields: ['description'],
    optionalFields: [
      'fileCount',
      'linesChanged',
      'dependencyCount',
      'isNewFeature',
      'affectsPublicApi',
      'hasSecurityImplications',
      'requiresExternalData',
    ],
  });
}
