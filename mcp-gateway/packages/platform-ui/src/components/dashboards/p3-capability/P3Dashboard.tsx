'use client';

import { FrontierMap } from './FrontierMap';
import { TaskComplexityAnalyzer } from './TaskComplexityAnalyzer';
import { AccuracyChart } from './AccuracyChart';
import { RecentTasksWithConfidence } from './RecentTasksWithConfidence';
import { ExperimentalFeatures } from './ExperimentalFeatures';
import {
  FrontierMapData,
  CalibrationHistory,
  RecentTask,
  ExperimentalFeature,
  TaskAnalysisResult,
} from '@/lib/persona/capability-types';

interface P3DashboardProps {
  userName?: string;
  frontierMap: FrontierMapData;
  calibration: CalibrationHistory;
  recentTasks: RecentTask[];
  experimentalFeatures: ExperimentalFeature[];
  onAnalyzeTask?: (description: string) => Promise<TaskAnalysisResult>;
  onChangeDashboard?: () => void;
}

function getCalibrationText(calibration: CalibrationHistory): string {
  const levelLabels: Record<CalibrationHistory['calibrationLevel'], string> = {
    novice: 'Novice',
    intermediate: 'Intermediate',
    expert: 'Expert',
    master: 'Master',
  };
  return `${levelLabels[calibration.calibrationLevel]} (${calibration.currentAccuracy}% accuracy)`;
}

export function P3Dashboard({
  userName = 'User',
  frontierMap,
  calibration,
  recentTasks,
  experimentalFeatures,
  onAnalyzeTask,
  onChangeDashboard,
}: P3DashboardProps) {
  const calibrationText = getCalibrationText(calibration);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back, {userName}
              </h1>
              <p className="text-sm mt-1">
                <span className="text-gray-500">Your calibration: </span>
                <span className="font-medium text-purple-600">{calibrationText}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Dashboard: Capability</span>
              <button
                onClick={onChangeDashboard}
                className="text-purple-600 hover:text-purple-700"
              >
                [Change]
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Frontier Map - Full Width */}
        <div className="mb-6">
          <FrontierMap data={frontierMap} />
        </div>

        {/* Main Grid - 50/50 Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Task Complexity Analyzer */}
          <TaskComplexityAnalyzer onAnalyze={onAnalyzeTask} />

          {/* Accuracy Chart */}
          <AccuracyChart history={calibration} />
        </div>

        {/* Bottom Row - 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Tasks with Confidence */}
          <RecentTasksWithConfidence tasks={recentTasks} />

          {/* Experimental Features */}
          <ExperimentalFeatures features={experimentalFeatures} />
        </div>
      </main>
    </div>
  );
}
