/**
 * FORGE Platform UI - Run Events Log
 * @epic 10b - Execution Monitor
 */

'use client';

import { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Square,
  Zap,
  Target,
  AlertTriangle,
  Tool,
  Filter,
  Download
} from 'lucide-react';
import type { RunEvent } from '@/lib/types/runs';

interface RunEventsLogProps {
  events: RunEvent[];
}

type EventFilter = 'all' | 'run' | 'iteration' | 'tool' | 'error';

export function RunEventsLog({ events }: RunEventsLogProps) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getEventIcon = (type: RunEvent['type']) => {
    switch (type) {
      case 'run_started': return <Play className="h-4 w-4 text-blue-500" />;
      case 'run_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'run_failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'run_paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'run_resumed': return <Play className="h-4 w-4 text-green-500" />;
      case 'run_killed': return <Square className="h-4 w-4 text-gray-500" />;
      case 'iteration_started': 
      case 'iteration_completed': return <Zap className="h-4 w-4 text-blue-400" />;
      case 'tool_call_started': 
      case 'tool_call_completed': return <Tool className="h-4 w-4 text-purple-400" />;
      case 'score_updated': return <Target className="h-4 w-4 text-blue-500" />;
      case 'policy_violation': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Zap className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventCategory = (type: RunEvent['type']): EventFilter => {
    if (type.startsWith('run_')) return 'run';
    if (type.startsWith('iteration_')) return 'iteration';
    if (type.startsWith('tool_')) return 'tool';
    if (type === 'policy_violation' || type.includes('fail') || type.includes('error')) return 'error';
    return 'all';
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredEvents = events.filter((event) => {
    // Filter by category
    if (filter !== 'all' && getEventCategory(event.type) !== filter) {
      return false;
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const typeMatch = event.type.toLowerCase().includes(query);
      const dataMatch = JSON.stringify(event.data).toLowerCase().includes(query);
      return typeMatch || dataMatch;
    }
    
    return true;
  });

  const handleExport = () => {
    const data = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run-events.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterOptions: { value: EventFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'run', label: 'Run' },
    { value: 'iteration', label: 'Iteration' },
    { value: 'tool', label: 'Tool' },
    { value: 'error', label: 'Errors' },
  ];

  return (
    <div className="forge-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Events Log</h3>
          <div className="flex gap-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="forge-input h-8 w-48 text-sm"
          />
          <button
            onClick={handleExport}
            className="forge-button h-8 px-3 hover:bg-muted"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No events found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium w-32">Time</th>
                  <th className="text-left p-3 font-medium w-48">Event</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {formatTime(event.timestamp)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.type)}
                        <span>{formatEventType(event.type)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <EventDetails event={event} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>Total: {events.length} events</span>
        <span>Showing: {filteredEvents.length}</span>
      </div>
    </div>
  );
}

function EventDetails({ event }: { event: RunEvent }) {
  const { data } = event;
  
  if (!data) return null;

  // Format based on event type
  switch (event.type) {
    case 'iteration_completed':
      return (
        <span>
          Iteration {data.number}: Score {(data.score * 100).toFixed(1)}%
        </span>
      );
    case 'tool_call_completed':
      return (
        <span className={data.status === 'error' ? 'text-red-600' : ''}>
          {data.name} - {data.status}
          {data.durationMs && ` (${data.durationMs}ms)`}
        </span>
      );
    case 'score_updated':
      return <span>Score: {(data.score * 100).toFixed(1)}%</span>;
    case 'policy_violation':
      return <span className="text-red-600">Rule: {data.rule}</span>;
    case 'run_failed':
      return <span className="text-red-600">{data.error}</span>;
    default:
      return (
        <span className="text-xs text-muted-foreground">
          {JSON.stringify(data).slice(0, 100)}
          {JSON.stringify(data).length > 100 && '...'}
        </span>
      );
  }
}

export default RunEventsLog;
