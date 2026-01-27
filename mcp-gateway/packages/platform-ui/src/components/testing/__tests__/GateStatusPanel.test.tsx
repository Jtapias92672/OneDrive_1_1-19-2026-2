/**
 * GateStatusPanel Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GateStatusPanel } from '../GateStatusPanel';
import { GateStatus } from '@/lib/api/testing';

describe('GateStatusPanel', () => {
  const mockGates: GateStatus[] = [
    {
      name: 'pre-commit',
      status: 'OPEN',
      requiredSuites: ['unit'],
      passedSuites: ['unit'],
      lastEvaluation: new Date().toISOString(),
      threshold: 100,
    },
    {
      name: 'pre-merge',
      status: 'CLOSED',
      requiredSuites: ['unit', 'sanity'],
      passedSuites: ['unit'],
      lastEvaluation: new Date().toISOString(),
      threshold: 100,
      blockers: ['sanity tests not passing'],
    },
    {
      name: 'pre-deploy-production',
      status: 'PENDING',
      requiredSuites: ['regression'],
      passedSuites: [],
      lastEvaluation: new Date().toISOString(),
      threshold: 100,
    },
  ];

  const mockOnEvaluate = jest.fn();

  beforeEach(() => {
    mockOnEvaluate.mockClear();
  });

  it('renders all gates', () => {
    render(<GateStatusPanel gates={mockGates} />);

    expect(screen.getByText('Pre Commit')).toBeInTheDocument();
    expect(screen.getByText('Pre Merge')).toBeInTheDocument();
    expect(screen.getByText('Pre Deploy Production')).toBeInTheDocument();
  });

  it('shows gate count summary', () => {
    render(<GateStatusPanel gates={mockGates} />);

    expect(screen.getByText('1/3 Open')).toBeInTheDocument();
  });

  it('shows OPEN status with checkmark', () => {
    render(<GateStatusPanel gates={mockGates} />);

    const preCommit = screen.getByTestId('gate-pre-commit');
    expect(preCommit).toHaveTextContent('✓');
    expect(preCommit.className).toContain('border-green');
  });

  it('shows CLOSED status with X', () => {
    render(<GateStatusPanel gates={mockGates} />);

    const preMerge = screen.getByTestId('gate-pre-merge');
    expect(preMerge).toHaveTextContent('✗');
    expect(preMerge.className).toContain('border-red');
  });

  it('shows PENDING status with circle', () => {
    render(<GateStatusPanel gates={mockGates} />);

    const preDeploy = screen.getByTestId('gate-pre-deploy-production');
    expect(preDeploy).toHaveTextContent('○');
    expect(preDeploy.className).toContain('border-yellow');
  });

  it('shows blockers when present', () => {
    render(<GateStatusPanel gates={mockGates} showDetails />);

    expect(screen.getByText('sanity tests not passing')).toBeInTheDocument();
  });

  it('shows required suites with pass/fail indicators', () => {
    render(<GateStatusPanel gates={mockGates} showDetails />);

    // pre-commit and pre-merge both show unit (one passed)
    const unitIndicators = screen.getAllByText('✓ unit');
    expect(unitIndicators.length).toBeGreaterThan(0);
    // pre-merge has sanity failing
    expect(screen.getByText('✗ sanity')).toBeInTheDocument();
  });

  it('calls onEvaluateGate when re-evaluate clicked', () => {
    render(<GateStatusPanel gates={mockGates} onEvaluateGate={mockOnEvaluate} />);

    fireEvent.click(screen.getByTestId('evaluate-pre-commit'));
    expect(mockOnEvaluate).toHaveBeenCalledWith('pre-commit');
  });

  it('hides details when showDetails is false', () => {
    render(<GateStatusPanel gates={mockGates} showDetails={false} />);

    expect(screen.queryByText('Blockers:')).not.toBeInTheDocument();
  });
});
