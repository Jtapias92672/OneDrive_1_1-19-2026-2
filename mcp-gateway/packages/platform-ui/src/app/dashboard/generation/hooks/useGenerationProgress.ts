'use client';

/**
 * useGenerationProgress Hook
 * Manages generation progress state and subscribes to SSE progress events
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GenerationProgressData, GenerationStage } from '../components/RightPanel/GenerationProgressCard';

interface ProgressEvent {
  runId: string;
  stage: string;
  progress: number;
  message: string;
}

// Map orchestrator stages to our 9 display stages
const STAGE_MAPPING: Record<string, { id: string; progress: number }> = {
  initializing: { id: 'init', progress: 5 },
  parsing_html: { id: 'parse', progress: 15 },
  parsing_figma: { id: 'parse', progress: 15 },
  creating_jira_epic: { id: 'extract', progress: 25 },
  creating_jira_tasks: { id: 'extract', progress: 35 },
  generating_frontend: { id: 'generate', progress: 60 },
  generating_backend: { id: 'api', progress: 85 },
  running_tests: { id: 'tests', progress: 75 },
  deploying_frontend: { id: 'html', progress: 90 },
  deploying_backend: { id: 'api', progress: 85 },
  writing_files: { id: 'save', progress: 95 },
  completed: { id: 'finalize', progress: 100 },
  failed: { id: 'error', progress: 0 },
};

const DEFAULT_STAGES: GenerationStage[] = [
  { id: 'init', label: 'Project initialization', status: 'pending' },
  { id: 'parse', label: 'Parsing design source', status: 'pending' },
  { id: 'extract', label: 'Extracting components', status: 'pending' },
  { id: 'generate', label: 'Generating React code', status: 'pending' },
  { id: 'tests', label: 'Creating tests', status: 'pending' },
  { id: 'api', label: 'Generating API endpoints', status: 'pending' },
  { id: 'html', label: 'Building HTML output', status: 'pending' },
  { id: 'save', label: 'Saving artifacts', status: 'pending' },
  { id: 'finalize', label: 'Finalizing', status: 'pending' },
];

export function useGenerationProgress() {
  const [progressData, setProgressData] = useState<GenerationProgressData>({
    runId: null,
    currentStage: null,
    overallProgress: 0,
    stages: DEFAULT_STAGES,
    elapsedTime: 0,
    isExecuting: false,
  });

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start tracking a new generation run
  const startGeneration = useCallback((runId: string) => {
    startTimeRef.current = Date.now();
    setProgressData({
      runId,
      currentStage: 'init',
      overallProgress: 0,
      stages: DEFAULT_STAGES.map(s => ({ ...s, status: 'pending' })),
      elapsedTime: 0,
      isExecuting: true,
    });

    // Start elapsed time counter
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setProgressData(prev => ({ ...prev, elapsedTime: elapsed }));
      }
    }, 1000);
  }, []);

  // Update progress from SSE event
  const updateProgress = useCallback((event: ProgressEvent) => {
    const mapping = STAGE_MAPPING[event.stage];
    if (!mapping) return;

    const stageId = mapping.id;
    const progress = event.progress;

    setProgressData(prev => {
      const newStages = prev.stages.map(stage => {
        // Mark completed stages
        if (stage.id === stageId) {
          return {
            ...stage,
            status: progress === 100 || stage.id === 'finalize' && progress >= 100
              ? 'completed'
              : 'in-progress',
            progress,
          } as GenerationStage;
        }

        // Mark previous stages as completed
        const stageIndex = DEFAULT_STAGES.findIndex(s => s.id === stage.id);
        const currentIndex = DEFAULT_STAGES.findIndex(s => s.id === stageId);

        if (stageIndex < currentIndex) {
          return { ...stage, status: 'completed' as const };
        }

        return stage;
      });

      return {
        ...prev,
        currentStage: stageId,
        overallProgress: progress,
        stages: newStages,
      };
    });
  }, []);

  // Complete the generation
  const completeGeneration = useCallback((componentCount: number, testCount: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgressData(prev => ({
      ...prev,
      overallProgress: 100,
      isExecuting: false,
      componentCount,
      testCount,
      stages: prev.stages.map(s => ({ ...s, status: 'completed' as const })),
    }));
  }, []);

  // Handle error
  const handleError = useCallback((stageId: string, errorMessage: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgressData(prev => ({
      ...prev,
      isExecuting: false,
      stages: prev.stages.map(stage =>
        stage.id === stageId
          ? { ...stage, status: 'error', errorMessage }
          : stage
      ),
    }));
  }, []);

  // Reset progress
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;

    setProgressData({
      runId: null,
      currentStage: null,
      overallProgress: 0,
      stages: DEFAULT_STAGES,
      elapsedTime: 0,
      isExecuting: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    progressData,
    startGeneration,
    updateProgress,
    completeGeneration,
    handleError,
    reset,
  };
}
