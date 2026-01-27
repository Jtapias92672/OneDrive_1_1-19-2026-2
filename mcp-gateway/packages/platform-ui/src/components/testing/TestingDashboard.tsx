/**
 * TestingDashboard Component
 * Main container that routes between P2/P3 views based on persona
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DashboardSummary,
  SuiteDefinition,
  TestRunResult,
  testingService,
} from '@/lib/api/testing';
import { TestingDashboardP2 } from './TestingDashboardP2';
import { TestingDashboardP3 } from './TestingDashboardP3';

export type PersonaType = 'P2' | 'P3';

export interface TestingDashboardProps {
  initialPersona?: PersonaType;
  currentUser?: string;
  onPersonaChange?: (persona: PersonaType) => void;
}

export const TestingDashboard: React.FC<TestingDashboardProps> = ({
  initialPersona = 'P2',
  currentUser = 'system',
  onPersonaChange,
}) => {
  const [persona, setPersona] = useState<PersonaType>(initialPersona);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [suites, setSuites] = useState<SuiteDefinition[]>([]);
  const [runResults, setRunResults] = useState<Map<string, TestRunResult>>(new Map());
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = () => {
      setSummary(testingService.getDashboardSummary());
      setSuites(testingService.getSuites());
      setLoading(false);
    };
    loadData();

    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePersonaChange = (newPersona: PersonaType) => {
    setPersona(newPersona);
    onPersonaChange?.(newPersona);
  };

  const handleRunTests = useCallback((suite: SuiteDefinition) => {
    // Start the test run
    const result = testingService.startRun({ suite: suite.name });

    // Mark as running
    setRunningTests((prev) => new Set(prev).add(suite.name));
    setRunResults((prev) => new Map(prev).set(suite.name, result));

    // Poll for completion
    const pollInterval = setInterval(() => {
      const updatedRun = testingService.getRun(result.runId);
      if (updatedRun) {
        setRunResults((prev) => new Map(prev).set(suite.name, updatedRun));

        if (updatedRun.status === 'COMPLETE' || updatedRun.status === 'FAILED') {
          setRunningTests((prev) => {
            const next = new Set(prev);
            next.delete(suite.name);
            return next;
          });
          setSummary(testingService.getDashboardSummary());
          clearInterval(pollInterval);
        }
      }
    }, 200);
  }, []);

  const handleEvaluateGate = useCallback((gateName: string) => {
    testingService.evaluateGate(gateName);
    setSummary(testingService.getDashboardSummary());
  }, []);

  const handleGenerateEvidencePack = useCallback((runId: string) => {
    testingService.generateEvidencePack(runId);
    setSummary(testingService.getDashboardSummary());
  }, []);

  const handleApproveRelease = useCallback(() => {
    // In production, this would call an API
    console.log(`Release approved by ${currentUser}`);
    setSummary(testingService.getDashboardSummary());
  }, [currentUser]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div data-testid="testing-dashboard">
      {/* Persona Switcher */}
      <div className="bg-gray-100 border-b px-6 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => handlePersonaChange('P2')}
            className={`px-4 py-1 rounded text-sm font-medium ${
              persona === 'P2'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            data-testid="persona-p2-button"
          >
            P2 Compliance
          </button>
          <button
            onClick={() => handlePersonaChange('P3')}
            className={`px-4 py-1 rounded text-sm font-medium ${
              persona === 'P3'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            data-testid="persona-p3-button"
          >
            P3 Executive
          </button>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Dashboard Content */}
      {persona === 'P2' ? (
        <TestingDashboardP2
          summary={summary}
          suites={suites}
          runResults={runResults}
          runningTests={runningTests}
          onRunTests={handleRunTests}
          onEvaluateGate={handleEvaluateGate}
          onGenerateEvidencePack={handleGenerateEvidencePack}
        />
      ) : (
        <TestingDashboardP3
          summary={summary}
          onApproveRelease={handleApproveRelease}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default TestingDashboard;
