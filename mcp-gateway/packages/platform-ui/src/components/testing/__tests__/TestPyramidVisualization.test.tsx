/**
 * TestPyramidVisualization Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestPyramidVisualization } from '../TestPyramidVisualization';
import { TestMetrics } from '@/lib/api/testing';

describe('TestPyramidVisualization', () => {
  const mockMetrics: TestMetrics = {
    coverage: {
      overall: 97.5,
      byPackage: {},
    },
    testCounts: {
      unit: 876,
      story: 0,
      e2e: 46,
      total: 922,
    },
    passRates: {
      unit: 100,
      story: 100,
      e2e: 98,
      regression: 100,
    },
    trends: [],
    timing: {
      smoke: 500,
      sanity: 1000,
      regression: 3500,
    },
  };

  it('renders pyramid levels', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    expect(screen.getByTestId('pyramid-level-e2e')).toBeInTheDocument();
    expect(screen.getByTestId('pyramid-level-story')).toBeInTheDocument();
    expect(screen.getByTestId('pyramid-level-unit')).toBeInTheDocument();
  });

  it('shows test counts for each level', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    expect(screen.getByText('876 tests')).toBeInTheDocument();
    expect(screen.getByText('46 tests')).toBeInTheDocument();
  });

  it('shows pass rates', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    // Multiple 100% values exist (unit, story, regression)
    const hundredPcts = screen.getAllByText('100%');
    expect(hundredPcts.length).toBeGreaterThan(0);
    expect(screen.getByText('98%')).toBeInTheDocument();
  });

  it('shows timing when showTiming is true', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} showTiming />);

    expect(screen.getByText('3.5s')).toBeInTheDocument();
  });

  it('shows subset legend', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    expect(screen.getByText('Smoke (critical paths)')).toBeInTheDocument();
    expect(screen.getByText('Sanity (major components)')).toBeInTheDocument();
  });

  it('shows summary stats', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    expect(screen.getByText('922')).toBeInTheDocument();
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    expect(screen.getByText('97.5%')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });

  it('renders pyramid title', () => {
    render(<TestPyramidVisualization metrics={mockMetrics} />);

    expect(screen.getByText('Testing Pyramid')).toBeInTheDocument();
  });
});
