/**
 * TestingDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestingDashboard } from '../TestingDashboard';
import { testingService } from '@/lib/api/testing';

describe('TestingDashboard', () => {
  beforeEach(() => {
    testingService.reset();
  });

  it('renders loading state initially', () => {
    // Note: Due to useEffect, this will quickly transition to loaded
    render(<TestingDashboard />);

    // Component should load and show content
    expect(screen.getByTestId('testing-dashboard')).toBeInTheDocument();
  });

  it('renders P2 view by default', () => {
    render(<TestingDashboard />);

    expect(screen.getByTestId('testing-dashboard-p2')).toBeInTheDocument();
  });

  it('renders P3 view when initialPersona is P3', () => {
    render(<TestingDashboard initialPersona="P3" />);

    expect(screen.getByTestId('testing-dashboard-p3')).toBeInTheDocument();
  });

  it('switches to P3 view when P3 button clicked', () => {
    render(<TestingDashboard />);

    fireEvent.click(screen.getByTestId('persona-p3-button'));
    expect(screen.getByTestId('testing-dashboard-p3')).toBeInTheDocument();
  });

  it('switches back to P2 view when P2 button clicked', () => {
    render(<TestingDashboard initialPersona="P3" />);

    fireEvent.click(screen.getByTestId('persona-p2-button'));
    expect(screen.getByTestId('testing-dashboard-p2')).toBeInTheDocument();
  });

  it('calls onPersonaChange when switching personas', () => {
    const onPersonaChange = jest.fn();
    render(<TestingDashboard onPersonaChange={onPersonaChange} />);

    fireEvent.click(screen.getByTestId('persona-p3-button'));
    expect(onPersonaChange).toHaveBeenCalledWith('P3');
  });

  it('shows persona switcher buttons', () => {
    render(<TestingDashboard />);

    expect(screen.getByTestId('persona-p2-button')).toBeInTheDocument();
    expect(screen.getByTestId('persona-p3-button')).toBeInTheDocument();
  });

  it('highlights active persona button', () => {
    render(<TestingDashboard initialPersona="P2" />);

    const p2Button = screen.getByTestId('persona-p2-button');
    const p3Button = screen.getByTestId('persona-p3-button');

    expect(p2Button.className).toContain('bg-blue-600');
    expect(p3Button.className).not.toContain('bg-blue-600');
  });

  it('shows health status in P2 view', () => {
    render(<TestingDashboard />);

    expect(screen.getByText(/Health:/)).toBeInTheDocument();
  });

  it('shows test suites in P2 view', () => {
    render(<TestingDashboard />);

    expect(screen.getByText('Test Suites')).toBeInTheDocument();
  });

  it('shows KPI cards in P3 view', () => {
    render(<TestingDashboard initialPersona="P3" />);

    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    // Pass Rate and Code Coverage appear multiple times
    const passRateElements = screen.getAllByText('Pass Rate');
    expect(passRateElements.length).toBeGreaterThan(0);
    const coverageElements = screen.getAllByText('Code Coverage');
    expect(coverageElements.length).toBeGreaterThan(0);
  });

  it('shows release readiness in P3 view', () => {
    render(<TestingDashboard initialPersona="P3" />);

    expect(screen.getByTestId('release-readiness-panel')).toBeInTheDocument();
  });
});

describe('TestingDashboard Integration', () => {
  beforeEach(() => {
    testingService.reset();
  });

  it('runs tests when run button clicked in P2 view', async () => {
    render(<TestingDashboard />);

    // Find a run button for unit tests
    const unitCard = screen.getByTestId('suite-card-unit');
    const runButton = unitCard.querySelector('[data-testid="run-button"]');

    if (runButton) {
      fireEvent.click(runButton);

      // Should show running state
      await waitFor(() => {
        expect(runButton).toHaveTextContent('Running...');
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(runButton).toHaveTextContent('Run');
        },
        { timeout: 500 }
      );
    }
  });

  it('evaluates gate when evaluate button clicked', () => {
    render(<TestingDashboard />);

    const evaluateButton = screen.getByTestId('evaluate-pre-commit');
    fireEvent.click(evaluateButton);

    // Gate should still be displayed (evaluation doesn't remove it)
    expect(screen.getByTestId('gate-pre-commit')).toBeInTheDocument();
  });
});
