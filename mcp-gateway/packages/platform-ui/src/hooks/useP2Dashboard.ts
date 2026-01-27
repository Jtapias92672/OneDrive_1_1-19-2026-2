'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComplianceStatus,
  DataTier,
  EvidencePack,
  PendingReview,
  OrganizationPolicy,
  AuditSummary,
} from '@/lib/persona/compliance-types';

interface P2DashboardData {
  complianceStatus: ComplianceStatus | null;
  dataTiers: DataTier[];
  evidencePacks: EvidencePack[];
  pendingReviews: PendingReview[];
  organizationPolicy: OrganizationPolicy | null;
  auditSummary: AuditSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface UseP2DashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useP2Dashboard(options: UseP2DashboardOptions = {}): P2DashboardData & {
  refresh: () => Promise<void>;
} {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const [data, setData] = useState<P2DashboardData>({
    complianceStatus: null,
    dataTiers: [],
    evidencePacks: [],
    pendingReviews: [],
    organizationPolicy: null,
    auditSummary: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const [
        complianceRes,
        evidenceRes,
        reviewsRes,
        policyRes,
        auditRes,
      ] = await Promise.all([
        fetch('/api/compliance/status'),
        fetch('/api/evidence-packs'),
        fetch('/api/reviews/pending'),
        fetch('/api/organization/policy'),
        fetch('/api/audit-trail/summary'),
      ]);

      if (!complianceRes.ok || !evidenceRes.ok || !reviewsRes.ok || !policyRes.ok || !auditRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [compliance, evidence, reviews, policy, audit] = await Promise.all([
        complianceRes.json(),
        evidenceRes.json(),
        reviewsRes.json(),
        policyRes.json(),
        auditRes.json(),
      ]);

      setData({
        complianceStatus: compliance.status,
        dataTiers: compliance.dataTiers,
        evidencePacks: evidence,
        pendingReviews: reviews,
        organizationPolicy: policy,
        auditSummary: audit,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...data,
    refresh: fetchData,
  };
}
