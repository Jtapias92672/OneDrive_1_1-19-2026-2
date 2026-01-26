/**
 * FORGE Supply Chain API
 *
 * GET /api/supply-chain - Returns supply chain verification status
 */

import { NextResponse } from 'next/server';
import type { SupplyChain } from '@/lib/dashboard/types';

// In-memory state (would connect to real supply-chain verifier in production)
let supplyChainState: SupplyChain = {
  totalDeps: 47,
  verifiedDeps: 47,
  slsaLevel: 3,
  signaturesValid: true,
  lastAudit: '15 min ago',
  vulnerabilities: 0,
  sbomGenerated: true,
};

/**
 * Get mock supply chain status based on demo mode
 */
function getMockSupplyChain(demoMode: 'normal' | 'warning' | 'critical'): SupplyChain {
  return {
    totalDeps: 47,
    verifiedDeps: demoMode === 'critical' ? 44 : 47,
    slsaLevel: demoMode === 'critical' ? 2 : 3,
    signaturesValid: demoMode !== 'critical',
    lastAudit: demoMode === 'critical' ? '2 days ago' : '15 min ago',
    vulnerabilities: demoMode === 'critical' ? 2 : 0,
    sbomGenerated: true,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockSupplyChain(demoMode));
  }

  return NextResponse.json({
    ...supplyChainState,
    _source: 'state',
  });
}

/**
 * POST /api/supply-chain - Update supply chain state (for testing)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...updates } = body as {
      action: 'update' | 'reset' | 'addVulnerability';
      verifiedDeps?: number;
      slsaLevel?: number;
      signaturesValid?: boolean;
      vulnerabilities?: number;
    };

    switch (action) {
      case 'update':
        supplyChainState = { ...supplyChainState, ...updates };
        break;
      case 'addVulnerability':
        supplyChainState.vulnerabilities += 1;
        break;
      case 'reset':
        supplyChainState = {
          totalDeps: 47,
          verifiedDeps: 47,
          slsaLevel: 3,
          signaturesValid: true,
          lastAudit: 'just now',
          vulnerabilities: 0,
          sbomGenerated: true,
        };
        break;
    }

    return NextResponse.json(supplyChainState);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
