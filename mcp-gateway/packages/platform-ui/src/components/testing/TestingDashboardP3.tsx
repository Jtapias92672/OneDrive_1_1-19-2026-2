/**
 * TestingDashboardP3 Component
 * P3 Executive View - High-level quality metrics
 */

import React from 'react';
import { DashboardSummary } from '@/lib/api/testing';
import { TestMetricsChart } from './TestMetricsChart';
import { ReleaseReadinessPanel } from './ReleaseReadinessPanel';

export interface TestingDashboardP3Props {
  summary: DashboardSummary;
  onApproveRelease?: () => void;
  currentUser?: string;
}

export const TestingDashboardP3: React.FC<TestingDashboardP3Props> = ({
  summary,
  onApproveRelease,
  currentUser,
}) => {
  const getHealthIcon = (): string => {
    switch (summary.healthStatus) {
      case 'GREEN':
        return '🟢';
      case 'YELLOW':
        return '🟡';
      case 'RED':
        return '🔴';
    }
  };

  const getHealthLabel = (): string => {
    switch (summary.healthStatus) {
      case 'GREEN':
        return 'All Systems Healthy';
      case 'YELLOW':
        return 'Minor Issues Detected';
      case 'RED':
        return 'Critical Issues Present';
    }
  };

  return (
    <div className="p-6" data-testid="testing-dashboard-p3">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quality Overview</h1>
          <p className="text-gray-600">P3 Executive View</p>
        </div>
      </div>

      {/* Traffic Light Health Indicator */}
      <div
        className={`p-6 rounded-lg mb-6 ${
          summary.healthStatus === 'GREEN'
            ? 'bg-green-50 border border-green-200'
            : summary.healthStatus === 'YELLOW'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
        }`}
        data-testid="health-indicator"
      >
        <div className="flex items-center gap-4">
          <span className="text-5xl">{getHealthIcon()}</span>
          <div>
            <h2 className="text-2xl font-bold">{getHealthLabel()}</h2>
            <p className="text-gray-600">
              {summary.metrics.testCounts.total} tests |{' '}
              {summary.metrics.passRates.regression}% pass rate |{' '}
              {summary.metrics.coverage.overall}% coverage
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Key Metrics */}
        <div className="col-span-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {summary.metrics.testCounts.total}
              </div>
              <div className="text-sm text-gray-500">Total Tests</div>
              <div className="text-xs text-green-600 mt-1">
                +{summary.metrics.trends[summary.metrics.trends.length - 1].testCount -
                  summary.metrics.trends[0].testCount}{' '}
                this quarter
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  summary.metrics.passRates.regression >= 98
                    ? 'text-green-600'
                    : summary.metrics.passRates.regression >= 90
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {summary.metrics.passRates.regression}%
              </div>
              <div className="text-sm text-gray-500">Pass Rate</div>
              <div className="text-xs text-gray-400 mt-1">Target: 98%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  summary.metrics.coverage.overall >= 97
                    ? 'text-green-600'
                    : summary.metrics.coverage.overall >= 85
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {summary.metrics.coverage.overall}%
              </div>
              <div className="text-sm text-gray-500">Code Coverage</div>
              <div className="text-xs text-gray-400 mt-1">Target: 97%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {summary.gates.filter((g) => g.status === 'OPEN').length}/
                {summary.gates.length}
              </div>
              <div className="text-sm text-gray-500">Gates Open</div>
              <div className="text-xs text-gray-400 mt-1">All required for release</div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-lg shadow">
            <TestMetricsChart metrics={summary.metrics} showCoverage />
          </div>

          {/* Quality vs Targets */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">Quality vs Targets</h3>
            <div className="space-y-4">
              {[
                {
                  label: 'Regression Pass Rate',
                  current: summary.metrics.passRates.regression,
                  target: 98,
                },
                { label: 'Code Coverage', current: summary.metrics.coverage.overall, target: 97 },
                {
                  label: 'E2E Test Count',
                  current: summary.metrics.testCounts.e2e,
                  target: 50,
                  isCount: true,
                },
              ].map((metric) => {
                const pct = metric.isCount
                  ? (metric.current / metric.target) * 100
                  : (metric.current / metric.target) * 100;
                const achieved = pct >= 100;
                return (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{metric.label}</span>
                      <span className={achieved ? 'text-green-600' : 'text-yellow-600'}>
                        {metric.current}
                        {metric.isCount ? '' : '%'} / {metric.target}
                        {metric.isCount ? '' : '%'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${achieved ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Release Readiness */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow">
            <ReleaseReadinessPanel
              readiness={summary.releaseReadiness}
              onApprove={onApproveRelease}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingDashboardP3;
