/**
 * TestSuiteCard Component
 * Displays individual test suite status with run controls
 */

import React from 'react';
import { SuiteDefinition, TestRunResult } from '@/lib/api/testing';

export interface TestSuiteCardProps {
  suite: SuiteDefinition;
  lastRun?: TestRunResult;
  onRunTests: (suite: SuiteDefinition) => void;
  isRunning?: boolean;
}

export const TestSuiteCard: React.FC<TestSuiteCardProps> = ({
  suite,
  lastRun,
  onRunTests,
  isRunning = false,
}) => {
  const getStatusColor = (): string => {
    if (isRunning) return 'bg-blue-100 border-blue-500';
    if (!lastRun) return 'bg-gray-100 border-gray-300';
    if (lastRun.status === 'COMPLETE') return 'bg-green-100 border-green-500';
    if (lastRun.status === 'FAILED') return 'bg-red-100 border-red-500';
    return 'bg-yellow-100 border-yellow-500';
  };

  const getStatusIcon = (): string => {
    if (isRunning) return '⏳';
    if (!lastRun) return '○';
    if (lastRun.status === 'COMPLETE') return '✓';
    if (lastRun.status === 'FAILED') return '✗';
    return '●';
  };

  const getLayerBadge = (): string => {
    switch (suite.layer) {
      case 'unit':
        return 'Unit';
      case 'integration':
        return 'Story';
      case 'e2e':
        return 'E2E';
      default:
        return suite.layer;
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 ${getStatusColor()}`}
      data-testid={`suite-card-${suite.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" data-testid="status-icon">
            {getStatusIcon()}
          </span>
          <div>
            <h3 className="font-semibold text-lg capitalize">{suite.name}</h3>
            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">{getLayerBadge()}</span>
          </div>
        </div>
        <button
          onClick={() => onRunTests(suite)}
          disabled={isRunning}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isRunning
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          data-testid="run-button"
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>

      <p className="text-sm text-gray-600 mt-2">{suite.description}</p>

      <div className="mt-3 flex gap-4 text-sm">
        <div>
          <span className="text-gray-500">Tests:</span>{' '}
          <span className="font-medium">{suite.testCount}</span>
        </div>
        <div>
          <span className="text-gray-500">Est:</span>{' '}
          <span className="font-medium">{formatDuration(suite.estimatedDuration)}</span>
        </div>
      </div>

      {lastRun && lastRun.results && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">✓ {lastRun.results.passed}</span>
            <span className="text-red-600">✗ {lastRun.results.failed}</span>
            {lastRun.results.skipped > 0 && (
              <span className="text-gray-500">○ {lastRun.results.skipped}</span>
            )}
            {lastRun.duration && (
              <span className="text-gray-500 ml-auto">{formatDuration(lastRun.duration)}</span>
            )}
          </div>
        </div>
      )}

      {suite.tags && suite.tags.length > 0 && (
        <div className="mt-2 flex gap-1">
          {suite.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded"
            >
              @{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestSuiteCard;
