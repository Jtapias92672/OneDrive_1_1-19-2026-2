import { NextResponse } from 'next/server';
import { mockFrontierMap } from '@/lib/persona/capability-mock-data';

export async function GET() {
  return NextResponse.json(mockFrontierMap);
}
