import { NextRequest, NextResponse } from 'next/server';
import { approvalService } from '@/lib/governance/approval';
import { carsAssessor } from '@/lib/governance/cars';

/**
 * GET /api/governance/approvals
 * List approval requests with optional filters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const approverId = searchParams.get('approverId') ?? undefined;

    let approvals;
    if (approverId && status === 'pending') {
      approvals = await approvalService.getPending(approverId);
    } else if (status) {
      approvals = await approvalService.getAll(status);
    } else {
      approvals = await approvalService.getAll();
    }

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('[Approvals] Failed to list approvals:', error);
    return NextResponse.json(
      { error: 'Failed to list approvals' },
      { status: 500 }
    );
  }
}

interface CreateApprovalBody {
  context: {
    environment: 'development' | 'staging' | 'production';
    dataClassification: 1 | 2 | 3 | 4;
    scope: 'single-file' | 'multiple-files' | 'system-wide';
    userId: string;
    workflowType: string;
  };
  action: {
    type: string;
    target: string;
    reversible: boolean;
    estimatedImpact: 'low' | 'medium' | 'high';
  };
  summary: string;
  details?: string;
  artifacts?: Array<{
    type: 'code' | 'config' | 'data' | 'document';
    name: string;
    url?: string;
    preview?: string;
  }>;
  workflowId?: string;
}

/**
 * POST /api/governance/approvals
 * Create a new approval request
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateApprovalBody;

    if (!body.context || !body.action) {
      return NextResponse.json(
        { error: 'Missing context or action' },
        { status: 400 }
      );
    }

    if (!body.summary || typeof body.summary !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid summary' },
        { status: 400 }
      );
    }

    // Run CARS assessment first
    const carsAssessment = carsAssessor.assess(body.context, body.action);

    // Create approval request
    const approval = await approvalService.createRequest({
      carsAssessment,
      summary: body.summary,
      details: body.details,
      artifacts: body.artifacts,
      workflowId: body.workflowId,
    });

    console.log(
      `[Approvals] Created request ${approval.id} for risk=${approval.riskLevel}`
    );

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error('[Approvals] Failed to create approval:', error);
    return NextResponse.json(
      { error: 'Failed to create approval request' },
      { status: 500 }
    );
  }
}
