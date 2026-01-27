'use client';

import { ExperimentalFeature, FeatureStage } from '@/lib/persona/capability-types';

interface ExperimentalFeaturesProps {
  features: ExperimentalFeature[];
  onTryFeature?: (feature: ExperimentalFeature) => void;
  onViewAll?: () => void;
}

const stageBadges: Record<FeatureStage, { label: string; color: string }> = {
  alpha: { label: 'Alpha', color: 'bg-red-100 text-red-700' },
  beta: { label: 'Beta', color: 'bg-blue-100 text-blue-700' },
  'coming-soon': { label: 'Coming Soon', color: 'bg-gray-100 text-gray-600' },
};

export function ExperimentalFeatures({
  features,
  onTryFeature,
  onViewAll,
}: ExperimentalFeaturesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Experimental Features</h3>
      </div>

      <div className="p-4">
        <ul className="space-y-3">
          {features.slice(0, 4).map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              onClick={() => onTryFeature?.(feature)}
            />
          ))}
        </ul>

        <button
          onClick={onViewAll}
          className="w-full mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          View All Experiments →
        </button>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  feature: ExperimentalFeature;
  onClick?: () => void;
}

function FeatureItem({ feature, onClick }: FeatureItemProps) {
  const badge = stageBadges[feature.stage];
  const isClickable = feature.stage !== 'coming-soon';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`w-full p-3 bg-gray-50 rounded-lg text-left transition-colors ${
        isClickable ? 'hover:bg-purple-50 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧪</span>
          <span className="font-medium text-gray-900 text-sm">{feature.name}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 ml-7">{feature.description}</p>
      {isClickable && (
        <span className="text-xs text-purple-600 font-medium ml-7 mt-1 inline-block">
          Try it →
        </span>
      )}
    </button>
  );
}
