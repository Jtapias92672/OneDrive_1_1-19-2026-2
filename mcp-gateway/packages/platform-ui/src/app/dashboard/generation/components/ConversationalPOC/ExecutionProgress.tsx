'use client';

/**
 * ExecutionProgress Component
 * Shows streaming progress during POC execution
 */

import { memo } from 'react';
import { Loader } from 'lucide-react';

interface ExecutionProgressProps {
  progress: number;
  message: string;
}

export const ExecutionProgress = memo(function ExecutionProgress({
  progress,
  message,
}: ExecutionProgressProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Loader className="w-4 h-4 text-violet-600 animate-spin" />
        <span className="text-sm font-medium text-gray-700">Generating...</span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-600">{message}</span>
          <span className="text-xs font-semibold text-violet-600">
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1 justify-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
});
