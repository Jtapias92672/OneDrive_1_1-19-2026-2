/**
 * FORGE CARS Framework API
 *
 * GET /api/cars - Returns current CARS autonomy status
 *
 * This endpoint provides dashboard-friendly CARS status.
 * For full risk assessments, use the MCP Gateway /api/v1/assess endpoint.
 */

import { NextResponse } from 'next/server';
import type { CarsStatus, Gate } from '@/lib/dashboard/types';

// In-memory state for demo (would connect to real CARS engine in production)
interface CARSState {
  currentRiskLevel: number;
  pendingApprovals: number;
  recentAssessments: Array<{
    tool: string;
    risk: number;
    approved: boolean;
  }>;
  gates: Gate[];
}

let carsState: CARSState = {
  currentRiskLevel: 1,
  pendingApprovals: 0,
  recentAssessments: [],
  gates: [
    { name: 'Code Generation', status: 'auto', risk: 'low' },
    { name: 'File Write', status: 'auto', risk: 'low' },
    { name: 'Deploy', status: 'supervised', risk: 'medium' },
    { name: 'Production Push', status: 'human', risk: 'high' },
  ],
};

/**
 * Get autonomy level based on risk
 */
function getAutonomyLevel(riskLevel: number): CarsStatus['autonomyLevel'] {
  if (riskLevel <= 1) return 'AUTONOMOUS';
  if (riskLevel <= 2) return 'SUPERVISED';
  return 'HUMAN_REQUIRED';
}

/**
 * Get mock CARS status based on demo mode
 */
function getMockCarsStatus(demoMode: 'normal' | 'warning' | 'critical'): CarsStatus {
  const riskLevel = demoMode === 'normal' ? 1 : demoMode === 'warning' ? 2 : 4;
  const pendingApprovals = demoMode === 'critical' ? 3 : demoMode === 'warning' ? 1 : 0;

  return {
    autonomyLevel: getAutonomyLevel(riskLevel),
    riskLevel,
    maxRisk: 4,
    pendingApprovals,
    gates: [
      { name: 'Code Generation', status: 'auto', risk: 'low' },
      {
        name: 'File Write',
        status: demoMode === 'critical' ? 'blocked' : 'auto',
        risk: demoMode === 'critical' ? 'high' : 'low',
      },
      { name: 'Deploy', status: 'supervised', risk: 'medium' },
      { name: 'Production Push', status: 'human', risk: 'high' },
    ],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockCarsStatus(demoMode));
  }

  // Return current CARS state
  const status: CarsStatus = {
    autonomyLevel: getAutonomyLevel(carsState.currentRiskLevel),
    riskLevel: carsState.currentRiskLevel,
    maxRisk: 4,
    pendingApprovals: carsState.pendingApprovals,
    gates: carsState.gates,
  };

  return NextResponse.json({
    ...status,
    _recentAssessments: carsState.recentAssessments.slice(0, 5),
  });
}

/**
 * POST /api/cars - Update CARS state (for testing/simulation)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, riskLevel, pendingApprovals, gate } = body as {
      action: 'setRisk' | 'setPending' | 'updateGate' | 'reset';
      riskLevel?: number;
      pendingApprovals?: number;
      gate?: { name: string; status: Gate['status'] };
    };

    switch (action) {
      case 'setRisk':
        if (typeof riskLevel === 'number') {
          carsState.currentRiskLevel = Math.max(0, Math.min(4, riskLevel));
        }
        break;
      case 'setPending':
        if (typeof pendingApprovals === 'number') {
          carsState.pendingApprovals = Math.max(0, pendingApprovals);
        }
        break;
      case 'updateGate':
        if (gate) {
          const existingGate = carsState.gates.find(g => g.name === gate.name);
          if (existingGate) {
            existingGate.status = gate.status;
          }
        }
        break;
      case 'reset':
        carsState = {
          currentRiskLevel: 1,
          pendingApprovals: 0,
          recentAssessments: [],
          gates: [
            { name: 'Code Generation', status: 'auto', risk: 'low' },
            { name: 'File Write', status: 'auto', risk: 'low' },
            { name: 'Deploy', status: 'supervised', risk: 'medium' },
            { name: 'Production Push', status: 'human', risk: 'high' },
          ],
        };
        break;
    }

    return NextResponse.json({
      autonomyLevel: getAutonomyLevel(carsState.currentRiskLevel),
      riskLevel: carsState.currentRiskLevel,
      maxRisk: 4,
      pendingApprovals: carsState.pendingApprovals,
      gates: carsState.gates,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
