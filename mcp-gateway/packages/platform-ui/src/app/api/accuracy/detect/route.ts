/**
 * POST /api/accuracy/detect
 * Detect claims in content
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { claimDetector, ClaimCategory } from '@/lib/accuracy/claims';

interface DetectRequest {
  content: string;
  contentId?: string;
  category?: ClaimCategory;
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectRequest = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (body.content.length > 100000) {
      return NextResponse.json({ error: 'Content exceeds maximum length (100KB)' }, { status: 400 });
    }

    let result;

    if (body.category) {
      // Detect only specific category
      result = claimDetector.detectByCategory(body.content, body.category, body.contentId);
    } else {
      // Detect all categories
      result = claimDetector.detect(body.content, body.contentId);
    }

    return NextResponse.json({
      ...result,
      densityLevel: claimDetector.getDensityLevel(result.claimDensity),
    });
  } catch (error) {
    console.error('[ClaimDetection] Error:', error);
    return NextResponse.json({ error: 'Failed to detect claims' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/accuracy/detect',
    method: 'POST',
    description: 'Detect verifiable claims in content',
    requestBody: {
      content: 'string (required)',
      contentId: 'string (optional)',
      category: 'ClaimCategory (optional)',
    },
    categories: ['mathematical', 'scientific', 'temporal', 'quantitative', 'technical', 'factual'],
  });
}
