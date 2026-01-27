import { NextResponse } from 'next/server';
import { mockExperimentalFeatures } from '@/lib/persona/capability-mock-data';

export async function GET() {
  return NextResponse.json(mockExperimentalFeatures);
}
