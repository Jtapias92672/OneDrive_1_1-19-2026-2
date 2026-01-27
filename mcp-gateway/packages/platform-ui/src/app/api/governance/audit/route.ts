import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditQuery } from '@/lib/governance/audit';

/**
 * GET /api/governance/audit
 * Query audit events
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const query: AuditQuery = {};

    const startDate = searchParams.get('startDate');
    if (startDate) {
      query.startDate = new Date(startDate);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      query.endDate = new Date(endDate);
    }

    const actorId = searchParams.get('actorId');
    if (actorId) {
      query.actorId = actorId;
    }

    const actorType = searchParams.get('actorType');
    if (actorType && ['user', 'agent', 'system'].includes(actorType)) {
      query.actorType = actorType as 'user' | 'agent' | 'system';
    }

    const eventType = searchParams.get('eventType');
    if (eventType) {
      query.eventType = eventType as AuditQuery['eventType'];
    }

    const workflowId = searchParams.get('workflowId');
    if (workflowId) {
      query.workflowId = workflowId;
    }

    const riskLevel = searchParams.get('riskLevel');
    if (riskLevel && ['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
      query.riskLevel = riskLevel as 'low' | 'medium' | 'high' | 'critical';
    }

    const limit = searchParams.get('limit');
    if (limit) {
      query.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      query.offset = parseInt(offset, 10);
    }

    const events = await auditLogger.query(query);

    return NextResponse.json(events);
  } catch (error) {
    console.error('[Audit] Failed to query events:', error);
    return NextResponse.json(
      { error: 'Failed to query audit events' },
      { status: 500 }
    );
  }
}
