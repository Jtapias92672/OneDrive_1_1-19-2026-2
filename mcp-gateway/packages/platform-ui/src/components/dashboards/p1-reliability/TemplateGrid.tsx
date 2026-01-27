'use client';

import { Template } from '@/lib/persona/dashboard-types';

interface TemplateGridProps {
  templates: Template[];
  onSelectTemplate?: (template: Template) => void;
}

export function TemplateGrid({ templates, onSelectTemplate }: TemplateGridProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Start with Templates</h3>
        <p className="text-sm text-gray-500 mt-1">
          Templates have <span className="font-semibold text-green-600">98% success rate</span> on first generation
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {templates.slice(0, 4).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => onSelectTemplate?.(template)}
            />
          ))}
        </div>

        <button className="w-full mt-4 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Browse All Templates
        </button>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onClick?: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
    >
      <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </div>
      <p className="font-medium text-gray-900 text-sm">{template.name}</p>
      <div className="flex items-center mt-1">
        <span className="text-xs text-green-600 font-medium">{template.successRate}% success</span>
      </div>
    </button>
  );
}
