/**
 * ReleaseReadinessPanel Component
 * P3 Executive approval checklist
 */

import React from 'react';
import { ReleaseReadiness, GateStatus } from '@/lib/api/testing';

export interface ReleaseReadinessPanelProps {
  readiness: ReleaseReadiness;
  onApprove?: () => void;
  currentUser?: string;
}

export const ReleaseReadinessPanel: React.FC<ReleaseReadinessPanelProps> = ({
  readiness,
  onApprove,
  currentUser,
}) => {
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: GateStatus['status']): string => {
    switch (status) {
      case 'OPEN':
        return 'text-green-600';
      case 'CLOSED':
        return 'text-red-600';
      case 'PENDING':
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: GateStatus['status']): string => {
    switch (status) {
      case 'OPEN':
        return '✓';
      case 'CLOSED':
        return '✗';
      case 'PENDING':
        return '○';
    }
  };

  const allGatesOpen = readiness.gates.every((g) => g.status === 'OPEN');

  return (
    <div className="p-4" data-testid="release-readiness-panel">
      <h3 className="text-lg font-semibold mb-4">Release Readiness</h3>

      {/* Overall status */}
      <div
        className={`p-4 rounded-lg mb-4 ${
          readiness.ready ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{readiness.ready ? '✓' : '✗'}</span>
          <div>
            <div className="font-semibold text-lg">
              {readiness.ready ? 'Ready for Release' : 'Not Ready for Release'}
            </div>
            <div className="text-sm opacity-75">
              {readiness.ready
                ? 'All gates passing, tests complete'
                : `${readiness.blockers.length} blocker(s) remaining`}
            </div>
          </div>
        </div>
      </div>

      {/* Gate checklist */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Gate Checklist</h4>
        <div className="space-y-2">
          {readiness.gates.map((gate) => (
            <div
              key={gate.name}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${getStatusColor(gate.status)}`}>
                  {getStatusIcon(gate.status)}
                </span>
                <span className="capitalize">{gate.name.replace(/-/g, ' ')}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  gate.status === 'OPEN'
                    ? 'bg-green-100 text-green-800'
                    : gate.status === 'CLOSED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {gate.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
          <h4 className="font-medium text-red-800 mb-2">Blockers</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {readiness.blockers.map((blocker, i) => (
              <li key={i}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Last regression info */}
      {readiness.lastFullRegression && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-1">Last Full Regression</h4>
          <div className="text-sm text-gray-600">
            <div>
              Result:{' '}
              <span
                className={
                  readiness.lastFullRegression.result === 'PASS'
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {readiness.lastFullRegression.result}
              </span>
            </div>
            <div>Tests: {readiness.lastFullRegression.testCount}</div>
            <div>Run at: {formatDate(readiness.lastFullRegression.timestamp)}</div>
          </div>
        </div>
      )}

      {/* Approval section */}
      {readiness.approvalRequired && (
        <div className="border-t pt-4">
          {readiness.approvedBy ? (
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-green-800 font-medium">Approved for Release</div>
              <div className="text-sm text-green-600">
                By {readiness.approvedBy} on {formatDate(readiness.approvedAt!)}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={onApprove}
                disabled={!readiness.ready || !allGatesOpen}
                className={`px-6 py-2 rounded-lg font-medium ${
                  readiness.ready && allGatesOpen
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                data-testid="approve-release-button"
              >
                {readiness.ready && allGatesOpen
                  ? 'Approve Release'
                  : 'Cannot Approve - Resolve Blockers'}
              </button>
              {currentUser && (
                <div className="text-xs text-gray-500 mt-2">Approving as: {currentUser}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReleaseReadinessPanel;
