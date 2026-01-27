import { NextRequest, NextResponse } from 'next/server';
import { organizationStore, CreateExceptionRequest } from '@/lib/governance/organization';

/**
 * GET /api/governance/policy-exceptions
 * List policy exceptions
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const policyId = searchParams.get('policyId') ?? undefined;

    const exceptions = await organizationStore.listExceptions({
      status,
      policyId,
    });

    return NextResponse.json(exceptions);
  } catch (error) {
    console.error('[Organization] Failed to list exceptions:', error);
    return NextResponse.json(
      { error: 'Failed to list policy exceptions' },
      { status: 500 }
    );
  }
}

interface CreateExceptionBody {
  policyId: string;
  requesterId: string;
  requesterName?: string;
  reason: string;
  scope: string;
  durationDays: number;
}

/**
 * POST /api/governance/policy-exceptions
 * Request a policy exception
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateExceptionBody;

    if (!body.policyId || !body.requesterId) {
      return NextResponse.json(
        { error: 'Missing policyId or requesterId' },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid reason' },
        { status: 400 }
      );
    }

    if (!body.scope || typeof body.scope !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid scope' },
        { status: 400 }
      );
    }

    if (!body.durationDays || typeof body.durationDays !== 'number' || body.durationDays < 1) {
      return NextResponse.json(
        { error: 'Invalid durationDays (must be >= 1)' },
        { status: 400 }
      );
    }

    const exception = await organizationStore.createException(body);

    console.log(`[Organization] Exception requested by ${body.requesterId}: ${exception.id}`);

    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    console.error('[Organization] Failed to create exception:', error);
    return NextResponse.json(
      { error: 'Failed to create policy exception' },
      { status: 500 }
    );
  }
}
