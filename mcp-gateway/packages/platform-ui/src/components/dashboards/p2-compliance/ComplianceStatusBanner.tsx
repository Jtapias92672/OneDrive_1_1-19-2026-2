'use client';

import { ComplianceStatus, ComplianceLevel } from '@/lib/persona/compliance-types';

interface ComplianceStatusBannerProps {
  status: ComplianceStatus;
}

function getComplianceLevel(status: ComplianceStatus): ComplianceLevel {
  if (!status.policyCompliant) return 'violation';
  if (status.pendingReviewCount > 0) return 'pending';
  return 'compliant';
}

const levelStyles: Record<ComplianceLevel, { bg: string; border: string }> = {
  compliant: { bg: 'bg-green-600/5', border: 'border-green-200' },
  pending: { bg: 'bg-amber-500/5', border: 'border-amber-200' },
  violation: { bg: 'bg-red-500/5', border: 'border-red-200' },
};

export function ComplianceStatusBanner({ status }: ComplianceStatusBannerProps) {
  const level = getComplianceLevel(status);
  const styles = levelStyles[level];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`} style={{ minHeight: '120px' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          label="Policy Status"
          value={status.policyCompliant ? 'Compliant' : 'Non-Compliant'}
          icon={status.policyCompliant ? <CheckIcon /> : <XIcon />}
          variant={status.policyCompliant ? 'success' : 'danger'}
        />
        <StatusCard
          label="Max Data Tier"
          value={`Tier ${status.maxDataTier}`}
          icon={<TierIcon tier={status.maxDataTier} />}
          variant={status.maxDataTier <= 3 ? 'neutral' : 'warning'}
        />
        <StatusCard
          label="Evidence Packs"
          value={status.evidencePackCount.toString()}
          icon={<PackageIcon />}
          variant="neutral"
        />
        <StatusCard
          label="Pending Reviews"
          value={status.pendingReviewCount.toString()}
          icon={<ClockIcon />}
          variant={status.pendingReviewCount > 0 ? 'warning' : 'success'}
        />
      </div>
    </div>
  );
}

interface StatusCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

function StatusCard({ label, value, icon, variant }: StatusCardProps) {
  const textColors: Record<string, string> = {
    success: 'text-green-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    neutral: 'text-gray-700',
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className={textColors[variant]}>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${textColors[variant]}`}>{value}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TierIcon({ tier }: { tier: number }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
