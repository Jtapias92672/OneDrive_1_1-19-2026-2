'use client';

import { SkillProgress as SkillProgressType } from '@/lib/persona/dashboard-types';

interface SkillProgressProps {
  progress: SkillProgressType;
  onContinue?: () => void;
}

export function SkillProgress({ progress, onContinue }: SkillProgressProps) {
  const { currentTrack } = progress;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Your Skill Progress</h3>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-900">{currentTrack.name} Track</span>
            <span className="text-sm text-gray-500">{currentTrack.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentTrack.progress}%` }}
            />
          </div>
        </div>

        {currentTrack.nextModule && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-500">Next up:</p>
            <p className="font-medium text-gray-900">{currentTrack.nextModule.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {currentTrack.nextModule.timeEstimateMinutes} min
            </p>
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full py-2 px-4 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          Continue Learning →
        </button>
      </div>
    </div>
  );
}
