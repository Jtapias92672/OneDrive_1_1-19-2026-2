/**
 * FORGE Evidence Pack Parser - Types and Mock Data
 *
 * Types and mock data for evidence packs
 * File system operations are in evidence-parser.server.ts
 */

export interface EvidencePack {
  id: string;
  task: string;
  timestamp: string;
  size: string;
  signed: boolean;
  hash?: string;
}

export interface EvidencePacksSummary {
  sessionPacks: number;
  epicTotal: number;
  lastGenerated: string;
  cmmcReady: boolean;
  dfarsCompliant: boolean;
  recentPacks: EvidencePack[];
}

/**
 * Get mock evidence packs summary for demo mode
 */
export function getMockEvidencePacksSummary(
  demoMode: 'normal' | 'warning' | 'critical' = 'normal'
): EvidencePacksSummary {
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
