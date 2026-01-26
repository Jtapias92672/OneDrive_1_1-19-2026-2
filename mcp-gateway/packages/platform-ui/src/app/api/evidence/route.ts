/**
 * FORGE Evidence Packs API
 *
 * GET /api/evidence - Returns evidence packs summary
 */

import { NextResponse } from 'next/server';
import { getMockEvidencePacksSummary } from '@/lib/parsers/evidence-parser';
import { getEvidencePacksSummary } from '@/lib/parsers/evidence-parser.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockEvidencePacksSummary(demoMode));
  }

  try {
    // Use cwd as base path, will search multiple locations
    const summary = await getEvidencePacksSummary(process.cwd());
    return NextResponse.json({
      ...summary,
      _source: 'filesystem',
    });
  } catch (error) {
    console.error('Failed to read evidence packs:', error);
    return NextResponse.json({
      ...getMockEvidencePacksSummary(demoMode),
      _error: String(error),
      _fallback: true,
    });
  }
}
