'use client';

/**
 * Generation Progress Context
 * Shared state for generation progress tracking across the dashboard
 */

import { createContext, useContext, ReactNode } from 'react';
import { useGenerationProgress } from '../hooks/useGenerationProgress';
import type { GenerationProgressData } from '../components/RightPanel/GenerationProgressCard';

interface GenerationProgressContextValue {
  progressData: GenerationProgressData;
  startGeneration: (runId: string) => void;
  updateProgress: (event: { runId: string; stage: string; progress: number; message: string }) => void;
  completeGeneration: (componentCount: number, testCount: number) => void;
  handleError: (stageId: string, errorMessage: string) => void;
  reset: () => void;
}

const GenerationProgressContext = createContext<GenerationProgressContextValue | null>(null);

export function GenerationProgressProvider({ children }: { children: ReactNode }) {
  const progressMethods = useGenerationProgress();

  return (
    <GenerationProgressContext.Provider value={progressMethods}>
      {children}
    </GenerationProgressContext.Provider>
  );
}

export function useGenerationProgressContext() {
  const context = useContext(GenerationProgressContext);
  if (!context) {
    throw new Error('useGenerationProgressContext must be used within GenerationProgressProvider');
  }
  return context;
}
