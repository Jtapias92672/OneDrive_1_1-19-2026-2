/**
 * FORGE Platform UI - Evidence Filters Panel
 * @epic 10c - Evidence Plane
 */

'use client';

import { X } from 'lucide-react';
import type { EvidenceFilters, EvidenceStatus } from '@/lib/types/evidence';

interface EvidenceFiltersPanelProps {
  filters: EvidenceFilters;
  onChange: (filters: EvidenceFilters) => void;
  onClear: () => void;
}

const statusOptions: { value: EvidenceStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'complete', label: 'Complete' },
  { value: 'exported', label: 'Exported' },
  { value: 'verified', label: 'Verified' },
  { value: 'tampered', label: 'Tampered' },
];

const environmentOptions = [
  { value: 'dev', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'prod', label: 'Production' },
];

export function EvidenceFiltersPanel({ filters, onChange, onClear }: EvidenceFiltersPanelProps) {
  const toggleStatus = (status: EvidenceStatus) => {
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
    const value = filters[key as keyof EvidenceFilters];
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

        {/* Run ID */}
        <div>
          <label className="block text-sm font-medium mb-2">Run ID</label>
          <input
            type="text"
            placeholder="run_..."
            value={filters.runId ?? ''}
            onChange={(e) => onChange({ ...filters, runId: e.target.value || undefined })}
            className="forge-input"
          />
        </div>

        {/* Work ID */}
        <div>
          <label className="block text-sm font-medium mb-2">Work ID</label>
          <input
            type="text"
            placeholder="WORK-..."
            value={filters.workId ?? ''}
            onChange={(e) => onChange({ ...filters, workId: e.target.value || undefined })}
            className="forge-input"
          />
        </div>

        {/* Date Range */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="forge-input"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
              className="forge-input"
            />
          </div>
        </div>

        {/* Repository */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Repository</label>
          <input
            type="text"
            placeholder="org/repo"
            value={filters.repo ?? ''}
            onChange={(e) => onChange({ ...filters, repo: e.target.value || undefined })}
            className="forge-input"
          />
        </div>
      </div>
    </div>
  );
}

export default EvidenceFiltersPanel;
