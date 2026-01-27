import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { P2Dashboard } from '../P2Dashboard';
import { ComplianceStatusBanner } from '../ComplianceStatusBanner';
import { DataClassificationGuide } from '../DataClassificationGuide';
import { EvidencePackList } from '../EvidencePackList';
import { PendingReviews } from '../PendingReviews';
import { OrganizationPolicy } from '../OrganizationPolicy';
import { AuditTrailWidget } from '../AuditTrailWidget';
import {
  mockComplianceStatus,
  mockDataTiers,
  mockEvidencePacks,
  mockPendingReviews,
  mockOrganizationPolicy,
  mockAuditSummary,
} from '@/lib/persona/compliance-mock-data';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('P2Dashboard', () => {
  const defaultProps = {
    userName: 'Test User',
    complianceStatus: mockComplianceStatus,
    dataTiers: mockDataTiers,
    evidencePacks: mockEvidencePacks,
    pendingReviews: mockPendingReviews,
    organizationPolicy: mockOrganizationPolicy,
    auditSummary: mockAuditSummary,
  };

  it('renders welcome message with user name', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });

  it('renders security status when compliant', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText(/Security Status:/)).toBeInTheDocument();
  });

  it('renders dashboard type indicator', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText('Dashboard: Compliance')).toBeInTheDocument();
  });

  it('renders change dashboard button', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText('[Change]')).toBeInTheDocument();
  });

  it('calls onChangeDashboard when change button clicked', () => {
    const onChangeDashboard = jest.fn();
    render(<P2Dashboard {...defaultProps} onChangeDashboard={onChangeDashboard} />);
    fireEvent.click(screen.getByText('[Change]'));
    expect(onChangeDashboard).toHaveBeenCalledTimes(1);
  });

  it('renders all six dashboard widgets', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText('Data Classification Guide')).toBeInTheDocument();
    expect(screen.getByText('Recent Evidence Packs')).toBeInTheDocument();
    // "Pending Reviews" appears multiple times (header + status card), use getAllByText
    expect(screen.getAllByText('Pending Reviews').length).toBeGreaterThan(0);
    expect(screen.getByText('Organization Policy')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('shows policy violation status when not compliant', () => {
    const props = {
      ...defaultProps,
      complianceStatus: { ...mockComplianceStatus, policyCompliant: false },
    };
    render(<P2Dashboard {...props} />);
    expect(screen.getByText('Policy Violation Detected')).toBeInTheDocument();
  });

  it('shows pending reviews count when reviews exist', () => {
    render(<P2Dashboard {...defaultProps} />);
    expect(screen.getByText('2 Reviews Pending')).toBeInTheDocument();
  });
});

describe('ComplianceStatusBanner', () => {
  it('renders policy status', () => {
    render(<ComplianceStatusBanner status={mockComplianceStatus} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('renders max data tier', () => {
    render(<ComplianceStatusBanner status={mockComplianceStatus} />);
    expect(screen.getByText('Tier 3')).toBeInTheDocument();
  });

  it('renders evidence pack count', () => {
    render(<ComplianceStatusBanner status={mockComplianceStatus} />);
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('renders pending review count', () => {
    render(<ComplianceStatusBanner status={mockComplianceStatus} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows non-compliant when policy violated', () => {
    const status = { ...mockComplianceStatus, policyCompliant: false };
    render(<ComplianceStatusBanner status={status} />);
    expect(screen.getByText('Non-Compliant')).toBeInTheDocument();
  });
});

describe('DataClassificationGuide', () => {
  it('renders section header', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    expect(screen.getByText('Data Classification Guide')).toBeInTheDocument();
  });

  it('renders all four tiers', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Confidential')).toBeInTheDocument();
    expect(screen.getByText('Restricted')).toBeInTheDocument();
  });

  it('renders learn more link', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    expect(screen.getByText('Learn About Data Classification →')).toBeInTheDocument();
  });

  it('collapses when header clicked', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    fireEvent.click(screen.getByText('Data Classification Guide'));
    expect(screen.queryByText('Learn About Data Classification →')).not.toBeInTheDocument();
  });

  it('expands when header clicked again', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    fireEvent.click(screen.getByText('Data Classification Guide'));
    fireEvent.click(screen.getByText('Data Classification Guide'));
    expect(screen.getByText('Learn About Data Classification →')).toBeInTheDocument();
  });

  it('starts collapsed when initialCollapsed is true', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} initialCollapsed />);
    expect(screen.queryByText('Learn About Data Classification →')).not.toBeInTheDocument();
  });

  it('shows warning for tier 4', () => {
    render(<DataClassificationGuide tiers={mockDataTiers} />);
    expect(screen.getByText('⚠ Not Approved')).toBeInTheDocument();
  });
});

