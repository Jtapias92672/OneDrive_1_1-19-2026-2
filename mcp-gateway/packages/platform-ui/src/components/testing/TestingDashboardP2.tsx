/**
 * TestingDashboardP2 Component
 * P2 Compliance Officer View - Detailed test suite health
 */

import React from 'react';
import { DashboardSummary, SuiteDefinition, TestRunResult } from '@/lib/api/testing';
import { TestSuiteCard } from './TestSuiteCard';
import { GateStatusPanel } from './GateStatusPanel';
import { AuditTrailTable } from './AuditTrailTable';
import { TestPyramidVisualization } from './TestPyramidVisualization';

export interface TestingDashboardP2Props {
  summary: DashboardSummary;
  suites: SuiteDefinition[];
  runResults: Map<string, TestRunResult>;
  runningTests: Set<string>;
  onRunTests: (suite: SuiteDefinition) => void;
  onEvaluateGate: (gateName: string) => void;
  onGenerateEvidencePack: (runId: string) => void;
}

export const TestingDashboardP2: React.FC<TestingDashboardP2Props> = ({
  summary,
  suites,
  runResults,
  runningTests,
  onRunTests,
  onEvaluateGate,
  onGenerateEvidencePack,
}) => {
  return (
    <div className="p-6" data-testid="testing-dashboard-p2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Testing Dashboard</h1>
          <p className="text-gray-600">P2 Compliance Officer View</p>
        </div>
        <div
          className={`px-4 py-2 rounded-lg font-medium ${
            summary.healthStatus === 'GREEN'
              ? 'bg-green-100 text-green-800'
              : summary.healthStatus === 'YELLOW'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          Health: {summary.healthStatus}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Test suites and pyramid */}
        <div className="col-span-8 space-y-6">
          {/* Test Suites */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Test Suites</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {suites.map((suite) => (
                <TestSuiteCard
                  key={suite.name}
                  suite={suite}
                  lastRun={runResults.get(suite.name)}
                  isRunning={runningTests.has(suite.name)}
                  onRunTests={onRunTests}
                />
              ))}
            </div>
          </div>

          {/* Test Pyramid */}
          <div className="bg-white rounded-lg shadow">
            <TestPyramidVisualization metrics={summary.metrics} showTiming />
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-lg shadow">
            <AuditTrailTable
              entries={summary.recentRuns}
              onGenerateEvidencePack={onGenerateEvidencePack}
              maxRows={10}
            />
          </div>
        </div>

        {/* Right column - Gates */}
        <div className="col-span-4 space-y-6">
          {/* Compliance Gates */}
          <div className="bg-white rounded-lg shadow">
            <GateStatusPanel
              gates={summary.gates}
              onEvaluateGate={onEvaluateGate}
              showDetails
            />
          </div>

          {/* Active Runs */}
          {summary.activeRuns.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Active Runs</h3>
              <div className="space-y-2">
                {summary.activeRuns.map((run) => (
                  <div
                    key={run.runId}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded"
                  >
                    <span className="capitalize">{run.suite}</span>
                    <span className="text-sm text-blue-600">
                      {run.status === 'QUEUED' ? 'Queued' : 'Running...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const regressionSuite = suites.find((s) => s.name === 'regression');
                  if (regressionSuite) onRunTests(regressionSuite);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Run Full Regression
              </button>
              <button
                onClick={() => {
                  const smokeSuite = suites.find((s) => s.name === 'smoke');
                  if (smokeSuite) onRunTests(smokeSuite);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Run Smoke Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingDashboardP2;
