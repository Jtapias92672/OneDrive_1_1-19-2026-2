'use client';

import { useState } from 'react';
import { TaskAnalysisResult } from '@/lib/persona/capability-types';

interface TaskComplexityAnalyzerProps {
  onAnalyze?: (taskDescription: string) => Promise<TaskAnalysisResult>;
  isLoading?: boolean;
}

export function TaskComplexityAnalyzer({ onAnalyze, isLoading }: TaskComplexityAnalyzerProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [result, setResult] = useState<TaskAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!taskDescription.trim() || !onAnalyze) return;

    setAnalyzing(true);
    try {
      const analysisResult = await onAnalyze(taskDescription);
      setResult(analysisResult);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Task Complexity Analyzer</h3>
      </div>

      <div className="p-4">
        <label htmlFor="task-description" className="text-sm text-gray-600 block mb-2">
          Paste task description:
        </label>
        <textarea
          id="task-description"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Describe the task you want to analyze..."
        />

        <button
          onClick={handleAnalyze}
          disabled={!taskDescription.trim() || analyzing || isLoading}
          className="w-full mt-3 py-2 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Complexity'}
        </button>

        {result && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="mb-3">
              <span className="text-xs text-gray-500">Complexity:</span>
              <div className="flex items-center gap-2 mt-1">
                <ComplexityBar score={result.complexityScore} />
                <span className="text-sm font-semibold text-gray-700">
                  {result.complexityScore}/5
                </span>
              </div>
            </div>

            <div className="mb-2">
              <span className="text-xs text-gray-500">Recommended Workflow:</span>
              <p className="text-sm font-semibold text-purple-700 mt-1">
                {result.recommendedWorkflow}
              </p>
            </div>

            <p className="text-xs text-gray-600">{result.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplexityBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={`w-4 h-2 rounded ${
            level <= score ? 'bg-purple-600' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}
