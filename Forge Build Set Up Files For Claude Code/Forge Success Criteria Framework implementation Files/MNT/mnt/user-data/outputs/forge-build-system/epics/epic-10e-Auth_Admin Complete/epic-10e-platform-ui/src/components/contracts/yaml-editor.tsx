/**
 * FORGE Platform UI - YAML Editor
 * @epic 10a - Platform UI Core
 * @task 10a.3.1 - Create contract editor
 */

'use client';

import { useRef, useEffect } from 'react';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function YamlEditor({ 
  value, 
  onChange, 
  readOnly = false,
  height = '500px' 
}: YamlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync line numbers with scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;
    
    if (!textarea || !lineNumbers) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate line numbers
  const lines = value.split('\n');
  const lineCount = lines.length;

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="relative font-mono text-sm" style={{ height }}>
      {/* Line numbers */}
      <div 
        ref={lineNumbersRef}
        className="absolute left-0 top-0 bottom-0 w-12 bg-muted/50 border-r overflow-hidden select-none"
        style={{ height }}
      >
        <div className="p-3 text-right text-muted-foreground">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="h-6 leading-6">
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className="absolute left-12 top-0 right-0 bottom-0 p-3 bg-transparent resize-none focus:outline-none leading-6"
        style={{ 
          height,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
        placeholder="Enter YAML contract definition..."
      />

      {/* Syntax highlighting overlay (simplified) */}
      <style jsx>{`
        textarea::placeholder {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}

export default YamlEditor;
