// GET /api/onboarding/questions - Get question flow
import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingQuestions } from '@/lib/persona/onboarding-service';
import { PersonaType } from '@/lib/persona/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const track = searchParams.get('track') as PersonaType | null;

  const questions = getOnboardingQuestions(track || undefined);

  return NextResponse.json({
    questions,
    totalQuestions: 4,
    track: track || null,
  });
}
