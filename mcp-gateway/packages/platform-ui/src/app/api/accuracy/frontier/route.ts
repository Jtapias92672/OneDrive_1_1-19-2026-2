/**
 * GET /api/accuracy/frontier
 * Get all frontier zones
 * Epic 14: Computational Accuracy Layer
 */

import { NextResponse } from 'next/server';
import { frontierService } from '@/lib/accuracy/frontier';

export async function GET() {
  try {
    const zones = frontierService.getAllZones();
    const stats = frontierService.getStats();

    return NextResponse.json({
      zones,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GetFrontier] Error:', error);
    return NextResponse.json({ error: 'Failed to get frontier zones' }, { status: 500 });
  }
}
