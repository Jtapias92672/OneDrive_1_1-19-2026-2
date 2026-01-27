import { NextResponse } from 'next/server';
import { auditLogger } from '@/lib/governance/audit';

/**
 * GET /api/governance/audit/verify
 * Verify hash chain integrity
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await auditLogger.verifyIntegrity();

    return NextResponse.json({
      integrity: result.valid ? 'verified' : 'broken',
      ...result,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Audit] Failed to verify integrity:', error);
    return NextResponse.json(
      { error: 'Failed to verify audit integrity' },
      { status: 500 }
    );
  }
}
