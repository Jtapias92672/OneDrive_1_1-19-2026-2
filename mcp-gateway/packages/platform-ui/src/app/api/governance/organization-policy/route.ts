import { NextRequest, NextResponse } from 'next/server';
import { organizationStore, OrganizationPolicy } from '@/lib/governance/organization';

/**
 * GET /api/governance/organization-policy
 * Get current organization policy
 */
export async function GET(): Promise<NextResponse> {
  try {
    const policy = await organizationStore.getPolicy();
    return NextResponse.json(policy);
  } catch (error) {
    console.error('[Organization] Failed to get policy:', error);
    return NextResponse.json(
      { error: 'Failed to get organization policy' },
      { status: 500 }
    );
  }
}

interface UpdatePolicyRequest {
  updatedBy: string;
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  maxDataTier?: 1 | 2 | 3 | 4;
  requireApprovalForProduction?: boolean;
  requireEvidencePackForRelease?: boolean;
  auditRetentionDays?: number;
  frameworks?: Array<'SOC2' | 'CMMC' | 'HIPAA' | 'GDPR' | 'ISO27001' | 'FedRAMP'>;
}

/**
 * POST /api/governance/organization-policy
 * Update organization policy
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as UpdatePolicyRequest;

    if (!body.updatedBy || typeof body.updatedBy !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid updatedBy' },
        { status: 400 }
      );
    }

    const { updatedBy, ...updates } = body;

    const policy = await organizationStore.updatePolicy(updates, updatedBy);

    console.log(`[Organization] Policy updated by ${updatedBy}`);

    return NextResponse.json(policy);
  } catch (error) {
    console.error('[Organization] Failed to update policy:', error);
    return NextResponse.json(
      { error: 'Failed to update organization policy' },
      { status: 500 }
    );
  }
}
