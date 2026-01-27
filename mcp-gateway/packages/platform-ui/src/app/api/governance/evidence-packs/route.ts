import { NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/governance/workflow';
import { auditLogger } from '@/lib/governance/audit';

interface EvidencePack {
  id: string;
  workflowId: string;
  workflowType: string;
  status: 'complete' | 'partial' | 'pending';
  createdAt: string;
  isCurrentSession: boolean;

  // Compliance data
  carsScore: number;
  carsLevel: string;
  tokensUsed: number;
  stagesCompleted: number;
  totalStages: number;

  // Audit reference
  auditEventCount: number;
}

/**
 * GET /api/governance/evidence-packs
 * List evidence packs from completed workflows
 */
export async function GET(): Promise<NextResponse> {
  try {
    const workflows = await workflowEngine.list();
    const now = new Date();
    const sessionStart = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago

    const evidencePacks: EvidencePack[] = await Promise.all(
      workflows
        .filter((w) => w.status === 'completed' || w.status === 'failed')
        .map(async (w) => {
          // Get audit events for this workflow
          const events = await auditLogger.getWorkflowEvents(w.id);

          // Calculate stages
          const stagesCompleted = Object.values(w.stageResults).filter(
            (r) => r.status === 'success'
          ).length;
          const totalStages = Object.keys(w.stageResults).length;

          return {
            id: `evid-${w.id}`,
            workflowId: w.id,
            workflowType: w.type,
            status: w.status === 'completed' ? 'complete' : 'partial',
            createdAt: w.createdAt.toISOString(),
            isCurrentSession: w.createdAt >= sessionStart,
            carsScore: w.riskAssessment.risk.score,
            carsLevel: w.riskAssessment.risk.level,
            tokensUsed: w.tokensConsumed,
            stagesCompleted,
            totalStages,
            auditEventCount: events.length,
          };
        })
    );

    // Sort by createdAt descending
    evidencePacks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(evidencePacks);
  } catch (error) {
    console.error('[Evidence] Failed to list evidence packs:', error);
    return NextResponse.json(
      { error: 'Failed to list evidence packs' },
      { status: 500 }
    );
  }
}
