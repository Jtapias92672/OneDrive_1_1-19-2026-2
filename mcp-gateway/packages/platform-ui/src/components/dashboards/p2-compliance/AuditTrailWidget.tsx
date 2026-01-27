'use client';

import { AuditSummary } from '@/lib/persona/compliance-types';

interface AuditTrailWidgetProps {
  summary: AuditSummary;
  onExport?: (format: 'csv' | 'json') => void;
  onViewFullTrail?: () => void;
}

export function AuditTrailWidget({
  summary,
  onExport,
  onViewFullTrail,
}: AuditTrailWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Audit Trail</h3>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <AuditIcon />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{summary.eventCount}</p>
            <p className="text-sm text-gray-500">events in last {summary.periodDays} days</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            {summary.exportFormats.map((format) => (
              <button
                key={format}
                onClick={() => onExport?.(format)}
                className="flex-1 text-sm text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
              >
                <DownloadIcon />
                Export {format.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={onViewFullTrail}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            View Full Trail →
          </button>
        </div>

        <p className="text-xs text-gray-400 flex items-center gap-1">
          <ClockIcon />
          Retention: {summary.retentionYears} years
        </p>
      </div>
    </div>
  );
}

function AuditIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
