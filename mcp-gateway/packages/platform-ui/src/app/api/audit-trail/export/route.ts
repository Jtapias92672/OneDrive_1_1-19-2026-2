import { NextRequest, NextResponse } from 'next/server';

// Mock audit events for export
const mockAuditEvents = [
  { timestamp: '2026-01-26T10:30:00Z', action: 'EVIDENCE_PACK_GENERATED', user: 'system', details: 'EP-2026-0126-001' },
  { timestamp: '2026-01-26T09:15:00Z', action: 'REVIEW_REQUESTED', user: 'user@example.com', details: 'Project Alpha' },
  { timestamp: '2026-01-25T14:20:00Z', action: 'POLICY_ACKNOWLEDGED', user: 'user@example.com', details: 'AI Usage Policy' },
  { timestamp: '2026-01-25T11:00:00Z', action: 'DATA_CLASSIFICATION_UPDATED', user: 'admin@example.com', details: 'Tier 3 → Tier 2' },
  { timestamp: '2026-01-24T16:45:00Z', action: 'EVIDENCE_PACK_GENERATED', user: 'system', details: 'EP-2026-0124-002' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  if (format === 'csv') {
    const headers = ['timestamp', 'action', 'user', 'details'];
    const rows = mockAuditEvents.map((event) =>
      headers.map((h) => event[h as keyof typeof event]).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="audit-trail.csv"',
      },
    });
  }

  return new NextResponse(JSON.stringify(mockAuditEvents, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="audit-trail.json"',
    },
  });
}
