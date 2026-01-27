import { NextResponse } from 'next/server';
import { mockAuditSummary } from '@/lib/persona/compliance-mock-data';

export async function GET() {
  return NextResponse.json(mockAuditSummary);
}
