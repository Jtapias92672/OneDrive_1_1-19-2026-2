'use client';

import { useRouter } from 'next/navigation';
import { P3Dashboard } from '@/components/dashboards/p3-capability';
import { useP3Dashboard } from '@/hooks/useP3Dashboard';
import {
  mockFrontierMap,
  mockCalibrationHistory,
  mockRecentTasks,
  mockExperimentalFeatures,
} from '@/lib/persona/capability-mock-data';

export default function CapabilityDashboardPage() {
  const router = useRouter();
  const {
    frontierMap,
    calibration,
    recentTasks,
    experimentalFeatures,
    isLoading,
    error,
    analyzeTask,
  } = useP3Dashboard();

  // Use mock data as fallback during development
  const displayFrontierMap = frontierMap ?? mockFrontierMap;
  const displayCalibration = calibration ?? mockCalibrationHistory;
  const displayRecentTasks = recentTasks.length > 0 ? recentTasks : mockRecentTasks;
  const displayExperimentalFeatures =
    experimentalFeatures.length > 0 ? experimentalFeatures : mockExperimentalFeatures;

  const handleChangeDashboard = () => {
    router.push('/settings/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <P3Dashboard
      userName="User"
      frontierMap={displayFrontierMap}
      calibration={displayCalibration}
      recentTasks={displayRecentTasks}
      experimentalFeatures={displayExperimentalFeatures}
      onAnalyzeTask={analyzeTask}
      onChangeDashboard={handleChangeDashboard}
    />
  );
}
