import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/governance/workflow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/governance/workflows/:id
 * Get workflow details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const workflow = await workflowEngine.getById(id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('[Workflows] Failed to get workflow:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    );
  }
}
