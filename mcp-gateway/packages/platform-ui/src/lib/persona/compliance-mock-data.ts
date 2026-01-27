// ============================================================================
// COMPLIANCE DASHBOARD MOCK DATA
// Epic 15: P2 Dashboard (Hesitant Champion)
// ============================================================================

import {
  ComplianceStatus,
  DataTier,
  EvidencePack,
  PendingReview,
  OrganizationPolicy,
  AuditSummary,
} from './compliance-types';

export const mockComplianceStatus: ComplianceStatus = {
  policyCompliant: true,
  maxDataTier: 3,
  evidencePackCount: 47,
  pendingReviewCount: 2,
};

export const mockDataTiers: DataTier[] = [
  {
    tier: 1,
    name: 'Public',
    description: 'Publicly available information',
    approved: true,
    requiresReview: false,
    icon: 'check',
  },
  {
    tier: 2,
    name: 'Internal',
    description: 'Internal business information',
    approved: true,
    requiresReview: false,
    icon: 'check',
  },
  {
    tier: 3,
    name: 'Confidential',
    description: 'Sensitive business data',
    approved: true,
    requiresReview: true,
    icon: 'check',
  },
  {
    tier: 4,
    name: 'Restricted',
    description: 'Highly sensitive or regulated data',
    approved: false,
    requiresReview: true,
    icon: 'warning',
  },
];

export const mockEvidencePacks: EvidencePack[] = [
  {
    id: 'EP-2026-0126-001',
    description: 'Dashboard UI Components',
    framework: 'SOC2',
    generatedAt: '2026-01-26T10:30:00Z',
    downloadUrl: '/api/evidence-packs/EP-2026-0126-001/download',
    auditUrl: '/api/evidence-packs/EP-2026-0126-001/audit',
  },
  {
    id: 'EP-2026-0125-003',
    description: 'API Gateway Integration',
    framework: 'CMMC',
    generatedAt: '2026-01-25T14:15:00Z',
    downloadUrl: '/api/evidence-packs/EP-2026-0125-003/download',
    auditUrl: '/api/evidence-packs/EP-2026-0125-003/audit',
  },
  {
    id: 'EP-2026-0124-002',
    description: 'User Authentication Flow',
    framework: 'HIPAA',
    generatedAt: '2026-01-24T09:00:00Z',
    downloadUrl: '/api/evidence-packs/EP-2026-0124-002/download',
    auditUrl: '/api/evidence-packs/EP-2026-0124-002/audit',
  },
  {
    id: 'EP-2026-0123-001',
    description: 'Data Processing Pipeline',
    framework: 'GDPR',
    generatedAt: '2026-01-23T16:45:00Z',
    downloadUrl: '/api/evidence-packs/EP-2026-0123-001/download',
    auditUrl: '/api/evidence-packs/EP-2026-0123-001/audit',
  },
];

export const mockPendingReviews: PendingReview[] = [
  {
    id: 'pr-001',
    projectName: 'Project Alpha',
    reason: 'Awaiting security scan',
    submittedAt: '2026-01-26T08:00:00Z',
    priority: 'high',
  },
  {
    id: 'pr-002',
    projectName: 'Project Beta',
    reason: 'Awaiting data classification review',
    submittedAt: '2026-01-25T11:30:00Z',
    priority: 'medium',
  },
];

export const mockOrganizationPolicy: OrganizationPolicy = {
  name: 'Acme Corp AI Usage Policy',
  status: 'active',
  lastUpdated: '2026-01-15T00:00:00Z',
  detailsUrl: '/policies/ai-usage',
  exceptionRequestUrl: '/policies/exception-request',
};

export const mockAuditSummary: AuditSummary = {
  eventCount: 234,
  periodDays: 7,
  retentionYears: 7,
  exportFormats: ['csv', 'json'],
};
