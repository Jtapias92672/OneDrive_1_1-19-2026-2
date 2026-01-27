/**
 * PipelineResultPanel Component
 * Displays results after pipeline completion
 */

import React from 'react';
import { PipelineResult } from '@/lib/api/pipeline';

export interface PipelineResultPanelProps {
  result: PipelineResult;
  onViewOutput?: () => void;
  onRunAgain?: () => void;
}

export const PipelineResultPanel: React.FC<PipelineResultPanelProps> = ({
  result,
  onViewOutput,
  onRunAgain,
}) => {
  const isSuccess = result.status === 'success';
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isSuccess ? 'border-green-200' : 'border-red-200'
      }`}
      data-testid="pipeline-result-panel"
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          isSuccess ? 'bg-green-50' : 'bg-red-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xl ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
            {isSuccess ? '✓' : '✗'}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isSuccess ? 'Pipeline Complete' : 'Pipeline Failed'}
            </h3>
            <p className="text-sm text-gray-600">
              Duration: {formatDuration(result.duration)}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{result.runId}</span>
      </div>

      {/* Source info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Source</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">File:</span>{' '}
            <span className="font-medium">{result.source.fileName}</span>
          </div>
          <div>
            <span className="text-gray-500">Key:</span>{' '}
            <span className="font-mono text-xs">{result.source.fileKey}</span>
          </div>
        </div>
      </div>

      {/* Output summary */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Generated Output</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-cyan-50 rounded">
            <div className="text-xl font-bold text-cyan-600">{result.output.reactComponents}</div>
            <div className="text-xs text-gray-500">React</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="text-xl font-bold text-orange-600">{result.output.mendixPages}</div>
            <div className="text-xs text-gray-500">Pages</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-xl font-bold text-purple-600">{result.output.mendixWidgets}</div>
            <div className="text-xs text-gray-500">Widgets</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-xl font-bold text-green-600">{result.output.scssLines}</div>
            <div className="text-xs text-gray-500">SCSS Lines</div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pipeline Steps</h4>
        <div className="space-y-2">
          {result.steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded ${
                step.success ? 'bg-gray-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={step.success ? 'text-green-500' : 'text-red-500'}>
                  {step.success ? '✓' : '✗'}
                </span>
                <span className="text-sm font-medium">{step.step}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{step.message}</span>
                <span className="text-xs text-gray-400">{formatDuration(step.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 flex justify-between">
        <span className="text-xs text-gray-500">
          Output: <code className="bg-white px-1 py-0.5 rounded">{result.output.outputDir}</code>
        </span>
        <div className="flex gap-2">
          {onViewOutput && (
            <button
              onClick={onViewOutput}
              className="px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded transition-colors"
            >
              View Output
            </button>
          )}
          {onRunAgain && (
            <button
              onClick={onRunAgain}
              className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
            >
              Run Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineResultPanel;
