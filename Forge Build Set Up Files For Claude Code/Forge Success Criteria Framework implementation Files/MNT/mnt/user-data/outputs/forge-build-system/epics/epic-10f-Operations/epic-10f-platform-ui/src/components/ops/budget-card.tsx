/**
 * FORGE Platform UI - Budget Card
 * @epic 10f - Operations
 */

'use client';

import { DollarSign, AlertTriangle, Lock, Edit } from 'lucide-react';
import type { Budget } from '@/lib/types/ops';

interface BudgetCardProps {
  budget: Budget;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 90) return 'bg-red-400';
    if (percent >= 75) return 'bg-yellow-500';
    if (percent >= 50) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getStatusBadge = () => {
    if (budget.status === 'exceeded') {
      return <span className="forge-badge bg-red-100 text-red-700">Exceeded</span>;
    }
    if (budget.percentUsed >= 90) {
      return <span className="forge-badge bg-yellow-100 text-yellow-700">Near Limit</span>;
    }
    return <span className="forge-badge bg-green-100 text-green-700">On Track</span>;
  };

  return (
    <div className={`forge-card ${budget.status === 'exceeded' ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${budget.status === 'exceeded' ? 'bg-red-100' : 'bg-primary/10'}`}>
            <DollarSign className={`h-5 w-5 ${budget.status === 'exceeded' ? 'text-red-600' : 'text-primary'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{budget.name}</h3>
              {budget.hardLimit && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" title="Hard limit" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {budget.scope === 'global' ? 'Global' : budget.scopeName}
              {' • '}
              {budget.period}
            </p>
          </div>
        </div>
        <button className="forge-button h-8 w-8 hover:bg-muted">
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">{formatCurrency(budget.currentSpend)}</span>
          <span className="text-muted-foreground">of {formatCurrency(budget.amount)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(budget.percentUsed)}`}
            style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {budget.percentUsed.toFixed(1)}% used
        </span>
        {getStatusBadge()}
      </div>

      {/* Warning if near limit */}
      {budget.percentUsed >= 75 && budget.percentUsed < 100 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <span>Approaching budget limit</span>
        </div>
      )}

      {/* Exceeded warning */}
      {budget.status === 'exceeded' && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{budget.hardLimit ? 'Budget exceeded - runs blocked' : 'Budget exceeded'}</span>
        </div>
      )}
    </div>
  );
}

export default BudgetCard;
