/**
 * FORGE Dashboard - TypeScript Types
 */

// ============================================
// DEMO MODE
// ============================================

export type DemoMode = 'normal' | 'warning' | 'critical';

// ============================================
// AGENT MEMORY
// ============================================

export interface SessionMemory {
  current: number;
  optimal: number;
  warning: number;
  danger: number;
}

export interface Guardrail {
  name: string;
  target: number;
  current: number;
  status: 'pass' | 'fail' | 'warning';
  critical: boolean;
}

export interface AgentMemory {
  session: SessionMemory;
  guardrails: Record<string, Guardrail>;
  lastSync?: string;
}

// ============================================
// EVIDENCE PACKS
// ============================================

export interface EvidencePack {
  id: string;
  task: string;
  timestamp: string;
  size: string;
  signed: boolean;
}

export interface EvidencePacks {
  sessionPacks: number;
  epicTotal: number;
  lastGenerated: string;
  cmmcReady: boolean;
  dfarsCompliant: boolean;
  recentPacks: EvidencePack[];
}

// ============================================
// CARS STATUS
// ============================================

export type AutonomyLevel = 'AUTONOMOUS' | 'SUPERVISED' | 'HUMAN_REQUIRED';

export type GateStatus = 'auto' | 'supervised' | 'human' | 'blocked';

export interface Gate {
  name: string;
  status: GateStatus;
  risk: 'low' | 'medium' | 'high';
}

export interface CarsStatus {
  autonomyLevel: AutonomyLevel;
  riskLevel: number;
  maxRisk: number;
  pendingApprovals: number;
  gates: Gate[];
}

// ============================================
// SUPPLY CHAIN
// ============================================

export interface SupplyChain {
  totalDeps: number;
  verifiedDeps: number;
  slsaLevel: number;
  signaturesValid: boolean;
  lastAudit: string;
  vulnerabilities: number;
  sbomGenerated: boolean;
}

// ============================================
// VERIFICATION
// ============================================

export type VerificationStatus = 'pass' | 'fail' | 'running';

export interface VerificationItem {
  name: string;
  status: VerificationStatus;
  count?: number;
}

// ============================================
// FILES
// ============================================

export interface FileItem {
  name: string;
  progress: number;
  active: boolean;
}

// ============================================
// TASKS
// ============================================

export interface Task {
  id: number;
  text: string;
  done: boolean;
}

// ============================================
// NAVIGATION
// ============================================

export interface NavItem {
  name: string;
  icon: React.FC<{ className?: string }>;
  badge: number | null;
}

// ============================================
// DASHBOARD STATE
// ============================================

export interface DashboardData {
  agentMemory: AgentMemory;
  evidencePacks: EvidencePacks;
  carsStatus: CarsStatus;
  supplyChain: SupplyChain;
  verification: VerificationItem[];
  files: FileItem[];
  tasks: Task[];
}

export interface ExpandedSections {
  evidencePacks: boolean;
  cars: boolean;
  supplyChain: boolean;
  memory: boolean;
  verification: boolean;
  files?: boolean;
  tasks?: boolean;
}
