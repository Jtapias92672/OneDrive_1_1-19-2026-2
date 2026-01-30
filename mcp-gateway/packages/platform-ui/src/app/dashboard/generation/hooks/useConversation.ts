'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGenerationProgressContext } from '../context/GenerationProgressContext';

// State machine states
export type ConversationState =
  | 'ready'
  | 'discover'
  | 'source-input'
  | 'config'
  | 'confirm'
  | 'execute'
  | 'complete';

// Message types
export type MessageType =
  | 'greeting'
  | 'question'
  | 'text-input'
  | 'response'
  | 'confirmation'
  | 'progress'
  | 'result'
  | 'error';

export interface Message {
  id: string;
  role: 'ai' | 'user';
  type: MessageType;
  content: string;
  options?: string[];
  multiSelect?: boolean;
  selectedOptions?: string[];
  progress?: number;
  progressMessage?: string;
  result?: POCResult;
  timestamp: number;
}

export interface POCOptions {
  sourceType: 'figma' | 'html' | 'describe' | null;
  sourceUrl: string;
  generateComponents: boolean;
  generateTests: boolean;
  generateStories: boolean;
  generateApi: boolean;
  generateHtml: boolean;
}

export interface POCResult {
  runId: string;
  status: string;
  componentCount: number;
  modelCount: number;
  testCount: number;
  outputPath: string;
  files: string[];
  frontendComponents?: any[];
  htmlFiles?: any[];
  backendFiles?: any;
}

interface UseConversationReturn {
  messages: Message[];
  state: ConversationState;
  options: POCOptions;
  isExecuting: boolean;
  selectOption: (option: string) => void;
  submitText: (text: string) => void;
  toggleConfigOption: (option: string) => void;
  confirmGeneration: () => void;
  restart: () => void;
}

const STORAGE_KEY = 'forge-poc-conversation';

