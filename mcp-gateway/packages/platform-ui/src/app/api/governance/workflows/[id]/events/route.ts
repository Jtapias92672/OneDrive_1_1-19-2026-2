import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/lib/governance/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/governance/workflows/:id/events
 * Get audit events for a specific workflow
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const events = await auditLogger.getWorkflowEvents(id);

    return NextResponse.json(events);
  } catch (error) {
    console.error('[Workflows] Failed to get workflow events:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow events' },
      { status: 500 }
    );
  }
}
