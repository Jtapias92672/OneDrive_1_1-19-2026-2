// GET /api/profiles/:userId/export - GDPR data export
import { NextRequest, NextResponse } from 'next/server';
import { exportProfile } from '@/lib/persona/profile-service';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  const profile = await exportProfile(userId);

  if (!profile) {
    return NextResponse.json(
      { error: `Profile not found for user ${userId}` },
      { status: 404 }
    );
  }

  // Return as downloadable JSON
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="forge-profile-${userId}.json"`);

  return new NextResponse(JSON.stringify(profile, null, 2), {
    status: 200,
    headers,
  });
}
