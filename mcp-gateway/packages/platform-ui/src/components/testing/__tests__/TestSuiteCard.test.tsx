/**
 * TestSuiteCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestSuiteCard } from '../TestSuiteCard';
import { SuiteDefinition, TestRunResult } from '@/lib/api/testing';

describe('TestSuiteCard', () => {
  const mockSuite: SuiteDefinition = {
    name: 'unit',
    description: 'Unit tests - Developer level',
    testCount: 876,
    estimatedDuration: 2000,
    command: 'npm run test:unit',
    layer: 'unit',
  };

  const mockOnRunTests = jest.fn();

  beforeEach(() => {
    mockOnRunTests.mockClear();
  });

  it('renders suite name and description', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('unit')).toBeInTheDocument();
    expect(screen.getByText('Unit tests - Developer level')).toBeInTheDocument();
  });

  it('renders test count', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('876')).toBeInTheDocument();
  });

  it('renders estimated duration', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('calls onRunTests when run button clicked', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} />);

    fireEvent.click(screen.getByTestId('run-button'));
    expect(mockOnRunTests).toHaveBeenCalledWith(mockSuite);
  });

  it('disables run button when isRunning is true', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} isRunning />);

    const button = screen.getByTestId('run-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Running...');
  });

  it('shows results when lastRun provided', () => {
    const lastRun: TestRunResult = {
      runId: 'run-1',
      suite: 'unit',
      status: 'COMPLETE',
      startTime: new Date().toISOString(),
      results: { total: 876, passed: 870, failed: 6, skipped: 0 },
      duration: 1800,
    };

    render(<TestSuiteCard suite={mockSuite} lastRun={lastRun} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('✓ 870')).toBeInTheDocument();
    expect(screen.getByText('✗ 6')).toBeInTheDocument();
  });

  it('shows green status for complete run', () => {
    const lastRun: TestRunResult = {
      runId: 'run-1',
      suite: 'unit',
      status: 'COMPLETE',
      startTime: new Date().toISOString(),
      results: { total: 100, passed: 100, failed: 0, skipped: 0 },
    };

    render(<TestSuiteCard suite={mockSuite} lastRun={lastRun} onRunTests={mockOnRunTests} />);

    const card = screen.getByTestId('suite-card-unit');
    expect(card.className).toContain('border-green');
  });

  it('shows red status for failed run', () => {
    const lastRun: TestRunResult = {
      runId: 'run-1',
      suite: 'unit',
      status: 'FAILED',
      startTime: new Date().toISOString(),
      results: { total: 100, passed: 90, failed: 10, skipped: 0 },
    };

    render(<TestSuiteCard suite={mockSuite} lastRun={lastRun} onRunTests={mockOnRunTests} />);

    const card = screen.getByTestId('suite-card-unit');
    expect(card.className).toContain('border-red');
  });

  it('renders tags when present', () => {
    const suiteWithTags: SuiteDefinition = {
      ...mockSuite,
      tags: ['smoke', 'critical'],
    };

    render(<TestSuiteCard suite={suiteWithTags} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('@smoke')).toBeInTheDocument();
    expect(screen.getByText('@critical')).toBeInTheDocument();
  });

  it('renders layer badge', () => {
    render(<TestSuiteCard suite={mockSuite} onRunTests={mockOnRunTests} />);

    expect(screen.getByText('Unit')).toBeInTheDocument();
  });
});
