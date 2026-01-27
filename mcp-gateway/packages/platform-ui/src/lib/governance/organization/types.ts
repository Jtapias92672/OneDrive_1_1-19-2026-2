/**
 * Organization Policy Types
 */

export type ComplianceFramework =
  | 'SOC2'
  | 'CMMC'
  | 'HIPAA'
  | 'GDPR'
  | 'ISO27001'
  | 'FedRAMP';

export type PolicyStatus = 'active' | 'inactive' | 'draft';

export interface OrganizationPolicy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;

  // Configuration
  maxDataTier: 1 | 2 | 3 | 4;
  requireApprovalForProduction: boolean;
  requireEvidencePackForRelease: boolean;
  auditRetentionDays: number;

  // Compliance frameworks
  frameworks: ComplianceFramework[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export type ExceptionStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface PolicyException {
  id: string;
  policyId: string;
  requesterId: string;
  requesterName?: string;
  status: ExceptionStatus;

  // Exception details
  reason: string;
  scope: string;
  expiresAt: Date;

  // Review
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  reviewedAt?: Date;

  createdAt: Date;
}

export interface CreateExceptionRequest {
  policyId: string;
  requesterId: string;
  requesterName?: string;
  reason: string;
  scope: string;
  durationDays: number;
}
