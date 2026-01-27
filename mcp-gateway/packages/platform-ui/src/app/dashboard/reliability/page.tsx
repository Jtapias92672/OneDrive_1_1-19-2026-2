'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { P1Dashboard } from '@/components/dashboards/p1-reliability';
import { useP1Dashboard } from '@/hooks/useP1Dashboard';
import { mockReliabilityMetrics, mockTemplates, mockProjects, mockSkillProgress } from '@/lib/persona/mock-data';
import { forgeSignals } from '@/lib/signals';

export default function ReliabilityDashboardPage() {
  const router = useRouter();
  const { metrics, templates, projects, skillProgress, isLoading, error } = useP1Dashboard();

  // Track page view
  useEffect(() => {
    forgeSignals.track('page_viewed', { page: 'dashboard/reliability' });
  }, []);

  // Use mock data as fallback during development
  const displayMetrics = metrics ?? mockReliabilityMetrics;
  const displayTemplates = templates.length > 0 ? templates : mockTemplates;
  const displayProjects = projects.length > 0 ? projects : mockProjects;
  const displaySkillProgress = skillProgress ?? mockSkillProgress;

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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <P1Dashboard
      userName="User"
      metrics={displayMetrics}
      templates={displayTemplates}
      projects={displayProjects}
      skillProgress={displaySkillProgress}
      onChangeDashboard={handleChangeDashboard}
    />
  );
}
