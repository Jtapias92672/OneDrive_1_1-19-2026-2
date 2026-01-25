/**
 * FORGE Dashboard - Mock Data Service
 */

import type {
  DemoMode,
  AgentMemory,
  EvidencePacks,
  CarsStatus,
  SupplyChain,
  VerificationItem,
  FileItem,
  Task,
  GateStatus,
} from './types';

// ============================================
// AGENT MEMORY
// ============================================

export function getMockAgentMemory(demoMode: DemoMode = 'normal'): AgentMemory {
  return {
    session: {
      current: demoMode === 'critical' ? 35000 : demoMode === 'warning' ? 22000 : 8200,
      optimal: 15000,
      warning: 30000,
      danger: 40000,
    },
    guardrails: {
      dp09: {
        name: 'PII Recall',
        target: 99,
        current: demoMode === 'critical' ? 97.1 : 99.2,
        status: demoMode === 'critical' ? 'fail' : 'pass',
        critical: true,
      },
      dp10: {
        name: 'Secret Recall',
        target: 100,
        current: demoMode === 'critical' ? 98.5 : 100,
        status: demoMode === 'critical' ? 'fail' : 'pass',
        critical: true,
      },
    },
    lastSync: '2 min ago',
  };
}

// ============================================
// EVIDENCE PACKS
// ============================================

export function getMockEvidencePacks(demoMode: DemoMode = 'normal'): EvidencePacks {
  return {
    sessionPacks: demoMode === 'normal' ? 3 : demoMode === 'warning' ? 5 : 8,
    epicTotal: 12,
    lastGenerated: demoMode === 'critical' ? '15 min ago' : '2 min ago',
    cmmcReady: demoMode !== 'critical',
    dfarsCompliant: demoMode !== 'critical',
    recentPacks: [
      {
        id: 'EP-10b-007',
        task: 'WebSocket impl',
        timestamp: '2 min ago',
        size: '45 KB',
        signed: true,
      },
      {
        id: 'EP-10b-006',
        task: 'Auth middleware',
        timestamp: '15 min ago',
        size: '38 KB',
        signed: true,
      },
      {
        id: 'EP-10b-005',
        task: 'API routes',
        timestamp: '1 hr ago',
        size: '52 KB',
        signed: demoMode !== 'critical',
      },
    ],
  };
}

// ============================================
// CARS STATUS
// ============================================

export function getMockCarsStatus(demoMode: DemoMode = 'normal'): CarsStatus {
  const fileWriteStatus: GateStatus = demoMode === 'critical' ? 'blocked' : 'auto';

  return {
    autonomyLevel:
      demoMode === 'normal'
        ? 'AUTONOMOUS'
        : demoMode === 'warning'
          ? 'SUPERVISED'
          : 'HUMAN_REQUIRED',
    riskLevel: demoMode === 'normal' ? 1 : demoMode === 'warning' ? 2 : 4,
    maxRisk: 4,
    pendingApprovals: demoMode === 'critical' ? 3 : demoMode === 'warning' ? 1 : 0,
    gates: [
      { name: 'Code Generation', status: 'auto', risk: 'low' },
      {
        name: 'File Write',
        status: fileWriteStatus,
        risk: demoMode === 'critical' ? 'high' : 'low',
      },
      { name: 'Deploy', status: 'supervised', risk: 'medium' },
      { name: 'Production Push', status: 'human', risk: 'high' },
    ],
  };
}

// ============================================
// SUPPLY CHAIN
// ============================================

export function getMockSupplyChain(demoMode: DemoMode = 'normal'): SupplyChain {
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

// ============================================
// VERIFICATION
// ============================================

export function getMockVerification(_demoMode: DemoMode = 'normal'): VerificationItem[] {
  return [
    { name: 'Slop Tests', status: 'pass' },
    { name: 'TypeScript', status: 'pass' },
    { name: 'Unit Tests', status: 'fail', count: 2 },
    { name: 'Integration', status: 'running' },
  ];
}

// ============================================
// FILES
// ============================================

export function getMockFiles(_demoMode: DemoMode = 'normal'): FileItem[] {
  return [
    { name: 'websocket.ts', progress: 85, active: true },
    { name: 'use-websocket.ts', progress: 50, active: false },
    { name: 'live-output.tsx', progress: 0, active: false },
    { name: 'execution-stream.ts', progress: 0, active: false },
  ];
}

// ============================================
// TASKS
// ============================================

export function getMockTasks(_demoMode: DemoMode = 'normal'): Task[] {
  return [
    { id: 1, text: 'Load session context', done: true },
    { id: 2, text: 'Implement reconnection', done: true },
    { id: 3, text: 'Write unit tests', done: false },
    { id: 4, text: 'Update progress.json', done: false },
  ];
}

// ============================================
// ALL DATA
// ============================================

export function getMockDashboardData(demoMode: DemoMode = 'normal') {
  return {
    agentMemory: getMockAgentMemory(demoMode),
    evidencePacks: getMockEvidencePacks(demoMode),
    carsStatus: getMockCarsStatus(demoMode),
    supplyChain: getMockSupplyChain(demoMode),
    verification: getMockVerification(demoMode),
    files: getMockFiles(demoMode),
    tasks: getMockTasks(demoMode),
  };
}
