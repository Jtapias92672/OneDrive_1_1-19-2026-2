'use client';

import { ComplianceStatusBanner } from './ComplianceStatusBanner';
import { DataClassificationGuide } from './DataClassificationGuide';
import { EvidencePackList } from './EvidencePackList';
import { PendingReviews } from './PendingReviews';
import { OrganizationPolicy } from './OrganizationPolicy';
import { AuditTrailWidget } from './AuditTrailWidget';
import {
  ComplianceStatus,
  DataTier,
  EvidencePack,
  PendingReview,
  OrganizationPolicy as OrgPolicyType,
  AuditSummary,
} from '@/lib/persona/compliance-types';

interface P2DashboardProps {
  userName?: string;
  complianceStatus: ComplianceStatus;
  dataTiers: DataTier[];
  evidencePacks: EvidencePack[];
  pendingReviews: PendingReview[];
  organizationPolicy: OrgPolicyType;
  auditSummary: AuditSummary;
  onChangeDashboard?: () => void;
}

function getSecurityStatusText(status: ComplianceStatus): { text: string; color: string } {
  if (!status.policyCompliant) {
    return { text: 'Policy Violation Detected', color: 'text-red-600' };
  }
  if (status.pendingReviewCount > 0) {
    return { text: `${status.pendingReviewCount} Reviews Pending`, color: 'text-amber-600' };
  }
  return { text: 'All Clear', color: 'text-green-600' };
}

export function P2Dashboard({
  userName = 'User',
  complianceStatus,
  dataTiers,
  evidencePacks,
  pendingReviews,
  organizationPolicy,
  auditSummary,
  onChangeDashboard,
}: P2DashboardProps) {
  const securityStatus = getSecurityStatusText(complianceStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back, {userName}
              </h1>
              <p className="text-sm mt-1">
                <span className="text-gray-500">Security Status: </span>
                <span className={`font-medium ${securityStatus.color}`}>
                  {securityStatus.text} {securityStatus.color === 'text-green-600' && '✓'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Dashboard: Compliance</span>
              <button
                onClick={onChangeDashboard}
                className="text-blue-600 hover:text-blue-700"
              >
                [Change]
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compliance Status Banner - Full Width */}
        <div className="mb-6">
          <ComplianceStatusBanner status={complianceStatus} />
        </div>

        {/* Data Classification Guide - Full Width */}
        <div className="mb-6">
          <DataClassificationGuide tiers={dataTiers} />
        </div>

        {/* Main Grid - 50/50 Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Evidence Packs */}
          <EvidencePackList packs={evidencePacks} />

          {/* Pending Reviews */}
          <PendingReviews reviews={pendingReviews} />
        </div>

        {/* Bottom Row - 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Policy */}
          <OrganizationPolicy policy={organizationPolicy} />

          {/* Audit Trail */}
          <AuditTrailWidget summary={auditSummary} />
        </div>
      </main>
    </div>
  );
}
