'use client';

import { CalibrationHistory } from '@/lib/persona/capability-types';

interface AccuracyChartProps {
  history: CalibrationHistory;
}

const calibrationMessages: Record<CalibrationHistory['calibrationLevel'], string> = {
  novice: 'Keep practicing! Your calibration is improving.',
  intermediate: 'Good progress! You\'re getting better at predicting outcomes.',
  expert: 'Excellent! Your calibration is highly accurate.',
  master: 'Outstanding! You have mastered AI capability calibration.',
};

export function AccuracyChart({ history }: AccuracyChartProps) {
  const trendDirection = history.trendPercent >= 0 ? '↑' : '↓';
  const trendColor = history.trendPercent >= 0 ? 'text-green-600' : 'text-red-600';
  const message = calibrationMessages[history.calibrationLevel];

  // Calculate chart dimensions
  const chartWidth = 280;
  const chartHeight = 80;
  const padding = 10;

  // Generate SVG path for line chart
  const points = history.dataPoints;
  const minAccuracy = Math.min(...points.map((p) => p.accuracy));
  const maxAccuracy = Math.max(...points.map((p) => p.accuracy));
  const range = maxAccuracy - minAccuracy || 1;

  const getX = (index: number) =>
    padding + (index / (points.length - 1)) * (chartWidth - 2 * padding);
  const getY = (accuracy: number) =>
    chartHeight - padding - ((accuracy - minAccuracy) / range) * (chartHeight - 2 * padding);

  const pathData = points
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.accuracy);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Your Accuracy Over Time</h3>
      </div>

      <div className="p-4">
        {/* Simple SVG Line Chart */}
        <div className="mb-4 bg-gray-50 rounded-lg p-2">
          <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((_, i) => (
              <line
                key={i}
                x1={padding}
                y1={padding + (i / 4) * (chartHeight - 2 * padding)}
                x2={chartWidth - padding}
                y2={padding + (i / 4) * (chartHeight - 2 * padding)}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            ))}

            {/* Line path */}
            <path d={pathData} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />

            {/* Data points */}
            {points.map((point, index) => (
              <circle
                key={index}
                cx={getX(index)}
                cy={getY(point.accuracy)}
                r="3"
                fill="#7C3AED"
              />
            ))}
          </svg>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs text-gray-500">Current:</span>
            <span className="text-2xl font-bold text-gray-900 ml-2">{history.currentAccuracy}%</span>
          </div>
          <div className={`text-sm font-medium ${trendColor}`}>
            {history.trendPercent > 0 ? '+' : ''}
            {history.trendPercent}% {trendDirection}
            <span className="text-xs text-gray-400 ml-1">30-day</span>
          </div>
        </div>

        {/* Calibration level badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded capitalize">
            {history.calibrationLevel}
          </span>
        </div>

        {/* Encouraging message */}
        <p className="text-xs text-gray-600 italic">&quot;{message}&quot;</p>
      </div>
    </div>
  );
}
