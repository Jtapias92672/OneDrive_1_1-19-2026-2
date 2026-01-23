/**
 * FORGE Platform UI - Rate Limit Card
 * @epic 10f - Operations
 */

'use client';

import { Gauge, Clock, AlertTriangle, User, Users, Key, Edit } from 'lucide-react';
import type { RateLimit } from '@/lib/types/ops';

interface RateLimitCardProps {
  rateLimit: RateLimit;
}

export function RateLimitCard({ rateLimit }: RateLimitCardProps) {
  const scopeIcon = {
    global: <Gauge className="h-5 w-5" />,
    team: <Users className="h-5 w-5" />,
    user: <User className="h-5 w-5" />,
    api_key: <Key className="h-5 w-5" />,
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const getUsagePercent = (current: number, limit?: number) => {
    if (!limit) return 0;
    return (current / limit) * 100;
  };

  const getBarColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const metrics = [
    {
      label: 'Requests/min',
      current: rateLimit.currentUsage.requestsThisMinute,
      limit: rateLimit.requestsPerMinute,
    },
    {
      label: 'Requests/hr',
      current: rateLimit.currentUsage.requestsThisHour,
      limit: rateLimit.requestsPerHour,
    },
    {
      label: 'Tokens/min',
      current: rateLimit.currentUsage.tokensThisMinute,
      limit: rateLimit.tokensPerMinute,
    },
    {
      label: 'Concurrent',
      current: rateLimit.currentUsage.activeRuns,
      limit: rateLimit.concurrentRuns,
    },
  ].filter(m => m.limit !== undefined);

  return (
    <div className={`forge-card ${rateLimit.isThrottled ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${rateLimit.isThrottled ? 'bg-red-100' : 'bg-primary/10'}`}>
            {scopeIcon[rateLimit.scope]}
          </div>
          <div>
            <h3 className="font-semibold">{rateLimit.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {rateLimit.scope === 'global' ? 'Global' : rateLimit.scopeName || rateLimit.scope}
            </p>
          </div>
        </div>
        <button className="forge-button h-8 w-8 hover:bg-muted">
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Throttled Banner */}
      {rateLimit.isThrottled && (
        <div className="mb-4 p-2 bg-red-100 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>Throttled</span>
          {rateLimit.throttledUntil && (
            <span className="text-red-600">
              until {new Date(rateLimit.throttledUntil).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-3">
        {metrics.map((metric) => {
          const percent = getUsagePercent(metric.current, metric.limit);
          return (
            <div key={metric.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">{metric.label}</span>
                <span>
                  <span className="font-medium">{formatNumber(metric.current)}</span>
                  <span className="text-muted-foreground"> / {formatNumber(metric.limit!)}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(percent)}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RateLimitCard;
