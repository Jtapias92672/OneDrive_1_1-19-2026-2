/**
 * GateStatusPanel Component
 * Displays compliance gate statuses with blockers
 */

import React from 'react';
import { GateStatus } from '@/lib/api/testing';

export interface GateStatusPanelProps {
  gates: GateStatus[];
  onEvaluateGate?: (gateName: string) => void;
  showDetails?: boolean;
}

export const GateStatusPanel: React.FC<GateStatusPanelProps> = ({
  gates,
  onEvaluateGate,
  showDetails = true,
}) => {
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

  const getStatusColor = (status: GateStatus['status']): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'CLOSED':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    }
  };

  const formatGateName = (name: string): string => {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openGates = gates.filter((g) => g.status === 'OPEN').length;
  const totalGates = gates.length;

  return (
    <div className="p-4" data-testid="gate-status-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Compliance Gates</h3>
        <span
          className={`px-2 py-1 rounded text-sm font-medium ${
            openGates === totalGates
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {openGates}/{totalGates} Open
        </span>
      </div>

      <div className="space-y-3">
        {gates.map((gate) => (
          <div
            key={gate.name}
            className={`border-l-4 rounded-r-lg p-3 ${getStatusColor(gate.status)}`}
            data-testid={`gate-${gate.name}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getStatusIcon(gate.status)}</span>
                <span className="font-medium">{formatGateName(gate.name)}</span>
              </div>
              {onEvaluateGate && (
                <button
                  onClick={() => onEvaluateGate(gate.name)}
                  className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/75"
                  data-testid={`evaluate-${gate.name}`}
                >
                  Re-evaluate
                </button>
              )}
            </div>

            {showDetails && (
              <>
                <div className="mt-2 flex flex-wrap gap-1">
                  {gate.requiredSuites.map((suite) => {
                    const passed = gate.passedSuites.includes(suite);
                    return (
                      <span
                        key={suite}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          passed ? 'bg-green-200' : 'bg-red-200'
                        }`}
                      >
                        {passed ? '✓' : '✗'} {suite}
                      </span>
                    );
                  })}
                </div>

                {gate.blockers && gate.blockers.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Blockers:</span>
                    <ul className="list-disc list-inside ml-2">
                      {gate.blockers.map((blocker, i) => (
                        <li key={i} className="text-xs">
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-2 text-xs opacity-75">
                  Last evaluated: {formatDate(gate.lastEvaluation)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GateStatusPanel;
