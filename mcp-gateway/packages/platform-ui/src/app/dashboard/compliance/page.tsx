'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { P2Dashboard } from '@/components/dashboards/p2-compliance';
import { useP2Dashboard } from '@/hooks/useP2Dashboard';
import {
  mockComplianceStatus,
  mockDataTiers,
  mockEvidencePacks,
  mockPendingReviews,
  mockOrganizationPolicy,
  mockAuditSummary,
} from '@/lib/persona/compliance-mock-data';
import { forgeSignals } from '@/lib/signals';

export default function ComplianceDashboardPage() {
  const router = useRouter();
  const {
    complianceStatus,
    dataTiers,
    evidencePacks,
    pendingReviews,
    organizationPolicy,
    auditSummary,
    isLoading,
    error,
  } = useP2Dashboard();

  // Track page view
  useEffect(() => {
    forgeSignals.track('page_viewed', { page: 'dashboard/compliance' });
  }, []);

  // Use mock data as fallback during development
  const displayComplianceStatus = complianceStatus ?? mockComplianceStatus;
  const displayDataTiers = dataTiers.length > 0 ? dataTiers : mockDataTiers;
  const displayEvidencePacks = evidencePacks.length > 0 ? evidencePacks : mockEvidencePacks;
  const displayPendingReviews = pendingReviews.length > 0 ? pendingReviews : mockPendingReviews;
  const displayOrganizationPolicy = organizationPolicy ?? mockOrganizationPolicy;
  const displayAuditSummary = auditSummary ?? mockAuditSummary;

  const handleChangeDashboard = () => {
    router.push('/settings/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <P2Dashboard
      userName="User"
      complianceStatus={displayComplianceStatus}
      dataTiers={displayDataTiers}
      evidencePacks={displayEvidencePacks}
      pendingReviews={displayPendingReviews}
      organizationPolicy={displayOrganizationPolicy}
      auditSummary={displayAuditSummary}
      onChangeDashboard={handleChangeDashboard}
    />
  );
}
