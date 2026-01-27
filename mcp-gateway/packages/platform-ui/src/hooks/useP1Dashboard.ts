'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ReliabilityMetrics,
  Template,
  Project,
  SkillProgress,
} from '@/lib/persona/dashboard-types';

interface P1DashboardData {
  metrics: ReliabilityMetrics | null;
  templates: Template[];
  projects: Project[];
  skillProgress: SkillProgress | null;
  isLoading: boolean;
  error: string | null;
}

interface UseP1DashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useP1Dashboard(options: UseP1DashboardOptions = {}): P1DashboardData & {
  refresh: () => Promise<void>;
} {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const [data, setData] = useState<P1DashboardData>({
    metrics: null,
    templates: [],
    projects: [],
    skillProgress: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const [metricsRes, templatesRes, projectsRes, skillsRes] = await Promise.all([
        fetch('/api/metrics/reliability'),
        fetch('/api/templates'),
        fetch('/api/projects'),
        fetch('/api/skills/progress'),
      ]);

      if (!metricsRes.ok || !templatesRes.ok || !projectsRes.ok || !skillsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [metrics, templates, projects, skillProgress] = await Promise.all([
        metricsRes.json(),
        templatesRes.json(),
        projectsRes.json(),
        skillsRes.json(),
      ]);

      setData({
        metrics,
        templates,
        projects,
        skillProgress,
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
  };
}
