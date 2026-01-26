/**
 * FORGE Platform UI - Work Filters Panel
 * @epic 10g - Work Intake
 */

'use client';

import { X } from 'lucide-react';
import type { WorkFilters, WorkStatus, WorkPriority, TicketSource } from '@/lib/types/work';

interface WorkFiltersPanelProps {
  filters: WorkFilters;
  onFiltersChange: (filters: WorkFilters) => void;
  onClear: () => void;
}

export function WorkFiltersPanel({ filters, onFiltersChange, onClear }: WorkFiltersPanelProps) {
  const toggleArrayFilter = <T extends string>(
    key: keyof WorkFilters,
    value: T
  ) => {
    const current = (filters[key] as T[] | undefined) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated.length ? updated : undefined });
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['draft', 'pending', 'running', 'completed', 'failed'] as WorkStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => toggleArrayFilter('status', status)}
                className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                  filters.status?.includes(status)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <div className="flex flex-wrap gap-2">
            {(['low', 'medium', 'high', 'critical'] as WorkPriority[]).map((priority) => (
              <button
                key={priority}
                onClick={() => toggleArrayFilter('priority', priority)}
                className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                  filters.priority?.includes(priority)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Source */}
        <div>
          <label className="block text-sm font-medium mb-2">Ticket Source</label>
          <div className="flex flex-wrap gap-2">
            {(['jira', 'linear', 'github', 'asana', 'manual'] as TicketSource[]).map((source) => (
              <button
                key={source}
                onClick={() => toggleArrayFilter('ticketSource', source)}
                className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                  filters.ticketSource?.includes(source)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Team / Assignee */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Team</label>
            <select
              value={filters.team || ''}
              onChange={(e) => onFiltersChange({ ...filters, team: e.target.value || undefined })}
              className="forge-input h-9 text-sm"
            >
              <option value="">All teams</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="platform">Platform</option>
              <option value="devops">DevOps</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Environment</label>
            <select
              value={filters.environment || ''}
              onChange={(e) => onFiltersChange({ ...filters, environment: e.target.value || undefined })}
              className="forge-input h-9 text-sm"
            >
              <option value="">All environments</option>
              <option value="dev">Development</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkFiltersPanel;
