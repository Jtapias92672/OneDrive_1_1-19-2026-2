import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/governance/workflow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CancelRequest {
  userId: string;
}

/**
 * POST /api/governance/workflows/:id/cancel
 * Cancel a workflow
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CancelRequest;

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    const workflow = await workflowEngine.cancel(id, body.userId);

    console.log(`[Workflows] Cancelled workflow ${id} by ${body.userId}`);

    return NextResponse.json(workflow);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Workflows] Failed to cancel workflow:', message);

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('Cannot cancel')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}
