/**
 * FORGE Platform UI - Run Filters Panel
 * @epic 10b - Execution Monitor
 */

'use client';

import { X } from 'lucide-react';
import type { RunFilters, RunStatus } from '@/lib/types/runs';

interface RunFiltersPanelProps {
  filters: RunFilters;
  onChange: (filters: RunFilters) => void;
  onClear: () => void;
}

const statusOptions: { value: RunStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'killed', label: 'Killed' },
  { value: 'timeout', label: 'Timeout' },
];

const environmentOptions = [
  { value: 'dev', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'prod', label: 'Production' },
];

export function RunFiltersPanel({ filters, onChange, onClear }: RunFiltersPanelProps) {
  const toggleStatus = (status: RunStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const toggleEnvironment = (env: string) => {
    const current = filters.environment || [];
    const updated = current.includes(env)
      ? current.filter((e) => e !== env)
      : [...current, env];
    onChange({ ...filters, environment: updated.length > 0 ? updated : undefined });
  };

  const hasFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof RunFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  });

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleStatus(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  filters.status?.includes(option.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Environment */}
        <div>
          <label className="block text-sm font-medium mb-2">Environment</label>
          <div className="flex flex-wrap gap-2">
            {environmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleEnvironment(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  filters.environment?.includes(option.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cost Range */}
        <div>
          <label className="block text-sm font-medium mb-2">Cost Range</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              min={0}
              step={0.01}
              value={filters.costMin ?? ''}
              onChange={(e) => onChange({ 
                ...filters, 
                costMin: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="forge-input w-24"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              step={0.01}
              value={filters.costMax ?? ''}
              onChange={(e) => onChange({ 
                ...filters, 
                costMax: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="forge-input w-24"
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="forge-input"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
              className="forge-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunFiltersPanel;
