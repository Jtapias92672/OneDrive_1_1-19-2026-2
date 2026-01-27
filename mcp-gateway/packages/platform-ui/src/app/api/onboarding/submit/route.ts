// POST /api/onboarding/submit - Submit onboarding answers
import { NextRequest, NextResponse } from 'next/server';
import { submitOnboarding } from '@/lib/persona/onboarding-service';
import { SubmitOnboardingRequest } from '@/lib/persona/types';

export async function POST(request: NextRequest) {
  try {
    const body: SubmitOnboardingRequest = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!body.responses || !Array.isArray(body.responses)) {
      return NextResponse.json(
        { error: 'responses array is required' },
        { status: 400 }
      );
    }

    const result = await submitOnboarding(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
