/**
 * FORGE Platform UI - Limits & Quotas Page
 * @epic 10f - Operations
 */

'use client';

import { useState } from 'react';
import { Gauge, Clock, Zap, Users, Plus, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { RateLimitCard } from '@/components/ops/rate-limit-card';
import { QuotaCard } from '@/components/ops/quota-card';
import type { RateLimit, Quota } from '@/lib/types/ops';

// Sample data
const sampleRateLimits: RateLimit[] = [
  {
    id: 'rl_global',
    name: 'Global Rate Limit',
    scope: 'global',
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    tokensPerMinute: 500000,
    concurrentRuns: 100,
    currentUsage: {
      requestsThisMinute: 234,
      requestsThisHour: 12456,
      requestsThisDay: 89234,
      tokensThisMinute: 123456,
      tokensThisDay: 45200000,
      activeRuns: 23,
    },
    isThrottled: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
  {
    id: 'rl_platform',
    name: 'Platform Team',
    scope: 'team',
    scopeId: 'team_1',
    scopeName: 'Platform',
    requestsPerMinute: 300,
    requestsPerHour: 15000,
    tokensPerMinute: 150000,
    concurrentRuns: 25,
    currentUsage: {
      requestsThisMinute: 89,
      requestsThisHour: 4523,
      requestsThisDay: 32456,
      tokensThisMinute: 45678,
      tokensThisDay: 15600000,
      activeRuns: 8,
    },
    isThrottled: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
  {
    id: 'rl_bob',
    name: 'Bob Martinez',
    scope: 'user',
    scopeId: 'usr_002',
    scopeName: 'bob@forge.dev',
    requestsPerMinute: 50,
    requestsPerHour: 2000,
    tokensPerMinute: 50000,
    concurrentRuns: 5,
    currentUsage: {
      requestsThisMinute: 48,
      requestsThisHour: 1876,
      requestsThisDay: 8923,
      tokensThisMinute: 47890,
      tokensThisDay: 4500000,
      activeRuns: 4,
    },
    isThrottled: true,
    throttledUntil: '2025-01-19T15:45:00Z',
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
];

const sampleQuotas: Quota[] = [
  {
    id: 'quota_runs_global',
    name: 'Monthly Run Quota',
    scope: 'global',
    type: 'runs',
    limit: 50000,
    period: 'monthly',
    used: 3842,
    remaining: 46158,
    percentUsed: 7.68,
    resetsAt: '2025-02-01T00:00:00Z',
    hardLimit: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
  {
    id: 'quota_tokens_global',
    name: 'Monthly Token Quota',
    scope: 'global',
    type: 'tokens',
    limit: 500_000_000,
    period: 'monthly',
    used: 58_000_000,
    remaining: 442_000_000,
    percentUsed: 11.6,
    resetsAt: '2025-02-01T00:00:00Z',
    hardLimit: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
  {
    id: 'quota_cost_platform',
    name: 'Platform Team Cost Quota',
    scope: 'team',
    scopeId: 'team_1',
    scopeName: 'Platform',
    type: 'cost',
    limit: 1500,
    period: 'monthly',
    used: 534.21,
    remaining: 965.79,
    percentUsed: 35.61,
    resetsAt: '2025-02-01T00:00:00Z',
    hardLimit: true,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
  {
    id: 'quota_storage',
    name: 'Evidence Storage Quota',
    scope: 'global',
    type: 'storage',
    limit: 100, // GB
    period: 'unlimited',
    used: 23.5,
    remaining: 76.5,
    percentUsed: 23.5,
    hardLimit: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
  },
];

export default function LimitsPage() {
  const [rateLimits] = useState<RateLimit[]>(sampleRateLimits);
  const [quotas] = useState<Quota[]>(sampleQuotas);
  const [activeTab, setActiveTab] = useState<'rate_limits' | 'quotas'>('rate_limits');

  const throttledCount = rateLimits.filter(r => r.isThrottled).length;
  const nearLimitCount = quotas.filter(q => q.percentUsed > 75).length;

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Limits & Quotas' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Limits & Quotas</h1>
          <p className="text-muted-foreground">
            Manage rate limits and resource quotas
          </p>
        </div>

        <button className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Limit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Rate Limits</p>
              <p className="text-2xl font-bold">{rateLimits.length}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Quotas</p>
              <p className="text-2xl font-bold">{quotas.length}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Throttled</p>
              <p className="text-2xl font-bold text-red-600">{throttledCount}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Near Limit</p>
              <p className="text-2xl font-bold text-yellow-600">{nearLimitCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b pb-4">
        <button
          onClick={() => setActiveTab('rate_limits')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'rate_limits' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Rate Limits ({rateLimits.length})
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'quotas' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Quotas ({quotas.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'rate_limits' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Rate limits control request frequency. When exceeded, requests are queued or rejected.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rateLimits.map((limit) => (
              <RateLimitCard key={limit.id} rateLimit={limit} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quotas limit total resource consumption per period. Hard limits block usage when exceeded.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {quotas.map((quota) => (
              <QuotaCard key={quota.id} quota={quota} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
