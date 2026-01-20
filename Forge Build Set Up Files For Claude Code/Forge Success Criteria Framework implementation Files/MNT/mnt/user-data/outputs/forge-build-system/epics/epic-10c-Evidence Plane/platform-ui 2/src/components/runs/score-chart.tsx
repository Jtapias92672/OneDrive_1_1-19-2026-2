/**
 * FORGE Platform UI - Score Chart
 * @epic 10b - Execution Monitor
 */

'use client';

import { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import type { Iteration } from '@/lib/types/runs';

interface ScoreChartProps {
  iterations: Iteration[];
  targetScore: number;
  currentScore: number;
}

export function ScoreChart({ iterations, targetScore, currentScore }: ScoreChartProps) {
  const chartData = useMemo(() => {
    if (iterations.length === 0) return [];
    
    return iterations.map((iter) => ({
      iteration: iter.number,
      score: iter.score,
      aboveTarget: iter.score >= targetScore,
    }));
  }, [iterations, targetScore]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const lastTwo = chartData.slice(-2);
    return lastTwo[1].score - lastTwo[0].score;
  }, [chartData]);

  const maxScore = Math.max(
    targetScore + 0.05,
    ...chartData.map((d) => d.score)
  );

  // Calculate chart dimensions
  const chartHeight = 150;
  const chartWidth = '100%';
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };

  const getY = (score: number) => {
    const range = maxScore;
    return padding.top + (1 - score / range) * (chartHeight - padding.top - padding.bottom);
  };

  const getX = (index: number, total: number) => {
    if (total === 1) return 50;
    return padding.left + (index / (total - 1)) * (100 - padding.left - padding.right);
  };

  // Generate path for line chart
  const linePath = chartData.length > 0
    ? chartData.map((d, i) => {
        const x = getX(i, chartData.length);
        const y = getY(d.score);
        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
      }).join(' ')
    : '';

  // Generate area path
  const areaPath = linePath
    ? `${linePath} L ${getX(chartData.length - 1, chartData.length)}% ${chartHeight - padding.bottom} L ${padding.left}% ${chartHeight - padding.bottom} Z`
    : '';

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Score Progress</h3>
        <div className="flex items-center gap-2">
          {trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : trend < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : null}
          <span className={`text-sm font-medium ${
            currentScore >= targetScore ? 'text-green-600' : ''
          }`}>
            {(currentScore * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="relative" style={{ height: chartHeight }}>
          <svg 
            width="100%" 
            height={chartHeight}
            className="overflow-visible"
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={`${padding.left}%`}
                y1={getY(maxScore * ratio)}
                x2="100%"
                y2={getY(maxScore * ratio)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
            ))}

            {/* Target line */}
            <line
              x1={`${padding.left}%`}
              y1={getY(targetScore)}
              x2="100%"
              y2={getY(targetScore)}
              stroke="rgb(34, 197, 94)"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text
              x="100%"
              y={getY(targetScore) - 4}
              textAnchor="end"
              className="text-xs fill-green-600"
            >
              Target {(targetScore * 100).toFixed(0)}%
            </text>

            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#scoreGradient)"
              opacity={0.3}
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {chartData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={`${getX(i, chartData.length)}%`}
                  cy={getY(d.score)}
                  r={4}
                  fill={d.aboveTarget ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)'}
                  stroke="white"
                  strokeWidth={2}
                />
                {/* Tooltip on hover would go here */}
              </g>
            ))}

            {/* Y-axis labels */}
            {[0, 0.5, 1].map((ratio) => (
              <text
                key={ratio}
                x={`${padding.left - 5}%`}
                y={getY(maxScore * ratio)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {(maxScore * ratio * 100).toFixed(0)}%
              </text>
            ))}

            {/* X-axis labels */}
            {chartData.map((d, i) => (
              <text
                key={i}
                x={`${getX(i, chartData.length)}%`}
                y={chartHeight - 5}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {d.iteration}
              </text>
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No iterations yet</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(34, 197, 94) 0, rgb(34, 197, 94) 6px, transparent 6px, transparent 10px)' }} />
          <span className="text-muted-foreground">Target</span>
        </div>
      </div>

      {/* Stats */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <p className="text-2xl font-bold">
              {(Math.min(...chartData.map(d => d.score)) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Min</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {(chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {(Math.max(...chartData.map(d => d.score)) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Max</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreChart;
