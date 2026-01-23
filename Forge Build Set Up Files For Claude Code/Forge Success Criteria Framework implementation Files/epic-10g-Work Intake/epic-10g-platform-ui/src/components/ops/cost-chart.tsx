/**
 * FORGE Platform UI - Cost Chart
 * @epic 10f - Operations
 */

'use client';

import { useMemo } from 'react';

interface CostChartProps {
  data: {
    timestamp: string;
    cost: number;
    runs: number;
  }[];
}

export function CostChart({ data }: CostChartProps) {
  const { maxCost, chartData } = useMemo(() => {
    const max = Math.max(...data.map(d => d.cost));
    return {
      maxCost: max,
      chartData: data.map(d => ({
        ...d,
        heightPercent: (d.cost / max) * 100,
        date: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })),
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-64">
      <div className="flex h-full">
        {/* Y-axis labels */}
        <div className="w-16 flex flex-col justify-between text-xs text-muted-foreground pr-2 pb-6">
          <span>{formatCurrency(maxCost)}</span>
          <span>{formatCurrency(maxCost * 0.75)}</span>
          <span>{formatCurrency(maxCost * 0.5)}</span>
          <span>{formatCurrency(maxCost * 0.25)}</span>
          <span>$0</span>
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-muted/50" />
            ))}
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-1 pb-6">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center group"
              >
                <div className="relative w-full flex justify-center">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap">
                      <p className="font-medium">{formatCurrency(item.cost)}</p>
                      <p className="text-muted">{item.runs} runs</p>
                    </div>
                  </div>
                  
                  {/* Bar */}
                  <div
                    className="w-full max-w-8 bg-primary/80 hover:bg-primary rounded-t transition-all"
                    style={{ height: `${item.heightPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground h-6">
            {chartData.filter((_, i) => i % Math.ceil(chartData.length / 7) === 0).map((item, idx) => (
              <span key={idx}>{item.date}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostChart;
