'use client';

/**
 * ResultCard Component
 * Displays POC execution results with stats and action buttons
 * File viewing is handled by the FileViewer modal component
 */

import { memo, useCallback } from 'react';
import {
  FileCode,
  Database,
  TestTube2,
  FolderOpen,
  Download,
  Eye,
} from 'lucide-react';
import type { POCResult } from '../../hooks/useConversation';

// Removed FileInfo and FilesData interfaces - file viewing now handled by FileViewer component

interface ResultCardProps {
  content: string;
  result: POCResult;
  options?: string[];
  onSelectOption?: (option: string) => void;
}

export const ResultCard = memo(function ResultCard({
  content,
  result,
  options,
  onSelectOption,
}: ResultCardProps) {
  // File viewing now handled by FileViewer component in parent

  // Handle Export ZIP
  const handleExportZip = useCallback(() => {
    window.location.href = `/api/poc/results/${result.runId}/export`;
  }, [result.runId]);

  // Handle button clicks - pass most options to parent, handle Export ZIP here
  const handleOptionClick = useCallback(
    (option: string) => {
      if (option === 'Export ZIP') {
        handleExportZip();
      } else {
        // Pass all other options (including "View Files") to parent
        onSelectOption?.(option);
      }
    },
    [handleExportZip, onSelectOption]
  );

  const hasFiles = result.componentCount > 0 || result.modelCount > 0 || result.testCount > 0;

  return (
    <div className="space-y-4">
      {/* Success/Error Message */}
      <p className={`text-sm font-medium ${hasFiles ? 'text-gray-700' : 'text-amber-700'}`}>
        {content}
      </p>

      {/* Stats Grid - only show if there are files */}
      {hasFiles ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-violet-50 rounded-lg text-center">
              <FileCode className="w-5 h-5 text-violet-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-violet-700">
                {result.componentCount}
              </div>
              <div className="text-[10px] text-gray-500">Components</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <Database className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-700">
                {result.modelCount}
              </div>
              <div className="text-[10px] text-gray-500">Models</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <TestTube2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-emerald-700">
                {result.testCount}
              </div>
              <div className="text-[10px] text-gray-500">Tests</div>
            </div>
          </div>

          {/* Output Path */}
          <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600 font-mono truncate">
              {result.outputPath}
            </span>
          </div>
        </>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            Tips: Make sure your Figma URL is a valid file/design URL (not a prototype URL)
            and that you have access to the file.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {options && options.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                option === 'Start New'
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option === 'View Files' && <Eye className="w-4 h-4" />}
              {option === 'Export ZIP' && <Download className="w-4 h-4" />}
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
