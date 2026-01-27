// GET, PATCH, DELETE /api/profiles/:userId
import { NextRequest, NextResponse } from 'next/server';
import { getProfile, updateProfile, deleteProfile } from '@/lib/persona/profile-service';
import { UpdateProfileRequest } from '@/lib/persona/types';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  const result = await getProfile(userId);

  if (!result) {
    return NextResponse.json(
      { error: `Profile not found for user ${userId}` },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  try {
    const body: UpdateProfileRequest = await request.json();
    const result = await updateProfile(userId, body);

    if (!result) {
      return NextResponse.json(
        { error: `Profile not found for user ${userId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  const deleted = await deleteProfile(userId);

  if (!deleted) {
    return NextResponse.json(
      { error: `Profile not found for user ${userId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
