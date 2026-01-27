// GET /api/metrics/reliability - P1 dashboard metrics
import { NextResponse } from 'next/server';
import { mockReliabilityMetrics } from '@/lib/persona/mock-data';

export async function GET() {
  // In production, fetch from database based on userId
  return NextResponse.json(mockReliabilityMetrics);
}
