/**
 * FORGE Platform UI - Quota Card
 * @epic 10f - Operations
 */

'use client';

import { Zap, Clock, Database, DollarSign, Lock, AlertTriangle, Edit } from 'lucide-react';
import type { Quota } from '@/lib/types/ops';

interface QuotaCardProps {
  quota: Quota;
}

export function QuotaCard({ quota }: QuotaCardProps) {
  const typeConfig = {
    runs: { icon: Zap, label: 'Runs', format: (n: number) => n.toLocaleString() },
    tokens: { icon: Clock, label: 'Tokens', format: (n: number) => {
      if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      return n.toString();
    }},
    cost: { icon: DollarSign, label: 'Cost', format: (n: number) => `$${n.toLocaleString()}` },
    storage: { icon: Database, label: 'Storage', format: (n: number) => `${n} GB` },
  };

  const config = typeConfig[quota.type];
  const Icon = config.icon;

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 90) return 'bg-red-400';
    if (percent >= 75) return 'bg-yellow-500';
    if (percent >= 50) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const formatTimeUntilReset = (iso?: string) => {
    if (!iso) return 'No reset';
    const reset = new Date(iso);
    const now = new Date();
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return 'Resetting...';
    
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    
    if (days > 0) return `${days}d ${hours}h until reset`;
    if (hours > 0) return `${hours}h until reset`;
    return 'Less than 1h until reset';
  };

  return (
    <div className={`forge-card ${quota.percentUsed >= 100 ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            quota.percentUsed >= 100 ? 'bg-red-100' : 'bg-primary/10'
          }`}>
            <Icon className={`h-5 w-5 ${
              quota.percentUsed >= 100 ? 'text-red-600' : 'text-primary'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{quota.name}</h3>
              {quota.hardLimit && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" title="Hard limit" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {quota.scope === 'global' ? 'Global' : quota.scopeName}
              {quota.period !== 'unlimited' && ` • ${quota.period}`}
            </p>
          </div>
        </div>
        <button className="forge-button h-8 w-8 hover:bg-muted">
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Usage */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl font-bold">{config.format(quota.used)}</span>
            <span className="text-muted-foreground ml-1">/ {config.format(quota.limit)}</span>
          </div>
          <span className={`text-sm font-medium ${
            quota.percentUsed >= 90 ? 'text-red-600' :
            quota.percentUsed >= 75 ? 'text-yellow-600' :
            'text-muted-foreground'
          }`}>
            {quota.percentUsed.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(quota.percentUsed)}`}
            style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {config.format(quota.remaining)} remaining
        </span>
        {quota.resetsAt && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeUntilReset(quota.resetsAt)}
          </span>
        )}
      </div>

      {/* Warning */}
      {quota.percentUsed >= 75 && quota.percentUsed < 100 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <span>Approaching quota limit</span>
        </div>
      )}

      {/* Exceeded */}
      {quota.percentUsed >= 100 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{quota.hardLimit ? 'Quota exceeded - blocked' : 'Quota exceeded'}</span>
        </div>
      )}
    </div>
  );
}

export default QuotaCard;
