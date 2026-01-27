// POST /api/profiles - Create new profile
import { NextRequest, NextResponse } from 'next/server';
import { createProfile } from '@/lib/persona/profile-service';
import { CreateProfileRequest } from '@/lib/persona/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateProfileRequest = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await createProfile(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
