/**
 * FORGE Platform UI - useRunStream Hook
 * @epic 10b - Execution Monitor
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './use-websocket';
import type { Run, Iteration, RunEvent, ToolCall } from '@/lib/types/runs';

interface UseRunStreamOptions {
  runId: string;
  onEvent?: (event: RunEvent) => void;
}

interface UseRunStreamReturn {
  run: Run | null;
  iterations: Iteration[];
  events: RunEvent[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  kill: () => Promise<void>;
  fork: (checkpointId: string) => Promise<string>;
}

export function useRunStream({ runId, onEvent }: UseRunStreamOptions): UseRunStreamReturn {
  const [run, setRun] = useState<Run | null>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected, subscribe } = useWebSocket({ autoConnect: true });
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Fetch initial run data
  useEffect(() => {
    async function fetchRun() {
      setIsLoading(true);
      setError(null);
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
        
        // Fetch run
        const runRes = await fetch(`${apiUrl}/api/runs/${runId}`);
        if (!runRes.ok) throw new Error('Failed to fetch run');
        const runData = await runRes.json();
        setRun(runData);
        
        // Fetch iterations
        const iterRes = await fetch(`${apiUrl}/api/runs/${runId}/iterations`);
        if (iterRes.ok) {
          const iterData = await iterRes.json();
          setIterations(iterData);
        }
        
        // Fetch recent events
        const eventsRes = await fetch(`${apiUrl}/api/runs/${runId}/events?limit=100`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (runId) {
      fetchRun();
    }
  }, [runId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected || !runId) return;

    const unsub = subscribe(`run:${runId}`, (message) => {
      const event = message.payload as RunEvent;
      
      // Add to events list
      setEvents((prev) => [event, ...prev].slice(0, 500));
      
      // Call event handler
      onEventRef.current?.(event);
      
      // Update state based on event type
      switch (event.type) {
        case 'run_started':
        case 'run_paused':
        case 'run_resumed':
        case 'run_completed':
        case 'run_failed':
        case 'run_killed':
          setRun((prev) => prev ? { ...prev, ...event.data } : null);
          break;
          
        case 'iteration_started':
          setRun((prev) => prev ? { 
            ...prev, 
            currentIteration: event.data.number,
            status: 'running'
          } : null);
          break;
          
        case 'iteration_completed':
          setIterations((prev) => {
            const existing = prev.find((i) => i.id === event.data.id);
            if (existing) {
              return prev.map((i) => i.id === event.data.id ? event.data : i);
            }
            return [...prev, event.data];
          });
          setRun((prev) => prev ? { 
            ...prev, 
            currentScore: event.data.score,
            tokensUsed: (prev.tokensUsed || 0) + (event.data.tokensUsed || 0)
          } : null);
          break;
          
        case 'score_updated':
          setRun((prev) => prev ? { 
            ...prev, 
            currentScore: event.data.score 
          } : null);
          break;
          
        case 'tool_call_started':
        case 'tool_call_completed':
          setIterations((prev) => {
            return prev.map((iter) => {
              if (iter.id === event.data.iterationId) {
                const toolCall = event.data as ToolCall;
                const existingIdx = iter.toolCalls.findIndex((t) => t.id === toolCall.id);
                if (existingIdx >= 0) {
                  const newToolCalls = [...iter.toolCalls];
                  newToolCalls[existingIdx] = toolCall;
                  return { ...iter, toolCalls: newToolCalls };
                }
                return { ...iter, toolCalls: [...iter.toolCalls, toolCall] };
              }
              return iter;
            });
          });
          break;
      }
    });

    return unsub;
  }, [isConnected, runId, subscribe]);

  // Actions
  const apiAction = useCallback(async (action: string, body?: any) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
    const res = await fetch(`${apiUrl}/api/runs/${runId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `Failed to ${action}`);
    }
    return res.json();
  }, [runId]);

  const pause = useCallback(async () => {
    await apiAction('pause');
    setRun((prev) => prev ? { ...prev, status: 'paused' } : null);
  }, [apiAction]);

  const resume = useCallback(async () => {
    await apiAction('resume');
    setRun((prev) => prev ? { ...prev, status: 'running' } : null);
  }, [apiAction]);

  const kill = useCallback(async () => {
    await apiAction('kill');
    setRun((prev) => prev ? { ...prev, status: 'killed' } : null);
  }, [apiAction]);

  const fork = useCallback(async (checkpointId: string) => {
    const result = await apiAction('fork', { checkpointId });
    return result.newRunId;
  }, [apiAction]);

  return {
    run,
    iterations,
    events,
    isConnected,
    isLoading,
    error,
    pause,
    resume,
    kill,
    fork,
  };
}

export default useRunStream;
