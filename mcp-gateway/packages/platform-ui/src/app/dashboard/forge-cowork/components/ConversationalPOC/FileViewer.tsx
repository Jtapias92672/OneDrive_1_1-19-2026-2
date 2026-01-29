'use client';

/**
 * FileViewer Component
 * Displays generated files in a modal with folder organization and download options
 */

import { memo, useState } from 'react';
import { X, File, Download, Copy, Check, Folder, Archive } from 'lucide-react';

interface FileViewerProps {
  result: {
    runId: string;
    componentCount: number;
    modelCount: number;
    testCount: number;
    frontendComponents?: any[];
    backendFiles?: any;
    htmlFiles?: any[];
  };
  onClose: () => void;
}

interface FileItem {
  name: string;
  content: string;
  type: string;
  folder: 'react' | 'html' | 'backend';
}

export const FileViewer = memo(function FileViewer({
  result,
  onClose,
}: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    react: true,
    html: true,
    backend: false,
  });

  // Organize files into folders
  const filesByFolder: Record<string, FileItem[]> = {
    react: [],
    html: [],
    backend: [],
  };

  // Add React components
  if (result.frontendComponents) {
    result.frontendComponents.forEach((comp: any) => {
      filesByFolder.react.push({
        name: `${comp.name}.tsx`,
        content: comp.code || comp.content || 'No content available',
        type: 'component',
        folder: 'react',
      });

      // Add test files if they exist
      if (comp.testCode) {
        filesByFolder.react.push({
          name: `${comp.name}.test.tsx`,
          content: comp.testCode,
          type: 'test',
          folder: 'react',
        });
      }

      // Add story files if they exist
      if (comp.storyCode) {
        filesByFolder.react.push({
          name: `${comp.name}.stories.tsx`,
          content: comp.storyCode,
          type: 'story',
          folder: 'react',
        });
      }
    });
  }

  // Add HTML files
  if (result.htmlFiles) {
    result.htmlFiles.forEach((file: any) => {
      filesByFolder.html.push({
        name: file.name || 'index.html',
        content: file.content || 'No content available',
        type: 'html',
        folder: 'html',
      });
    });
  }

  // Add backend files
  if (result.backendFiles) {
    ['controllers', 'services', 'models', 'routes', 'tests'].forEach((category) => {
      const files = result.backendFiles[category];
      if (Array.isArray(files)) {
        files.forEach((file: any) => {
          filesByFolder.backend.push({
            name: file.name || file.path || `${category}.ts`,
            content: file.content || 'No content available',
            type: category,
            folder: 'backend',
          });
        });
      }
    });
  }

  // Count files per folder
  const folderCounts = {
    react: filesByFolder.react.length,
    html: filesByFolder.html.length,
    backend: filesByFolder.backend.length,
  };

  const totalFiles = folderCounts.react + folderCounts.html + folderCounts.backend;

  const handleCopy = (content: string, fileName: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFolder = (folderName: 'react' | 'html' | 'backend') => {
    const files = filesByFolder[folderName];
    if (files.length === 0) return;

    // Create a simple text file with all folder contents
    let content = `=== ${folderName.toUpperCase()} FOLDER ===\n\n`;
    files.forEach(file => {
      content += `\n\n========== ${file.name} ==========\n`;
      content += file.content;
      content += `\n========== END ${file.name} ==========\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}-files.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    let content = `=== ALL GENERATED FILES ===\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Run ID: ${result.runId}\n\n`;

    (['react', 'html', 'backend'] as const).forEach(folderName => {
      const files = filesByFolder[folderName];
      if (files.length > 0) {
        content += `\n\n########## ${folderName.toUpperCase()} FOLDER (${files.length} files) ##########\n`;
        files.forEach(file => {
          content += `\n\n========== ${file.name} ==========\n`;
          content += file.content;
          content += `\n========== END ${file.name} ==========\n`;
        });
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-generated-${result.runId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generated Files</h2>
            <p className="text-sm text-gray-500">
              {totalFiles} files • React: {folderCounts.react} • HTML: {folderCounts.html} • Backend: {folderCounts.backend}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <Archive className="w-4 h-4" />
              Download All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Folders ({totalFiles} files)
              </h3>
              {totalFiles === 0 ? (
                <p className="text-sm text-gray-400 py-4">No files generated</p>
              ) : (
                <div className="space-y-2">
                  {/* React Folder */}
                  {folderCounts.react > 0 && (
                    <div className="border border-gray-200 rounded-lg bg-white">
                      <button
                        onClick={() => toggleFolder('react')}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">React</span>
                          <span className="text-xs text-gray-500">({folderCounts.react})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFolder('react');
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Download folder"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-gray-400 text-xs">
                            {expandedFolders.react ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>
                      {expandedFolders.react && (
                        <div className="border-t border-gray-200 py-1">
                          {filesByFolder.react.map((file, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedFile(file)}
                              className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                                selectedFile === file
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <File className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* HTML Folder */}
                  {folderCounts.html > 0 && (
                    <div className="border border-gray-200 rounded-lg bg-white">
                      <button
                        onClick={() => toggleFolder('html')}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium text-gray-900">HTML</span>
                          <span className="text-xs text-gray-500">({folderCounts.html})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFolder('html');
                            }}
                            className="p-1 text-gray-400 hover:text-orange-600 rounded"
                            title="Download folder"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-gray-400 text-xs">
                            {expandedFolders.html ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>
                      {expandedFolders.html && (
                        <div className="border-t border-gray-200 py-1">
                          {filesByFolder.html.map((file, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedFile(file)}
                              className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                                selectedFile === file
                                  ? 'bg-orange-50 text-orange-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <File className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Backend Folder */}
                  {folderCounts.backend > 0 && (
                    <div className="border border-gray-200 rounded-lg bg-white">
                      <button
                        onClick={() => toggleFolder('backend')}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900">Backend</span>
                          <span className="text-xs text-gray-500">({folderCounts.backend})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFolder('backend');
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 rounded"
                            title="Download folder"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-gray-400 text-xs">
                            {expandedFolders.backend ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>
                      {expandedFolders.backend && (
                        <div className="border-t border-gray-200 py-1">
                          {filesByFolder.backend.map((file, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedFile(file)}
                              className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                                selectedFile === file
                                  ? 'bg-green-50 text-green-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <File className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* File Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile ? (
              <>
                {/* File Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{selectedFile.name}</h3>
                    <p className="text-xs text-gray-500">{selectedFile.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(selectedFile.content, selectedFile.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copiedFile === selectedFile.name ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(selectedFile.content, selectedFile.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* File Content */}
                <div className="flex-1 overflow-auto p-6">
                  <pre className="text-xs font-mono text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <code>{selectedFile.content}</code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a file to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
