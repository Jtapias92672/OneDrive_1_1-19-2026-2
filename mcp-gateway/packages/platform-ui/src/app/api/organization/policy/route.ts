import { NextResponse } from 'next/server';
import { mockOrganizationPolicy } from '@/lib/persona/compliance-mock-data';

export async function GET() {
  return NextResponse.json(mockOrganizationPolicy);
}
