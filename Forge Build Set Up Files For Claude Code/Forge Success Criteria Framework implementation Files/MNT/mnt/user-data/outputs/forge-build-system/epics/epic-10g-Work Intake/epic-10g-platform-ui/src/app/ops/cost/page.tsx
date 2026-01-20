/**
 * FORGE Platform UI - Cost Tracking Page
 * @epic 10f - Operations
 */

'use client';

import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { CostChart } from '@/components/ops/cost-chart';
import { CostBreakdown } from '@/components/ops/cost-breakdown';
import { BudgetCard } from '@/components/ops/budget-card';
import type { CostSummary, Budget, CostFilters, TimeGranularity } from '@/lib/types/ops';

// Sample data
const sampleCostSummary: CostSummary = {
  period: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-19T23:59:59Z',
    granularity: 'day',
  },
  totalCost: 1247.83,
  totalInputTokens: 45_200_000,
  totalOutputTokens: 12_800_000,
  totalRuns: 3842,
  avgCostPerRun: 0.32,
  avgTokensPerRun: 15100,
  costChange: 12.5,
  runChange: 18.2,
  byModel: [
    { model: 'claude-3-5-sonnet', cost: 892.45, runs: 2841 },
    { model: 'claude-3-opus', cost: 298.12, runs: 456 },
    { model: 'claude-3-haiku', cost: 57.26, runs: 545 },
  ],
  byTeam: [
    { teamId: 'team_1', teamName: 'Platform', cost: 534.21, runs: 1523 },
    { teamId: 'team_2', teamName: 'Frontend', cost: 312.45, runs: 987 },
    { teamId: 'team_3', teamName: 'Backend', cost: 289.67, runs: 876 },
    { teamId: 'team_4', teamName: 'DevOps', cost: 111.50, runs: 456 },
  ],
  byContract: [
    { contractId: 'api-validator', contractName: 'API Validator', cost: 423.12, runs: 1234 },
    { contractId: 'code-reviewer', contractName: 'Code Reviewer', cost: 312.45, runs: 876 },
    { contractId: 'doc-generator', contractName: 'Doc Generator', cost: 234.56, runs: 654 },
    { contractId: 'test-writer', contractName: 'Test Writer', cost: 189.34, runs: 534 },
    { contractId: 'other', contractName: 'Other', cost: 88.36, runs: 544 },
  ],
  byEnvironment: [
    { environment: 'production', cost: 687.23, runs: 1876 },
    { environment: 'staging', cost: 345.67, runs: 1234 },
    { environment: 'development', cost: 214.93, runs: 732 },
  ],
  timeSeries: Array.from({ length: 19 }, (_, i) => ({
    timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    cost: 50 + Math.random() * 80,
    runs: 150 + Math.floor(Math.random() * 100),
  })),
};

const sampleBudgets: Budget[] = [
  {
    id: 'budget_global',
    name: 'Monthly Global Budget',
    description: 'Organization-wide spending limit',
    scope: 'global',
    amount: 5000,
    period: 'monthly',
    currentSpend: 1247.83,
    percentUsed: 24.96,
    alertThresholds: [50, 75, 90, 100],
    alertsTriggered: [],
    hardLimit: false,
    status: 'active',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
    createdBy: 'alice@forge.dev',
  },
  {
    id: 'budget_platform',
    name: 'Platform Team Budget',
    scope: 'team',
    scopeId: 'team_1',
    scopeName: 'Platform',
    amount: 1500,
    period: 'monthly',
    currentSpend: 534.21,
    percentUsed: 35.61,
    alertThresholds: [50, 75, 90, 100],
    alertsTriggered: [],
    hardLimit: true,
    status: 'active',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
    createdBy: 'alice@forge.dev',
  },
  {
    id: 'budget_prod',
    name: 'Production Budget',
    description: 'Production environment limit',
    scope: 'global',
    amount: 2000,
    period: 'monthly',
    currentSpend: 687.23,
    percentUsed: 34.36,
    alertThresholds: [50, 75, 90, 100],
    alertsTriggered: [],
    hardLimit: true,
    status: 'active',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-19T00:00:00Z',
    createdBy: 'alice@forge.dev',
  },
];

export default function CostPage() {
  const [summary] = useState<CostSummary>(sampleCostSummary);
  const [budgets] = useState<Budget[]>(sampleBudgets);
  const [filters, setFilters] = useState<CostFilters>({ granularity: 'day' });
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'mtd' | 'custom'>('mtd');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Cost Tracking' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cost Tracking</h1>
          <p className="text-muted-foreground">
            Monitor spending, usage, and budget compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            {(['7d', '30d', 'mtd'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm ${
                  dateRange === range 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'MTD'}
              </button>
            ))}
          </div>
          <button className="forge-button h-9 px-3 hover:bg-muted">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spend</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              summary.costChange > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {summary.costChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(summary.costChange)}%
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Runs</p>
              <p className="text-2xl font-bold">{formatNumber(summary.totalRuns)}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Avg Cost/Run</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.avgCostPerRun)}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Total Tokens</p>
          <p className="text-2xl font-bold">{formatNumber(summary.totalInputTokens + summary.totalOutputTokens)}</p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(summary.totalInputTokens)} in / {formatNumber(summary.totalOutputTokens)} out
          </p>
        </div>
      </div>

      {/* Budgets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Budgets</h2>
          <button className="text-sm text-primary hover:underline">
            Manage Budgets
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>
      </div>

      {/* Cost Chart */}
      <div className="forge-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Spending Over Time</h3>
          <div className="flex items-center gap-2">
            <select
              value={filters.granularity}
              onChange={(e) => setFilters({ ...filters, granularity: e.target.value as TimeGranularity })}
              className="forge-input h-8 text-sm"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
        <CostChart data={summary.timeSeries} />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 md:grid-cols-2">
        <CostBreakdown
          title="By Model"
          data={summary.byModel.map(m => ({ name: m.model, cost: m.cost, runs: m.runs }))}
          totalCost={summary.totalCost}
        />
        <CostBreakdown
          title="By Team"
          data={summary.byTeam.map(t => ({ name: t.teamName, cost: t.cost, runs: t.runs }))}
          totalCost={summary.totalCost}
        />
        <CostBreakdown
          title="By Contract"
          data={summary.byContract.map(c => ({ name: c.contractName, cost: c.cost, runs: c.runs }))}
          totalCost={summary.totalCost}
        />
        <CostBreakdown
          title="By Environment"
          data={summary.byEnvironment.map(e => ({ name: e.environment, cost: e.cost, runs: e.runs }))}
          totalCost={summary.totalCost}
        />
      </div>
    </div>
  );
}
