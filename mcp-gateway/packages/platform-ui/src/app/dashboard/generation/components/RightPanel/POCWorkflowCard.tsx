'use client';

/**
 * POC Workflow Card
 * Allows users to run the POC Orchestrator with a Figma URL and see real-time progress
 */

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  Sparkles,
  Play,
  Loader,
  CheckCircle,
  XCircle,
  FileCode,
  Database,
  TestTube2,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';

interface POCWorkflowCardProps {
  expanded: boolean;
  onToggle: () => void;
}

type WorkflowState = 'idle' | 'running' | 'completed' | 'failed';

interface POCResult {
  runId: string;
  status: string;
  frontendComponents: Array<{ name: string; testCode?: string; storyCode?: string }>;
  inferredModels: Array<{ name: string }>;
  backendFiles: { tests: Array<unknown> };
  outputPath?: string;
}

export function POCWorkflowCard({ expanded, onToggle }: POCWorkflowCardProps) {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [workflowState, setWorkflowState] = useState<WorkflowState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<POCResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPOC = useCallback(async () => {
    if (!figmaUrl.trim()) return;

    setWorkflowState('running');
    setProgress(0);
    setProgressMessage('Initializing...');
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/poc/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaUrl,
          options: {
            generateTests: true,
            generateStories: true,
            skipJira: true,
            deployFrontend: false,
            deployBackend: false,
            outputDir: './generated',
          },
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.progress !== undefined) {
                setProgress(data.progress);
                setProgressMessage(data.message);
              } else if (data.runId) {
                setResult(data as POCResult);
                setWorkflowState(data.status === 'completed' ? 'completed' : 'failed');
              } else if (data.error) {
                setError(data.error);
                setWorkflowState('failed');
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setWorkflowState('failed');
    }
  }, [figmaUrl]);

  const getStateColor = () => {
    switch (workflowState) {
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-500 bg-slate-50';
    }
  };

  const getStateLabel = () => {
    switch (workflowState) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer ${
          expanded ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200' : ''
        }`}
      >
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span
            className={`text-violet-600 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </span>
          <Sparkles className="w-4 h-4 text-violet-600" />
          POC Workflow
        </h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStateColor()}`}>
          {getStateLabel()}
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Figma URL Input */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Figma URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                disabled={workflowState === 'running'}
              />
              <button
                onClick={runPOC}
                disabled={!figmaUrl.trim() || workflowState === 'running'}
                className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {workflowState === 'running' ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {workflowState === 'running' && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-slate-600">{progressMessage}</span>
                <span className="text-[11px] font-semibold text-violet-600">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          {/* Results */}
          {result && workflowState === 'completed' && (
            <div className="space-y-3">
              {/* Success Banner */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-700">
                  POC completed successfully!
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-violet-50 rounded-lg text-center">
                  <FileCode className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-violet-700">
                    {result.frontendComponents.length}
                  </div>
                  <div className="text-[9px] text-slate-500">Components</div>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                  <Database className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-700">
                    {result.inferredModels.length}
                  </div>
                  <div className="text-[9px] text-slate-500">Models</div>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg text-center">
                  <TestTube2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-emerald-700">
                    {result.backendFiles.tests.length}
                  </div>
                  <div className="text-[9px] text-slate-500">Tests</div>
                </div>
              </div>

              {/* Output Path */}
              {result.outputPath && (
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-600 font-mono">
                      {result.outputPath}
                    </span>
                  </div>
                  <a
                    href={`/api/poc/results/${result.runId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Component List Preview */}
              <div>
                <div className="text-[11px] font-semibold text-slate-700 mb-2">
                  Generated Components (showing first 5)
                </div>
                <div className="space-y-1">
                  {result.frontendComponents.slice(0, 5).map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                    >
                      <span className="text-slate-700 font-medium">{comp.name}</span>
                      <div className="flex gap-1">
                        {comp.testCode && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            test
                          </span>
                        )}
                        {comp.storyCode && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            story
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {result.frontendComponents.length > 5 && (
                    <div className="text-[10px] text-slate-400 text-center py-1">
                      +{result.frontendComponents.length - 5} more components
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Idle State Instructions */}
          {workflowState === 'idle' && !result && (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                Paste a Figma URL to generate React components,
                <br />
                Express API, and tests automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
