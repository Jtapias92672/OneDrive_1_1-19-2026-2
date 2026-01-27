'use client';

import { ReliabilityScoreBanner } from './ReliabilityScoreBanner';
import { TemplateGrid } from './TemplateGrid';
import { RecentProjects } from './RecentProjects';
import { SkillProgress } from './SkillProgress';
import { HelpWidget } from './HelpWidget';
import {
  ReliabilityMetrics,
  Template,
  Project,
  SkillProgress as SkillProgressType,
} from '@/lib/persona/dashboard-types';

interface P1DashboardProps {
  userName?: string;
  metrics: ReliabilityMetrics;
  templates: Template[];
  projects: Project[];
  skillProgress: SkillProgressType;
  onChangeDashboard?: () => void;
}

export function P1Dashboard({
  userName = 'User',
  metrics,
  templates,
  projects,
  skillProgress,
  onChangeDashboard,
}: P1DashboardProps) {
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
              <p className="text-sm text-gray-500 mt-1">
                Here&apos;s your reliability summary
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Dashboard: Reliability</span>
              <button
                onClick={onChangeDashboard}
                className="text-blue-600 hover:text-blue-700"
              >
                [Change]
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Reliability Score Banner - Full Width */}
        <div className="mb-6">
          <ReliabilityScoreBanner metrics={metrics} />
        </div>

        {/* Main Grid - 60/40 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Templates - 60% (3 cols) */}
          <div className="lg:col-span-3">
            <TemplateGrid templates={templates} />
          </div>

          {/* Recent Projects - 40% (2 cols) */}
          <div className="lg:col-span-2">
            <RecentProjects projects={projects} />
          </div>
        </div>

        {/* Bottom Row - 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skill Progress */}
          <SkillProgress progress={skillProgress} />

          {/* Help Widget - Always Visible */}
          <HelpWidget />
        </div>
      </main>
    </div>
  );
}
