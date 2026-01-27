'use client';

import { OrganizationPolicy as OrgPolicyType } from '@/lib/persona/compliance-types';

interface OrganizationPolicyProps {
  policy: OrgPolicyType;
  onViewDetails?: () => void;
  onRequestException?: () => void;
}

export function OrganizationPolicy({
  policy,
  onViewDetails,
  onRequestException,
}: OrganizationPolicyProps) {
  const formattedDate = new Date(policy.lastUpdated).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-700' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  };

  const colors = statusColors[policy.status];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Organization Policy</h3>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <PolicyIcon />
            <span className="font-medium text-gray-900">{policy.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              {policy.status === 'active' && '✓ '}
              {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500">Updated: {formattedDate}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onViewDetails}
            className="w-full text-sm text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Policy Details
          </button>
          <button
            onClick={onRequestException}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Request Exception
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
