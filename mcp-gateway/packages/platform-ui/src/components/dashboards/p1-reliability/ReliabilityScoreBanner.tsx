'use client';

import { ReliabilityMetrics } from '@/lib/persona/dashboard-types';

interface ReliabilityScoreBannerProps {
  metrics: ReliabilityMetrics;
}

export function ReliabilityScoreBanner({ metrics }: ReliabilityScoreBannerProps) {
  return (
    <div className="w-full rounded-lg p-6" style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reliability Score</h2>
      <div className="grid grid-cols-4 gap-4">
        <MetricItem
          value={`${metrics.successRate}%`}
          label="Success Rate"
          highlight
        />
        <MetricItem
          value={metrics.tasksThisWeek.toString()}
          label="Tasks This Week"
        />
        <MetricItem
          value={metrics.avgIterations.toFixed(1)}
          label="Avg Iterations"
        />
        <MetricItem
          value={metrics.templatesUsed.toString()}
          label="Templates Used"
        />
      </div>
    </div>
  );
}

interface MetricItemProps {
  value: string;
  label: string;
  highlight?: boolean;
}

function MetricItem({ value, label, highlight }: MetricItemProps) {
  return (
    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
      <p className={`text-3xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
