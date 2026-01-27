import { NextResponse } from 'next/server';
import { mockEvidencePacks } from '@/lib/persona/compliance-mock-data';

export async function GET() {
  return NextResponse.json(mockEvidencePacks);
}
