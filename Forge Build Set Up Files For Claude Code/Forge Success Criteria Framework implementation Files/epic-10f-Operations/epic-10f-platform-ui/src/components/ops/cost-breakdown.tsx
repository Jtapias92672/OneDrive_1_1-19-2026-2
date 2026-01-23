/**
 * FORGE Platform UI - Cost Breakdown
 * @epic 10f - Operations
 */

'use client';

interface CostBreakdownProps {
  title: string;
  data: {
    name: string;
    cost: number;
    runs: number;
  }[];
  totalCost: number;
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-red-500',
];

export function CostBreakdown({ title, data, totalCost }: CostBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const sortedData = [...data].sort((a, b) => b.cost - a.cost);

  return (
    <div className="forge-card">
      <h3 className="font-semibold mb-4">{title}</h3>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden flex mb-4">
        {sortedData.map((item, idx) => {
          const percent = (item.cost / totalCost) * 100;
          return (
            <div
              key={item.name}
              className={`${colors[idx % colors.length]} transition-all`}
              style={{ width: `${percent}%` }}
              title={`${item.name}: ${formatCurrency(item.cost)} (${percent.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {sortedData.map((item, idx) => {
          const percent = (item.cost / totalCost) * 100;
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors[idx % colors.length]}`} />
                <span className="truncate max-w-[150px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{item.runs} runs</span>
                <span className="font-medium w-20 text-right">{formatCurrency(item.cost)}</span>
                <span className="text-muted-foreground w-12 text-right">{percent.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CostBreakdown;
