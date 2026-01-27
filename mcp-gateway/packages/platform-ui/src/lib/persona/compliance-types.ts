// ============================================================================
// COMPLIANCE DASHBOARD TYPES
// Epic 15: P2 Dashboard (Hesitant Champion)
// ============================================================================

export interface ComplianceStatus {
  policyCompliant: boolean;
  maxDataTier: 1 | 2 | 3 | 4;
  evidencePackCount: number;
  pendingReviewCount: number;
}

export type ComplianceLevel = 'compliant' | 'pending' | 'violation';

export interface DataTier {
  tier: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  approved: boolean;
  requiresReview: boolean;
  icon: 'check' | 'warning' | 'lock';
}

export type ComplianceFramework = 'SOC2' | 'CMMC' | 'HIPAA' | 'GDPR' | 'ISO27001' | 'FedRAMP';

export interface EvidencePack {
  id: string;
  description: string;
  framework: ComplianceFramework;
  generatedAt: string;
  downloadUrl: string;
  auditUrl: string;
}

export interface PendingReview {
  id: string;
  projectName: string;
  reason: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
}

export interface OrganizationPolicy {
  name: string;
  status: 'active' | 'inactive' | 'pending';
  lastUpdated: string;
  detailsUrl: string;
  exceptionRequestUrl: string;
}

export interface AuditSummary {
  eventCount: number;
  periodDays: number;
  retentionYears: number;
  exportFormats: ('csv' | 'json')[];
}

export interface P2DashboardData {
  compliance: ComplianceStatus;
  dataTiers: DataTier[];
  evidencePacks: EvidencePack[];
  pendingReviews: PendingReview[];
  organizationPolicy: OrganizationPolicy;
  auditSummary: AuditSummary;
}
