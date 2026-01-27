import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditQuery, AuditEvent } from '@/lib/governance/audit';

function eventsToCSV(events: AuditEvent[]): string {
  const headers = [
    'id',
    'eventType',
    'actorType',
    'actorId',
    'actorName',
    'action',
    'resourceType',
    'resourceId',
    'riskLevel',
    'workflowId',
    'createdAt',
  ];

  const rows = events.map((e) => [
    e.id,
    e.eventType,
    e.actor.type,
    e.actor.id,
    e.actor.name || '',
    e.action,
    e.resource?.type || '',
    e.resource?.id || '',
    e.riskLevel || '',
    e.workflowId || '',
    e.createdAt.toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csv;
}

/**
 * GET /api/governance/audit/export
 * Export audit events as CSV or JSON
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'csv' | 'json';

    const query: AuditQuery = {};

    const startDate = searchParams.get('startDate');
    if (startDate) {
      query.startDate = new Date(startDate);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      query.endDate = new Date(endDate);
    }

    const workflowId = searchParams.get('workflowId');
    if (workflowId) {
      query.workflowId = workflowId;
    }

    const exportData = await auditLogger.export(query, format);

    if (format === 'csv') {
      const csv = eventsToCSV(exportData.events);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('[Audit] Failed to export events:', error);
    return NextResponse.json(
      { error: 'Failed to export audit events' },
      { status: 500 }
    );
  }
}
