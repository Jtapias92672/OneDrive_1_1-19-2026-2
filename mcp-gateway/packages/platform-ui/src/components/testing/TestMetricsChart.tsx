/**
 * TestMetricsChart Component
 * Sprint-over-sprint trends visualization
 */

import React from 'react';
import { TestMetrics } from '@/lib/api/testing';

export interface TestMetricsChartProps {
  metrics: TestMetrics;
  showCoverage?: boolean;
}

export const TestMetricsChart: React.FC<TestMetricsChartProps> = ({
  metrics,
  showCoverage = true,
}) => {
  const { trends } = metrics;
  const maxCount = Math.max(...trends.map((t) => t.testCount));

  const getBarHeight = (count: number): number => {
    return (count / maxCount) * 100;
  };

  const getPassRateColor = (rate: number): string => {
    if (rate >= 98) return 'bg-green-500';
    if (rate >= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4" data-testid="test-metrics-chart">
      <h3 className="text-lg font-semibold mb-4">Test Growth Trend</h3>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-40 mb-2">
        {trends.map((sprint, index) => (
          <div
            key={sprint.sprint}
            className="flex-1 flex flex-col items-center"
            data-testid={`trend-bar-${index}`}
          >
            <div className="w-full flex flex-col items-center justify-end h-32">
              <span className="text-xs text-gray-600 mb-1">{sprint.testCount}</span>
              <div
                className={`w-full ${getPassRateColor(sprint.passRate)} rounded-t transition-all`}
                style={{ height: `${getBarHeight(sprint.testCount)}%` }}
                title={`${sprint.testCount} tests, ${sprint.passRate}% pass rate`}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
              {sprint.sprint.replace('Sprint ', 'S')}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-gray-600 mt-4">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded" />
          <span>≥98% pass</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded" />
          <span>90-97% pass</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" />
          <span>&lt;90% pass</span>
        </div>
      </div>

      {/* Current metrics summary */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50 rounded text-center">
          <div className="text-xl font-bold text-blue-700">{metrics.testCounts.unit}</div>
          <div className="text-xs text-blue-600">Unit Tests</div>
        </div>
        <div className="p-3 bg-purple-50 rounded text-center">
          <div className="text-xl font-bold text-purple-700">{metrics.testCounts.e2e}</div>
          <div className="text-xs text-purple-600">E2E Tests</div>
        </div>
        <div className="p-3 bg-green-50 rounded text-center">
          <div className="text-xl font-bold text-green-700">{metrics.passRates.regression}%</div>
          <div className="text-xs text-green-600">Pass Rate</div>
        </div>
        {showCoverage && (
          <div className="p-3 bg-orange-50 rounded text-center">
            <div className="text-xl font-bold text-orange-700">{metrics.coverage.overall}%</div>
            <div className="text-xs text-orange-600">Coverage</div>
          </div>
        )}
      </div>

      {/* Growth indicator */}
      {trends.length >= 2 && (
        <div className="mt-4 text-center">
          {(() => {
            const growth = trends[trends.length - 1].testCount - trends[0].testCount;
            const pctGrowth = ((growth / trends[0].testCount) * 100).toFixed(0);
            return (
              <span className="text-sm text-gray-600">
                <span className="text-green-600 font-medium">+{growth}</span> tests (
                <span className="text-green-600">+{pctGrowth}%</span>) over {trends.length} sprints
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TestMetricsChart;
