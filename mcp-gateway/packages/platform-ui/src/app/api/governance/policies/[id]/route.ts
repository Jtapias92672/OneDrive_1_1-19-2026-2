import { NextRequest, NextResponse } from 'next/server';
import { policyStore } from '@/lib/governance/policy';
import { UpdatePolicyRequest } from '@/lib/governance/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/governance/policies/:id
 * Get a single policy by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  const policy = await policyStore.getById(id);

  if (!policy) {
    return NextResponse.json(
      { error: 'Policy not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(policy);
}

/**
 * PATCH /api/governance/policies/:id
 * Update a policy.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body = (await request.json()) as UpdatePolicyRequest;

    // Validate conditions if provided
    if (body.conditions) {
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
    }

    // Validate actions if provided
    if (body.actions) {
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
    }

    const updated = await policyStore.update(id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Governance] Failed to update policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/governance/policies/:id
 * Delete a policy.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  const deleted = await policyStore.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Policy not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
