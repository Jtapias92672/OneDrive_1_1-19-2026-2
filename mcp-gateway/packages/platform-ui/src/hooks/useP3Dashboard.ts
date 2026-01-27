'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FrontierMapData,
  CalibrationHistory,
  RecentTask,
  ExperimentalFeature,
  TaskAnalysisResult,
} from '@/lib/persona/capability-types';

interface P3DashboardData {
  frontierMap: FrontierMapData | null;
  calibration: CalibrationHistory | null;
  recentTasks: RecentTask[];
  experimentalFeatures: ExperimentalFeature[];
  isLoading: boolean;
  error: string | null;
}

interface UseP3DashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useP3Dashboard(options: UseP3DashboardOptions = {}): P3DashboardData & {
  refresh: () => Promise<void>;
  analyzeTask: (description: string) => Promise<TaskAnalysisResult>;
} {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const [data, setData] = useState<P3DashboardData>({
    frontierMap: null,
    calibration: null,
    recentTasks: [],
    experimentalFeatures: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const [mapRes, calibrationRes, tasksRes, featuresRes] = await Promise.all([
        fetch('/api/frontier/map'),
        fetch('/api/calibration/history'),
        fetch('/api/tasks/recent'),
        fetch('/api/features/experimental'),
      ]);

      if (!mapRes.ok || !calibrationRes.ok || !tasksRes.ok || !featuresRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [frontierMap, calibration, recentTasks, experimentalFeatures] = await Promise.all([
        mapRes.json(),
        calibrationRes.json(),
        tasksRes.json(),
        featuresRes.json(),
      ]);

      setData({
        frontierMap,
        calibration,
        recentTasks,
        experimentalFeatures,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const analyzeTask = useCallback(async (description: string): Promise<TaskAnalysisResult> => {
    const response = await fetch('/api/tasks/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze task');
    }

    return response.json();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...data,
    refresh: fetchData,
    analyzeTask,
  };
}
