'use client';

import { Project } from '@/lib/persona/dashboard-types';

interface RecentProjectsProps {
  projects: Project[];
  onViewProject?: (project: Project) => void;
  onViewAll?: () => void;
}

export function RecentProjects({ projects, onViewProject, onViewAll }: RecentProjectsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Projects</h3>
      </div>

      <div className="p-4">
        <ul className="space-y-3">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              onClick={() => onViewProject?.(project)}
            />
          ))}
        </ul>

        <button
          onClick={onViewAll}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Projects →
        </button>
      </div>
    </div>
  );
}

interface ProjectItemProps {
  project: Project;
  onClick?: () => void;
}

function ProjectItem({ project, onClick }: ProjectItemProps) {
  const statusIcon = project.status === 'completed' ? (
    <span className="text-green-500">✓</span>
  ) : project.status === 'in_progress' ? (
    <span className="text-blue-500">○</span>
  ) : (
    // Failed status - hidden by default per spec
    <span className="text-gray-300 opacity-0 group-hover:opacity-100">✗</span>
  );

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{statusIcon}</span>
        <div>
          <p className="font-medium text-gray-900 text-sm">{project.name}</p>
          <p className="text-xs text-gray-500">
            {project.status === 'completed'
              ? `${project.successRate}% success`
              : 'In progress'}
            {project.iterationCount > 1 && ` · ${project.iterationCount} iterations`}
          </p>
        </div>
      </div>
    </button>
  );
}