const initialOptions: POCOptions = {
  sourceType: null,
  sourceUrl: '',
  generateComponents: true,
  generateTests: true,
  generateStories: true,  // ✅ Now enabled by default
  generateApi: true,
  generateHtml: true,     // ✅ Now enabled by default
};

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ConversationState>('ready');
  const [options, setOptions] = useState<POCOptions>(initialOptions);
  const [isExecuting, setIsExecuting] = useState(false);
  const { startGeneration, updateProgress, completeGeneration, handleError } = useGenerationProgressContext();

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: Message = {
        id: generateId(),
        role: 'ai',
        type: 'greeting',
        content: 'What would you like to build today?',
        options: ['Figma Design', 'HTML Prototype', 'Describe It'],
        timestamp: Date.now(),
      };
      setMessages([greeting]);
      setState('discover');
    }
  }, [messages.length]);

  // Persist to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, state, options }));
    }
  }, [messages, state, options]);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { messages: savedMessages, state: savedState, options: savedOptions } = JSON.parse(saved);
        if (savedMessages?.length > 0) {
          setMessages(savedMessages);
          setState(savedState || 'discover');
          setOptions(savedOptions || initialOptions);
        }
      } catch {
        // Invalid saved data, start fresh
      }
    }
  }, []);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const selectOption = useCallback((option: string) => {
    // Handle "Adjust Settings" from confirm state
    if (state === 'confirm' && option === 'Adjust Settings') {
      addMessage({
        role: 'user',
        type: 'response',
        content: option,
      });

      // Go back to config state
      setTimeout(() => {
        addMessage({
          role: 'ai',
          type: 'question',
          content: 'What should I generate?',
          options: ['React Components', 'Tests', 'Storybook Stories', 'API Endpoints', 'HTML Files'],
          multiSelect: true,
          selectedOptions: (() => {
            const selected: string[] = [];
            if (options.generateComponents) selected.push('React Components');
            if (options.generateTests) selected.push('Tests');
            if (options.generateStories) selected.push('Storybook Stories');
            if (options.generateApi) selected.push('API Endpoints');
            if (options.generateHtml) selected.push('HTML Files');
            return selected;
          })(),
        });
        setState('config');
      }, 300);
      return;
    }

    // Add user response
    addMessage({
      role: 'user',
      type: 'response',
      content: option,
    });

    // Handle based on current state
    if (state === 'discover') {
      const sourceType = option === 'Figma Design' ? 'figma'
        : option === 'HTML Prototype' ? 'html'
        : 'describe';

      setOptions(prev => ({ ...prev, sourceType }));

      // Ask for source input
      setTimeout(() => {
        const prompt = sourceType === 'figma'
          ? 'Paste your Figma URL:'
          : sourceType === 'html'
          ? 'Paste the path to your HTML file:'
          : 'Describe what you want to build:';

        addMessage({
          role: 'ai',
          type: 'text-input',
          content: prompt,
        });
        setState('source-input');
      }, 300);
    }
  }, [state, options, addMessage]);

  const submitText = useCallback((text: string) => {
    // Add user response
    addMessage({
      role: 'user',
      type: 'response',
      content: text,
    });

    if (state === 'source-input') {
      setOptions(prev => ({ ...prev, sourceUrl: text }));

      // Move to config
      setTimeout(() => {
        addMessage({
          role: 'ai',
          type: 'question',
          content: 'What should I generate?',
          options: ['React Components', 'Tests', 'Storybook Stories', 'API Endpoints', 'HTML Files'],
          multiSelect: true,
          selectedOptions: ['React Components', 'Tests', 'API Endpoints'],
        });
        setState('config');
      }, 300);
    }
  }, [state, addMessage]);

  const toggleConfigOption = useCallback((option: string) => {
    setOptions(prev => {
      const newOptions = { ...prev };
      if (option === 'React Components') newOptions.generateComponents = !prev.generateComponents;
      if (option === 'Tests') newOptions.generateTests = !prev.generateTests;
      if (option === 'Storybook Stories') newOptions.generateStories = !prev.generateStories;
      if (option === 'API Endpoints') newOptions.generateApi = !prev.generateApi;
      if (option === 'HTML Files') newOptions.generateHtml = !prev.generateHtml;
      return newOptions;
    });

    // Update the last message's selectedOptions
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage.type === 'question' && lastMessage.multiSelect) {
        const currentSelected = lastMessage.selectedOptions || [];
        const newSelected = currentSelected.includes(option)
          ? currentSelected.filter(o => o !== option)
          : [...currentSelected, option];

        return [
          ...prev.slice(0, -1),
          { ...lastMessage, selectedOptions: newSelected }
        ];
      }
      return prev;
    });
  }, []);

  const confirmGeneration = useCallback(async () => {
    if (state === 'config') {
      // Add user confirmation
      const selectedItems: string[] = [];
      if (options.generateComponents) selectedItems.push('Components');
      if (options.generateTests) selectedItems.push('Tests');
      if (options.generateStories) selectedItems.push('Stories');
      if (options.generateApi) selectedItems.push('API');
      if (options.generateHtml) selectedItems.push('HTML');

      addMessage({
        role: 'user',
        type: 'response',
        content: `Generate: ${selectedItems.join(', ')}`,
      });

      // Show confirmation
      setTimeout(() => {
        addMessage({
          role: 'ai',
          type: 'confirmation',
          content: `Ready to generate from your ${options.sourceType} source:\n\n• ${selectedItems.join('\n• ')}\n\nOutput: ./generated/{runId}/`,
          options: ['Generate', 'Adjust Settings'],
        });
        setState('confirm');
      }, 300);
    } else if (state === 'confirm') {
      // Start execution
      addMessage({
        role: 'user',
        type: 'response',
        content: 'Generate',
      });

      setState('execute');
      setIsExecuting(true);

      // Add progress message
      const progressMsg = addMessage({
        role: 'ai',
        type: 'progress',
        content: 'Generating...',
        progress: 0,
        progressMessage: 'Initializing...',
      });

      // Start progress tracking with temporary ID (will be replaced by real runId from server)
      const tempRunId = `temp-${Date.now()}`;
      startGeneration(tempRunId);

      // Execute POC
      try {
        const response = await fetch('/api/poc/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            figmaUrl: options.sourceType === 'figma' ? options.sourceUrl : undefined,
            htmlPath: options.sourceType === 'html' ? options.sourceUrl : undefined,
            options: {
              generateTests: options.generateTests,
              generateStories: options.generateStories,
              generateHtml: options.generateHtml,
              skipJira: true,
              deployFrontend: false,
              deployBackend: false,
              outputDir: './generated',
            },
          }),
        });

        if (!response.body) throw new Error('No response body');

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
                  // Update progress in both places
                  setMessages(prev => prev.map(m =>
                    m.id === progressMsg.id
                      ? { ...m, progress: data.progress, progressMessage: data.message }
                      : m
                  ));

                  // Update progress card via context
                  updateProgress({
                    runId: data.runId || tempRunId,
                    stage: data.stage || 'generating',
                    progress: data.progress,
                    message: data.message || 'Processing...',
                  });
                } else if (data.runId && data.status) {
                  // Final result
                  setMessages(prev => prev.filter(m => m.id !== progressMsg.id));

                  // Check if workflow failed with an error
                  if (data.status === 'failed' && data.error) {
                    throw new Error(data.error);
                  }

                  const componentCount = data.frontendComponents?.length || 0;
                  const modelCount = data.inferredModels?.length || 0;
                  const testCount = data.backendFiles?.tests?.length || 0;
                  const hasFiles = componentCount > 0 || modelCount > 0 || testCount > 0;

                  // Only show file options if files were actually generated
                  const resultOptions = hasFiles
                    ? ['View Files', 'Export ZIP', 'Start New']
                    : ['Try Again', 'Start New'];

                  addMessage({
                    role: 'ai',
                    type: 'result',
                    content: hasFiles
                      ? "Done! Here's what I created:"
                      : 'Generation completed but no files were created. The source may be empty or contain no valid components.',
                    result: {
                      runId: data.runId,
                      status: data.status,
                      componentCount,
                      modelCount,
                      testCount,
                      outputPath: data.outputPath || `./generated/${data.runId}`,
                      files: [],
                      frontendComponents: data.frontendComponents || [],
                      htmlFiles: data.htmlFiles || [],
                      backendFiles: data.backendFiles || {},
                    },
                    options: resultOptions,
                  });

                  // Complete progress tracking
                  completeGeneration(componentCount, testCount);

                  setState('complete');
                  setIsExecuting(false);
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        setMessages(prev => prev.filter(m => m.id !== progressMsg.id));

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Update progress card with error
        handleError('generate', errorMessage);

        addMessage({
          role: 'ai',
          type: 'error',
          content: `Generation failed: ${errorMessage}`,
          options: ['Try Again', 'Start New'],
        });

        setState('complete');
        setIsExecuting(false);
      }
    }
  }, [state, options, addMessage]);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setState('ready');
    setOptions(initialOptions);
    setIsExecuting(false);
  }, []);

  return {
    messages,
    state,
    options,
    isExecuting,
    selectOption,
    submitText,
    toggleConfigOption,
    confirmGeneration,
    restart,
  };
}
