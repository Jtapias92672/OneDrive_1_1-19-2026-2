'use client';

/**
 * ResultCard Component
 * Displays POC execution results with stats and file browser
 */

import { memo, useState, useCallback, useEffect } from 'react';
import {
  FileCode,
  Database,
  TestTube2,
  FolderOpen,
  Download,
  Eye,
  X,
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Loader,
} from 'lucide-react';
import type { POCResult } from '../../hooks/useConversation';

interface FileInfo {
  name: string;
  path: string;
  size: number;
}

interface FilesData {
  frontend: FileInfo[];
  backend: FileInfo[];
}

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
  const [showFiles, setShowFiles] = useState(false);
  const [files, setFiles] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState({
    frontend: true,
    backend: true,
  });

  // Fetch files when View Files is clicked
  const handleViewFiles = useCallback(async () => {
    setShowFiles(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/poc/results/${result.runId}`);
      const data = await res.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }, [result.runId]);

  // Handle Export ZIP
  const handleExportZip = useCallback(() => {
    window.location.href = `/api/poc/results/${result.runId}/export`;
  }, [result.runId]);

  // Load file content
  const handleSelectFile = useCallback(
    async (file: FileInfo) => {
      setSelectedFile(file);
      try {
        const res = await fetch(`/api/poc/results/${result.runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.path }),
        });
        const data = await res.json();
        setFileContent(data.content || 'Unable to load file content');
      } catch {
        setFileContent('Failed to load file');
      }
    },
    [result.runId]
  );

  // Handle button clicks
  const handleOptionClick = useCallback(
    (option: string) => {
      if (option === 'View Files') {
        handleViewFiles();
      } else if (option === 'Export ZIP') {
        handleExportZip();
      } else {
        onSelectOption?.(option);
      }
    },
    [handleViewFiles, handleExportZip, onSelectOption]
  );

  const toggleSection = (section: 'frontend' | 'backend') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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

      {/* File Browser Modal */}
      {showFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Generated Files - {result.runId.slice(0, 8)}...
              </h3>
              <button
                onClick={() => {
                  setShowFiles(false);
                  setSelectedFile(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* File Tree */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 text-violet-600 animate-spin" />
                  </div>
                ) : files ? (
                  <div className="space-y-2">
                    {/* Frontend Section */}
                    <div>
                      <button
                        onClick={() => toggleSection('frontend')}
                        className="flex items-center gap-1 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {expandedSections.frontend ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Folder className="w-4 h-4 text-violet-500" />
                        frontend ({files.frontend.length})
                      </button>
                      {expandedSections.frontend && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {files.frontend.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => handleSelectFile(file)}
                              className={`flex items-center gap-1.5 w-full text-left text-xs px-2 py-1 rounded ${
                                selectedFile?.path === file.path
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <File className="w-3 h-3" />
                              {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Backend Section */}
                    <div>
                      <button
                        onClick={() => toggleSection('backend')}
                        className="flex items-center gap-1 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {expandedSections.backend ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Folder className="w-4 h-4 text-blue-500" />
                        backend ({files.backend.length})
                      </button>
                      {expandedSections.backend && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {files.backend.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => handleSelectFile(file)}
                              className={`flex items-center gap-1.5 w-full text-left text-xs px-2 py-1 rounded ${
                                selectedFile?.path === file.path
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <File className="w-3 h-3" />
                              {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No files found</p>
                )}
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-mono">
                      {selectedFile.name}
                    </div>
                    <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-800 bg-gray-50">
                      {fileContent}
                    </pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    Select a file to view its contents
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
