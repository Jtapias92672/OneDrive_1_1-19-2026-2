import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine, WorkflowType, WorkflowStatus } from '@/lib/governance/workflow';

/**
 * GET /api/governance/workflows
 * List workflows with optional filters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const filters: {
      userId?: string;
      status?: WorkflowStatus;
      type?: string;
      limit?: number;
      offset?: number;
    } = {};

    const userId = searchParams.get('userId');
    if (userId) {
      filters.userId = userId;
    }

    const status = searchParams.get('status');
    if (status) {
      filters.status = status as WorkflowStatus;
    }

    const type = searchParams.get('type');
    if (type) {
      filters.type = type;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    const workflows = await workflowEngine.list(filters);

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('[Workflows] Failed to list workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

interface StartWorkflowBody {
  type: WorkflowType;
  userId: string;
  input: Record<string, unknown>;
}

/**
 * POST /api/governance/workflows
 * Start a new workflow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StartWorkflowBody;

    if (!body.type || !['figma-to-code', 'ticket-to-pr', 'dependency-upgrade'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid or missing workflow type' },
        { status: 400 }
      );
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    const workflow = await workflowEngine.start(
      body.type,
      body.input || {},
      body.userId
    );

    console.log(
      `[Workflows] Started workflow ${workflow.id} (${workflow.type}), status: ${workflow.status}`
    );

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('[Workflows] Failed to start workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
  }
}
