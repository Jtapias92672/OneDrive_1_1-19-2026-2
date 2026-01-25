'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DemoMode } from '@/lib/dashboard/types';
import {
  getEpicProgress,
  getSessionTokens,
  getAgentMemory,
  getEvidencePacks,
  getCarsStatus,
  getSupplyChain,
  getGuardrails,
  getVerification,
  type EpicProgress,
  type TokenUsage,
} from '@/lib/dashboard/api-client';
import type {
  AgentMemory,
  EvidencePacks,
  CarsStatus,
  SupplyChain,
  VerificationItem,
} from '@/lib/dashboard/types';
import type { GuardrailsResponse } from '@/lib/dashboard/api-client';

interface DashboardDataState {
  epicProgress: EpicProgress | null;
  tokenUsage: TokenUsage | null;
  agentMemory: AgentMemory | null;
  evidencePacks: EvidencePacks | null;
  carsStatus: CarsStatus | null;
  supplyChain: SupplyChain | null;
  guardrails: GuardrailsResponse | null;
  verification: VerificationItem[] | null;
}

interface DashboardDataHook extends DashboardDataState {
  isLoading: boolean;
  errors: Partial<Record<keyof DashboardDataState, Error>>;
  refresh: () => Promise<void>;
  refreshSection: (section: keyof DashboardDataState) => Promise<void>;
}

/**
 * Hook for fetching all dashboard data with loading/error states
 */
export function useDashboardData(
  demoMode: DemoMode,
  useMock: boolean = true
): DashboardDataHook {
  const [data, setData] = useState<DashboardDataState>({
    epicProgress: null,
    tokenUsage: null,
    agentMemory: null,
    evidencePacks: null,
    carsStatus: null,
    supplyChain: null,
    guardrails: null,
    verification: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof DashboardDataState, Error>>>({});

  const fetchSection = useCallback(
    async <K extends keyof DashboardDataState>(
      key: K,
      fetcher: () => Promise<DashboardDataState[K]>
    ) => {
      try {
        const result = await fetcher();
        setData((prev) => ({ ...prev, [key]: result }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setErrors((prev) => ({ ...prev, [key]: err }));
        console.error(`Failed to fetch ${key}:`, err);
        return null;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    // Create fetchOptions inside useCallback to avoid stale closure
    const opts = { useMock, demoMode };
    console.log('[useDashboardData] refresh called with useMock:', useMock, 'demoMode:', demoMode);

    setIsLoading(true);
    setErrors({});

    await Promise.allSettled([
      fetchSection('epicProgress', () => getEpicProgress(opts)),
      fetchSection('tokenUsage', () => getSessionTokens(opts)),
      fetchSection('agentMemory', () => getAgentMemory(opts)),
      fetchSection('evidencePacks', () => getEvidencePacks(opts)),
      fetchSection('carsStatus', () => getCarsStatus(opts)),
      fetchSection('supplyChain', () => getSupplyChain(opts)),
      fetchSection('guardrails', () => getGuardrails(opts)),
      fetchSection('verification', () => getVerification(opts)),
    ]);

    setIsLoading(false);
  }, [fetchSection, demoMode, useMock]);

  const refreshSection = useCallback(
    async (section: keyof DashboardDataState) => {
      // Create opts inside to avoid stale closure
      const opts = { useMock, demoMode };
      const fetchers: Record<keyof DashboardDataState, () => Promise<unknown>> = {
        epicProgress: () => getEpicProgress(opts),
        tokenUsage: () => getSessionTokens(opts),
        agentMemory: () => getAgentMemory(opts),
        evidencePacks: () => getEvidencePacks(opts),
        carsStatus: () => getCarsStatus(opts),
        supplyChain: () => getSupplyChain(opts),
        guardrails: () => getGuardrails(opts),
        verification: () => getVerification(opts),
      };

      await fetchSection(section, fetchers[section] as () => Promise<DashboardDataState[typeof section]>);
    },
    [fetchSection, demoMode, useMock]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...data,
    isLoading,
    errors,
    refresh,
    refreshSection,
  };
}

/**
 * Hook for individual section data with loading state
 */
export function useSectionData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, ...deps]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
