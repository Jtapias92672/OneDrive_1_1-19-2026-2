/**
 * AuditTrailTable Component
 * Execution history for DCMA compliance
 */

import React from 'react';
import { AuditTrailEntry } from '@/lib/api/testing';

export interface AuditTrailTableProps {
  entries: AuditTrailEntry[];
  onGenerateEvidencePack?: (runId: string) => void;
  maxRows?: number;
}

export const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  entries,
  onGenerateEvidencePack,
  maxRows = 20,
}) => {
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const displayEntries = entries.slice(0, maxRows);

  return (
    <div className="p-4" data-testid="audit-trail-table">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <span className="text-sm text-gray-500">{entries.length} entries</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No test runs recorded yet. Run a test suite to see history.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Timestamp</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Suite</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Result</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Tests</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Duration</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Triggered By</th>
                {onGenerateEvidencePack && (
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Evidence</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  data-testid={`audit-row-${entry.id}`}
                >
                  <td className="py-2 px-2 text-gray-600">{formatDate(entry.timestamp)}</td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                      {entry.suite}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        entry.result === 'PASS'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.result}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {entry.details ? (
                      <span>
                        <span className="text-green-600">{entry.details.passed}</span>
                        {entry.details.failed > 0 && (
                          <span className="text-red-600">/{entry.details.failed}</span>
                        )}
                      </span>
                    ) : (
                      entry.testCount
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-600">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{entry.triggeredBy}</td>
                  {onGenerateEvidencePack && (
                    <td className="py-2 px-2 text-center">
                      {entry.evidencePackId ? (
                        <span className="text-green-600" title={entry.evidencePackId}>
                          ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => onGenerateEvidencePack(entry.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {entries.length > maxRows && (
            <div className="mt-2 text-center text-sm text-gray-500">
              Showing {maxRows} of {entries.length} entries
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditTrailTable;
