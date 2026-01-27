import { NextRequest, NextResponse } from 'next/server';
import { carsAssessor, CARSContext, CARSAction } from '@/lib/governance/cars';

interface AssessRequest {
  context: CARSContext;
  action: CARSAction;
}

function validateContext(context: unknown): context is CARSContext {
  if (!context || typeof context !== 'object') return false;
  const c = context as Record<string, unknown>;

  const validEnvironments = ['development', 'staging', 'production'];
  const validScopes = ['single-file', 'multiple-files', 'system-wide'];

  return (
    validEnvironments.includes(c.environment as string) &&
    typeof c.dataClassification === 'number' &&
    c.dataClassification >= 1 &&
    c.dataClassification <= 4 &&
    validScopes.includes(c.scope as string) &&
    typeof c.userId === 'string' &&
    typeof c.workflowType === 'string'
  );
}

function validateAction(action: unknown): action is CARSAction {
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown>;

  const validImpacts = ['low', 'medium', 'high'];

  return (
    typeof a.type === 'string' &&
    typeof a.target === 'string' &&
    typeof a.reversible === 'boolean' &&
    validImpacts.includes(a.estimatedImpact as string)
  );
}

/**
 * POST /api/governance/cars/assess
 * Run CARS risk assessment
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as AssessRequest;

    if (!validateContext(body.context)) {
      return NextResponse.json(
        { error: 'Invalid context. Required: environment, dataClassification (1-4), scope, userId, workflowType' },
        { status: 400 }
      );
    }

    if (!validateAction(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Required: type, target, reversible, estimatedImpact' },
        { status: 400 }
      );
    }

    const assessment = carsAssessor.assess(body.context, body.action);

    console.log(
      `[CARS] Assessment ${assessment.id}: risk=${assessment.risk.level} score=${assessment.risk.score}`
    );

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('[CARS] Assessment failed:', error);
    return NextResponse.json(
      { error: 'Failed to perform CARS assessment' },
      { status: 500 }
    );
  }
}
