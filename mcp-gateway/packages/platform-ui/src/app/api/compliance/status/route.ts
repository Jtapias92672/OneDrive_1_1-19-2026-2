import { NextResponse } from 'next/server';
import { mockComplianceStatus, mockDataTiers } from '@/lib/persona/compliance-mock-data';

export async function GET() {
  return NextResponse.json({
    status: mockComplianceStatus,
    dataTiers: mockDataTiers,
  });
}
