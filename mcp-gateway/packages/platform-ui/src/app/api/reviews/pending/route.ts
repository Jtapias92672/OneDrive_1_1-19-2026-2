import { NextResponse } from 'next/server';
import { mockPendingReviews } from '@/lib/persona/compliance-mock-data';

export async function GET() {
  return NextResponse.json(mockPendingReviews);
}
