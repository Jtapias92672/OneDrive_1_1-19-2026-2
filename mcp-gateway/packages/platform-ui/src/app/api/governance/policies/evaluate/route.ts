import { NextRequest, NextResponse } from 'next/server';
import { policyEngine } from '@/lib/governance/policy';
import {
  EvaluatePoliciesRequest,
  EvaluatePoliciesResponse,
  PolicyContext,
} from '@/lib/governance/types';

/**
 * POST /api/governance/policies/evaluate
 * Evaluate policies against a given context.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as EvaluatePoliciesRequest;

    if (!body.context || typeof body.context !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid context' },
        { status: 400 }
      );
    }

    const context: PolicyContext = body.context;

    // Evaluate policies
    const evaluation = await policyEngine.evaluate(context);

    // Generate audit event ID (in production, this would be stored)
    const auditEventId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log evaluation
    console.log(
      `[PolicyEvaluation] ${evaluation.matchedPolicies.length} policies matched, ` +
      `allowed: ${evaluation.allowed}, requiresApproval: ${evaluation.requiresApproval}`
    );

    const response: EvaluatePoliciesResponse = {
      evaluation,
      auditEventId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Governance] Failed to evaluate policies:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate policies' },
      { status: 500 }
    );
  }
}
