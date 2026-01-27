/**
 * FigmaImportButton Component
 * Triggers Figma-to-Code pipeline from dashboard
 */

import React, { useState } from 'react';

export interface FigmaImportButtonProps {
  onImport: (fileKey: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  defaultFileKey?: string;
}

export const FigmaImportButton: React.FC<FigmaImportButtonProps> = ({
  onImport,
  disabled = false,
  isLoading = false,
  defaultFileKey = '',
}) => {
  const [showInput, setShowInput] = useState(false);
  const [fileKey, setFileKey] = useState(defaultFileKey);
  const [error, setError] = useState<string | null>(null);

  const extractFileKey = (input: string): string => {
    const trimmed = input.trim();
    // Extract file key from URL if provided
    const urlMatch = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return trimmed;
  };

  const validateFileKey = (key: string): string | null => {
    // Figma file keys are typically 22 characters alphanumeric
    const extracted = extractFileKey(key);
    if (!extracted) {
      return 'File key is required';
    }
    if (extracted.length < 10) {
      return 'File key appears too short';
    }
    return null;
  };

  const handleSubmit = () => {
    const validationError = validateFileKey(fileKey);
    if (validationError) {
      setError(validationError);
      return;
    }
    const extracted = extractFileKey(fileKey);
    onImport(extracted);
    setShowInput(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setError(null);
    }
  };

  if (showInput) {
    return (
      <div className="flex flex-col gap-2" data-testid="figma-import-input">
        <div className="flex gap-2">
          <input
            type="text"
            value={fileKey}
            onChange={(e) => {
              setFileKey(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Figma file key or URL"
            className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-300 focus:ring-red-200'
                : 'border-gray-300 focus:ring-teal-200 focus:border-teal-500'
            }`}
            disabled={disabled || isLoading}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || isLoading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Importing...
              </span>
            ) : (
              'Import'
            )}
          </button>
          <button
            onClick={() => {
              setShowInput(false);
              setError(null);
            }}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-gray-500">
          Enter a Figma file key (e.g., 6GefaVgI8xnuDIHhSbfzsJ) or paste a Figma URL
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      disabled={disabled || isLoading}
      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
      data-testid="figma-import-button"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
        <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
        <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
        <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
        <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
      </svg>
      Import from Figma
    </button>
  );
};

export default FigmaImportButton;
