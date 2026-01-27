import { NextRequest, NextResponse } from 'next/server';
import { policyStore } from '@/lib/governance/policy';
import { CreatePolicyRequest, Policy } from '@/lib/governance/types';

/**
 * GET /api/governance/policies
 * List all policies.
 */
export async function GET(request: NextRequest): Promise<NextResponse<Policy[]>> {
  const { searchParams } = new URL(request.url);
  const enabledOnly = searchParams.get('enabled') === 'true';

  const policies = enabledOnly
    ? await policyStore.getEnabled()
    : await policyStore.getAll();

  return NextResponse.json(policies);
}

/**
 * POST /api/governance/policies
 * Create a new policy.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreatePolicyRequest;

    // Validate required fields
    if (!body.name || !body.conditions || !body.actions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, conditions, actions' },
        { status: 400 }
      );
    }

    // Validate conditions structure
    if (!Array.isArray(body.conditions)) {
      return NextResponse.json(
        { error: 'conditions must be an array' },
        { status: 400 }
      );
    }

    for (const condition of body.conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return NextResponse.json(
          { error: 'Each condition must have field, operator, and value' },
          { status: 400 }
        );
      }
    }

    // Validate actions structure
    if (!Array.isArray(body.actions)) {
      return NextResponse.json(
        { error: 'actions must be an array' },
        { status: 400 }
      );
    }

    for (const action of body.actions) {
      if (!action.type) {
        return NextResponse.json(
          { error: 'Each action must have a type' },
          { status: 400 }
        );
      }
    }

    const policy = await policyStore.create(body);

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('[Governance] Failed to create policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}
