'use client';

import { useState } from 'react';
import { DataTier } from '@/lib/persona/compliance-types';

interface DataClassificationGuideProps {
  tiers: DataTier[];
  initialCollapsed?: boolean;
  onLearnMore?: () => void;
}

export function DataClassificationGuide({
  tiers,
  initialCollapsed = false,
  onLearnMore,
}: DataClassificationGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between border-b border-gray-100"
      >
        <h3 className="font-semibold text-gray-900">Data Classification Guide</h3>
        <ChevronIcon isOpen={!isCollapsed} />
      </button>

      {!isCollapsed && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiers.map((tier) => (
              <TierCard key={tier.tier} tier={tier} />
            ))}
          </div>

          <button
            onClick={onLearnMore}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Learn About Data Classification →
          </button>
        </div>
      )}
    </div>
  );
}

interface TierCardProps {
  tier: DataTier;
}

function TierCard({ tier }: TierCardProps) {
  const bgColor = tier.approved ? 'bg-green-50' : 'bg-amber-50';
  const borderColor = tier.approved ? 'border-green-200' : 'border-amber-200';
  const iconColor = tier.approved ? 'text-green-600' : 'text-amber-600';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">Tier {tier.tier}</span>
        <span className={iconColor}>
          {tier.icon === 'warning' ? <WarningIcon /> : <CheckIcon />}
        </span>
      </div>
      <p className="font-medium text-gray-900 text-sm">{tier.name}</p>
      <p className="text-xs text-gray-500 mt-1">{tier.description}</p>
      <div className="mt-2">
        {tier.approved ? (
          <span className="text-xs text-green-700 font-medium">
            {tier.requiresReview ? '✓ Approved w/ Review' : '✓ Approved'}
          </span>
        ) : (
          <span className="text-xs text-amber-700 font-medium">⚠ Not Approved</span>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
