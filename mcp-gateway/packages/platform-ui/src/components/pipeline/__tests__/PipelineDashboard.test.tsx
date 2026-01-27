/**
 * Pipeline Dashboard Component Tests
 * Phase 5: Dashboard Wiring
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PipelineDashboard } from '../PipelineDashboard';
import { FigmaImportButton } from '../FigmaImportButton';
import { PipelineProgressIndicator } from '../PipelineProgressIndicator';
import { PipelineResultPanel } from '../PipelineResultPanel';
import { pipelineService } from '@/lib/api/pipeline';

describe('FigmaImportButton', () => {
  const mockOnImport = jest.fn();

  beforeEach(() => {
    mockOnImport.mockClear();
  });

  it('renders import button', () => {
    render(<FigmaImportButton onImport={mockOnImport} />);

    expect(screen.getByTestId('figma-import-button')).toBeInTheDocument();
    expect(screen.getByText('Import from Figma')).toBeInTheDocument();
  });

  it('shows input when clicked', () => {
    render(<FigmaImportButton onImport={mockOnImport} />);

    fireEvent.click(screen.getByTestId('figma-import-button'));

    expect(screen.getByTestId('figma-import-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Figma file key or URL')).toBeInTheDocument();
  });

  it('calls onImport with file key', () => {
    render(<FigmaImportButton onImport={mockOnImport} />);

    fireEvent.click(screen.getByTestId('figma-import-button'));
    fireEvent.change(screen.getByPlaceholderText('Figma file key or URL'), {
      target: { value: 'test-file-key-1234567890' },
    });
    fireEvent.click(screen.getByText('Import'));

    expect(mockOnImport).toHaveBeenCalledWith('test-file-key-1234567890');
  });

  it('extracts file key from URL', () => {
    render(<FigmaImportButton onImport={mockOnImport} />);

    fireEvent.click(screen.getByTestId('figma-import-button'));
    fireEvent.change(screen.getByPlaceholderText('Figma file key or URL'), {
      target: { value: 'https://www.figma.com/file/abc123xyzABC/MyDesign' },
    });
    fireEvent.click(screen.getByText('Import'));

    expect(mockOnImport).toHaveBeenCalledWith('abc123xyzABC');
  });

  it('shows error for empty input', () => {
    render(<FigmaImportButton onImport={mockOnImport} />);

    fireEvent.click(screen.getByTestId('figma-import-button'));
    fireEvent.click(screen.getByText('Import'));

    expect(screen.getByText('File key is required')).toBeInTheDocument();
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('disables when loading', () => {
    render(<FigmaImportButton onImport={mockOnImport} isLoading />);

    expect(screen.getByTestId('figma-import-button')).toBeDisabled();
  });
});

describe('PipelineProgressIndicator', () => {
  const mockOnCancel = jest.fn();

  it('renders idle state', () => {
    render(
      <PipelineProgressIndicator
        progress={{ stage: 'idle', progress: 0, message: 'Ready' }}
      />
    );

    expect(screen.getByTestId('pipeline-progress')).toBeInTheDocument();
    expect(screen.getAllByText('Ready').length).toBeGreaterThanOrEqual(1);
  });

  it('shows progress percentage', () => {
    render(
      <PipelineProgressIndicator
        progress={{ stage: 'parsing', progress: 50, message: 'Parsing...' }}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows cancel button when running', () => {
    render(
      <PipelineProgressIndicator
        progress={{ stage: 'fetching-figma', progress: 10, message: 'Fetching...' }}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows error state', () => {
    render(
      <PipelineProgressIndicator
        progress={{
          stage: 'error',
          progress: 30,
          message: 'Failed',
          error: 'Network error',
        }}
      />
    );

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows complete state', () => {
    render(
      <PipelineProgressIndicator
        progress={{ stage: 'complete', progress: 100, message: 'Done' }}
      />
    );

    expect(screen.getByText('Pipeline completed successfully!')).toBeInTheDocument();
  });

  it('renders compact mode', () => {
    render(
      <PipelineProgressIndicator
        progress={{ stage: 'parsing', progress: 50, message: 'Parsing...' }}
        compact
      />
    );

    expect(screen.getByTestId('pipeline-progress-compact')).toBeInTheDocument();
  });
});

describe('PipelineResultPanel', () => {
  const mockResult = {
    runId: 'test-run-123',
    status: 'success' as const,
    startedAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T10:00:03Z',
    duration: 3000,
    source: {
      fileKey: 'abc123',
      fileName: 'Test Design',
      lastModified: '2024-01-01T09:00:00Z',
    },
    output: {
      reactComponents: 5,
      mendixPages: 5,
      mendixWidgets: 5,
      scssLines: 1000,
      outputDir: './output',
    },
    steps: [
      { step: 'Figma API', success: true, message: 'OK', duration: 500 },
      { step: 'Parser', success: true, message: 'OK', duration: 500 },
    ],
  };

  it('renders success result', () => {
    render(<PipelineResultPanel result={mockResult} />);

    expect(screen.getByTestId('pipeline-result-panel')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Complete')).toBeInTheDocument();
    expect(screen.getByText('Test Design')).toBeInTheDocument();
  });

  it('shows output counts', () => {
    render(<PipelineResultPanel result={mockResult} />);

    // Multiple '5' values: React components, Mendix pages, Mendix widgets
    expect(screen.getAllByText('5').length).toBe(3);
    expect(screen.getByText('1000')).toBeInTheDocument(); // SCSS lines
  });

  it('shows steps', () => {
    render(<PipelineResultPanel result={mockResult} />);

    expect(screen.getByText('Figma API')).toBeInTheDocument();
    expect(screen.getByText('Parser')).toBeInTheDocument();
  });

  it('calls onRunAgain', () => {
    const mockRunAgain = jest.fn();
    render(<PipelineResultPanel result={mockResult} onRunAgain={mockRunAgain} />);

    fireEvent.click(screen.getByText('Run Again'));
    expect(mockRunAgain).toHaveBeenCalled();
  });
});

describe('PipelineDashboard', () => {
  beforeEach(() => {
    pipelineService.reset();
  });

  it('renders dashboard', () => {
    render(<PipelineDashboard />);

    expect(screen.getByTestId('pipeline-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Figma-to-Code Pipeline')).toBeInTheDocument();
  });

  it('shows import button when idle', () => {
    render(<PipelineDashboard />);

    expect(screen.getByTestId('figma-import-button')).toBeInTheDocument();
  });

  it('starts pipeline on import', async () => {
    render(<PipelineDashboard />);

    fireEvent.click(screen.getByTestId('figma-import-button'));
    fireEvent.change(screen.getByPlaceholderText('Figma file key or URL'), {
      target: { value: 'test-file-key-1234567890' },
    });
    fireEvent.click(screen.getByText('Import'));

    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-progress')).toBeInTheDocument();
    });
  });

  it('calls onPipelineComplete when done', async () => {
    const mockComplete = jest.fn();
    render(<PipelineDashboard onPipelineComplete={mockComplete} />);

    fireEvent.click(screen.getByTestId('figma-import-button'));
    fireEvent.change(screen.getByPlaceholderText('Figma file key or URL'), {
      target: { value: 'test-file-key-1234567890' },
    });
    fireEvent.click(screen.getByText('Import'));

    // Wait for pipeline completion
    await waitFor(
      () => {
        expect(mockComplete).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
  }, 6000);
});
