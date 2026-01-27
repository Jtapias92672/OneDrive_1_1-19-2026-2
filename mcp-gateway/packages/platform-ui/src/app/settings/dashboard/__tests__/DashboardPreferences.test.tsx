import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPreferencesPage from '../page';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock forgeSignals
jest.mock('@/lib/signals', () => ({
  forgeSignals: {
    track: jest.fn(),
  },
}));

import { forgeSignals } from '@/lib/signals';

describe('DashboardPreferencesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page header', () => {
    render(<DashboardPreferencesPage />);

    expect(screen.getByText('Dashboard Preferences')).toBeInTheDocument();
    expect(
      screen.getByText('Choose the dashboard style that best fits your workflow')
    ).toBeInTheDocument();
  });

  it('renders current dashboard section', () => {
    render(<DashboardPreferencesPage />);

    expect(screen.getByText('Current Dashboard')).toBeInTheDocument();
    // Multiple instances of Reliability Focus (current section + option card)
    expect(screen.getAllByText('Reliability Focus').length).toBeGreaterThan(0);
  });

  it('renders all three dashboard options', () => {
    render(<DashboardPreferencesPage />);

    // Multiple instances due to current section + option cards
    expect(screen.getAllByText('Reliability Focus').length).toBeGreaterThan(0);
    expect(screen.getByText('Compliance Focus')).toBeInTheDocument();
    expect(screen.getByText('Capability Focus')).toBeInTheDocument();
  });

  it('shows preview thumbnails', () => {
    render(<DashboardPreferencesPage />);

    // Each dashboard has an emoji as thumbnail
    expect(screen.getAllByText(/📊|🔒|🚀/).length).toBe(3);
  });

  it('shows features for each dashboard', () => {
    render(<DashboardPreferencesPage />);

    expect(screen.getByText('Reliability indicators')).toBeInTheDocument();
    expect(screen.getByText('Compliance status')).toBeInTheDocument();
    expect(screen.getByText('Frontier map')).toBeInTheDocument();
  });

  it('marks current dashboard as active', () => {
    render(<DashboardPreferencesPage />);

    expect(screen.getByText('Currently active')).toBeInTheDocument();
  });

  it('shows confirmation dialog when selecting different dashboard', () => {
    render(<DashboardPreferencesPage />);

    // Click on Compliance dashboard (different from current)
    const complianceCards = screen.getAllByText('Compliance Focus');
    // Find the clickable card (not the one in current dashboard section)
    const clickableCard = complianceCards.find((el) => el.closest('button'));
    fireEvent.click(clickableCard!);

    expect(screen.getByText('Change Dashboard Style?')).toBeInTheDocument();
  });

  it('tracks persona_override signal on confirm', () => {
    render(<DashboardPreferencesPage />);

    // Click on Compliance dashboard
    const complianceCards = screen.getAllByText('Compliance Focus');
    const clickableCard = complianceCards.find((el) => el.closest('button'));
    fireEvent.click(clickableCard!);

    // Confirm the change
    fireEvent.click(screen.getByText('Confirm Change'));

    expect(forgeSignals.track).toHaveBeenCalledWith('persona_override', {
      fromPersona: 'disappointed',
      toPersona: 'hesitant',
      dashboardRoute: '/dashboard/compliance',
    });
  });

  it('redirects to new dashboard on confirm', () => {
    render(<DashboardPreferencesPage />);

    // Click on Compliance dashboard
    const complianceCards = screen.getAllByText('Compliance Focus');
    const clickableCard = complianceCards.find((el) => el.closest('button'));
    fireEvent.click(clickableCard!);

    // Confirm
    fireEvent.click(screen.getByText('Confirm Change'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/compliance');
  });

  it('closes confirmation dialog on cancel', () => {
    render(<DashboardPreferencesPage />);

    // Click on Compliance dashboard
    const complianceCards = screen.getAllByText('Compliance Focus');
    const clickableCard = complianceCards.find((el) => el.closest('button'));
    fireEvent.click(clickableCard!);

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Change Dashboard Style?')).not.toBeInTheDocument();
  });

  it('navigates back on back button click', () => {
    render(<DashboardPreferencesPage />);

    fireEvent.click(screen.getByText('Back to Dashboard'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('shows info about unlimited changes', () => {
    render(<DashboardPreferencesPage />);

    expect(
      screen.getByText(/You can change your dashboard style at any time/)
    ).toBeInTheDocument();
  });
});