describe('EvidencePackList', () => {
  it('renders section header', () => {
    render(<EvidencePackList packs={mockEvidencePacks} />);
    expect(screen.getByText('Recent Evidence Packs')).toBeInTheDocument();
  });

  it('renders pack IDs', () => {
    render(<EvidencePackList packs={mockEvidencePacks} />);
    expect(screen.getByText('EP-2026-0126-001')).toBeInTheDocument();
  });

  it('renders framework badges', () => {
    render(<EvidencePackList packs={mockEvidencePacks} />);
    expect(screen.getByText('SOC2')).toBeInTheDocument();
    expect(screen.getByText('CMMC')).toBeInTheDocument();
  });

  it('renders download buttons', () => {
    render(<EvidencePackList packs={mockEvidencePacks} />);
    const downloadButtons = screen.getAllByText('Download');
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('renders view all link', () => {
    render(<EvidencePackList packs={mockEvidencePacks} />);
    expect(screen.getByText('View All Evidence →')).toBeInTheDocument();
  });

  it('calls onDownload when download clicked', () => {
    const onDownload = jest.fn();
    render(<EvidencePackList packs={mockEvidencePacks} onDownload={onDownload} />);
    fireEvent.click(screen.getAllByText('Download')[0]);
    expect(onDownload).toHaveBeenCalledWith(mockEvidencePacks[0]);
  });
});

describe('PendingReviews', () => {
  it('renders section header', () => {
    render(<PendingReviews reviews={mockPendingReviews} />);
    expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
  });

  it('renders project names', () => {
    render(<PendingReviews reviews={mockPendingReviews} />);
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('renders review now buttons', () => {
    render(<PendingReviews reviews={mockPendingReviews} />);
    const reviewButtons = screen.getAllByText('Review Now');
    expect(reviewButtons.length).toBe(2);
  });

  it('shows empty state when no reviews', () => {
    render(<PendingReviews reviews={[]} />);
    expect(screen.getByText('No pending reviews')).toBeInTheDocument();
  });

  it('calls onReview when review button clicked', () => {
    const onReview = jest.fn();
    render(<PendingReviews reviews={mockPendingReviews} onReview={onReview} />);
    fireEvent.click(screen.getAllByText('Review Now')[0]);
    expect(onReview).toHaveBeenCalledWith(mockPendingReviews[0]);
  });
});

describe('OrganizationPolicy', () => {
  it('renders section header', () => {
    render(<OrganizationPolicy policy={mockOrganizationPolicy} />);
    expect(screen.getByText('Organization Policy')).toBeInTheDocument();
  });

  it('renders policy name', () => {
    render(<OrganizationPolicy policy={mockOrganizationPolicy} />);
    expect(screen.getByText('Acme Corp AI Usage Policy')).toBeInTheDocument();
  });

  it('renders active status', () => {
    render(<OrganizationPolicy policy={mockOrganizationPolicy} />);
    expect(screen.getByText('✓ Active')).toBeInTheDocument();
  });

  it('renders view policy details button', () => {
    render(<OrganizationPolicy policy={mockOrganizationPolicy} />);
    expect(screen.getByText('View Policy Details')).toBeInTheDocument();
  });

  it('renders request exception button', () => {
    render(<OrganizationPolicy policy={mockOrganizationPolicy} />);
    expect(screen.getByText('Request Exception')).toBeInTheDocument();
  });

  it('calls onViewDetails when button clicked', () => {
    const onViewDetails = jest.fn();
    render(<OrganizationPolicy policy={mockOrganizationPolicy} onViewDetails={onViewDetails} />);
    fireEvent.click(screen.getByText('View Policy Details'));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });
});

describe('AuditTrailWidget', () => {
  it('renders section header', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders event count', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('234')).toBeInTheDocument();
  });

  it('renders period text', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('events in last 7 days')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('renders retention note', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('Retention: 7 years')).toBeInTheDocument();
  });

  it('calls onExport with format when clicked', () => {
    const onExport = jest.fn();
    render(<AuditTrailWidget summary={mockAuditSummary} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export CSV'));
    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('renders view full trail link', () => {
    render(<AuditTrailWidget summary={mockAuditSummary} />);
    expect(screen.getByText('View Full Trail →')).toBeInTheDocument();
  });
});
