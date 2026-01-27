/**
 * TestPyramidVisualization Component
 * Visual representation of the testing pyramid with counts
 */

import React from 'react';
import { TestMetrics } from '@/lib/api/testing';

export interface TestPyramidVisualizationProps {
  metrics: TestMetrics;
  showTiming?: boolean;
}

interface PyramidLevel {
  name: string;
  count: number;
  passRate: number;
  color: string;
  width: string;
  timing?: number;
}

export const TestPyramidVisualization: React.FC<TestPyramidVisualizationProps> = ({
  metrics,
  showTiming = false,
}) => {
  const levels: PyramidLevel[] = [
    {
      name: 'E2E',
      count: metrics.testCounts.e2e,
      passRate: metrics.passRates.e2e,
      color: 'bg-purple-500',
      width: 'w-1/3',
      timing: metrics.timing.regression,
    },
    {
      name: 'Story',
      count: metrics.testCounts.story,
      passRate: metrics.passRates.story,
      color: 'bg-blue-500',
      width: 'w-2/3',
    },
    {
      name: 'Unit',
      count: metrics.testCounts.unit,
      passRate: metrics.passRates.unit,
      color: 'bg-green-500',
      width: 'w-full',
    },
  ];

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPassRateColor = (rate: number): string => {
    if (rate >= 98) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4" data-testid="test-pyramid">
      <h3 className="text-lg font-semibold mb-4 text-center">Testing Pyramid</h3>

      <div className="flex flex-col items-center gap-2">
        {levels.map((level, index) => (
          <div
            key={level.name}
            className={`${level.width} ${level.color} rounded-t-lg py-3 px-4 text-white text-center transition-all hover:opacity-90`}
            style={{ marginTop: index === 0 ? 0 : -4 }}
            data-testid={`pyramid-level-${level.name.toLowerCase()}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{level.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm opacity-90">{level.count} tests</span>
                <span className={`text-sm font-bold ${level.passRate === 100 ? '' : 'text-yellow-200'}`}>
                  {level.passRate}%
                </span>
                {showTiming && level.timing && (
                  <span className="text-xs opacity-75">{formatDuration(level.timing)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subsets legend */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">E2E Subsets</h4>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-400 rounded-full" />
            <span>Smoke (critical paths)</span>
            <span className="text-gray-500">{formatDuration(metrics.timing.smoke)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 rounded-full" />
            <span>Sanity (major components)</span>
            <span className="text-gray-500">{formatDuration(metrics.timing.sanity)}</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-2 bg-gray-100 rounded">
          <div className="text-2xl font-bold">{metrics.testCounts.total}</div>
          <div className="text-xs text-gray-500">Total Tests</div>
        </div>
        <div className="p-2 bg-gray-100 rounded">
          <div className={`text-2xl font-bold ${getPassRateColor(metrics.passRates.regression)}`}>
            {metrics.passRates.regression}%
          </div>
          <div className="text-xs text-gray-500">Regression Pass</div>
        </div>
        <div className="p-2 bg-gray-100 rounded">
          <div className="text-2xl font-bold">{metrics.coverage.overall}%</div>
          <div className="text-xs text-gray-500">Coverage</div>
        </div>
      </div>
    </div>
  );
};

export default TestPyramidVisualization;
