import { NextResponse } from 'next/server';
import { mockCalibrationHistory } from '@/lib/persona/capability-mock-data';

export async function GET() {
  return NextResponse.json(mockCalibrationHistory);
}
