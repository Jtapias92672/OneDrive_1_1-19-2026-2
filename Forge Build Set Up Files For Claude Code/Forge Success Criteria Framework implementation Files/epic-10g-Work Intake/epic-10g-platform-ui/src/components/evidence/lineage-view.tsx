/**
 * FORGE Platform UI - Lineage View
 * @epic 10c - Evidence Plane
 */

'use client';

import Link from 'next/link';
import { 
  FileText, 
  Play, 
  GitCommit, 
  GitPullRequest, 
  GitBranch,
  Rocket,
  ArrowRight,
  ExternalLink,
  Shield
} from 'lucide-react';
import type { EvidenceLineage, EvidenceBundle } from '@/lib/types/evidence';

interface LineageViewProps {
  lineage: EvidenceLineage;
  bundle: EvidenceBundle;
}

export function LineageView({ lineage, bundle }: LineageViewProps) {
  const LineageNode = ({ 
    icon: Icon, 
    label, 
    value, 
    href, 
    subValue,
    highlight = false 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string; 
    href?: string;
    subValue?: string;
    highlight?: boolean;
  }) => (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${
      highlight ? 'bg-primary/5 border-primary/30' : 'bg-background'
    }`}>
      <div className={`p-3 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted'}`}>
        <Icon className={`h-6 w-6 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {href ? (
          <Link href={href} className="font-medium text-primary hover:underline flex items-center gap-1">
            {value}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <p className="font-medium">{value}</p>
        )}
        {subValue && (
          <p className="text-sm text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );

  const Arrow = () => (
    <div className="flex justify-center py-2">
      <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
    </div>
  );

  return (
    <div className="forge-card">
      <h3 className="font-semibold mb-6">Evidence Lineage</h3>

      <div className="max-w-xl mx-auto">
        {/* Work Item */}
        {lineage.workId && (
          <>
            <LineageNode
              icon={FileText}
              label="Work Item"
              value={lineage.workId}
              href={`/work/${lineage.workId}`}
              subValue={lineage.workTitle}
            />
            <Arrow />
          </>
        )}

        {/* Run */}
        <LineageNode
          icon={Play}
          label="Execution Run"
          value={lineage.runId}
          href={`/runs/${lineage.runId}`}
          subValue={`${bundle.contractName} v${bundle.contractVersion}`}
        />

        {/* Parent Run (if forked) */}
        {lineage.parentRunId && (
          <>
            <div className="ml-8 my-2 pl-4 border-l-2 border-dashed border-muted">
              <p className="text-xs text-muted-foreground mb-1">Forked from</p>
              <Link 
                href={`/runs/${lineage.parentRunId}`}
                className="text-sm text-primary hover:underline"
              >
                {lineage.parentRunId}
              </Link>
              {lineage.forkPoint && (
                <span className="text-xs text-muted-foreground ml-2">
                  at iteration {lineage.forkPoint}
                </span>
              )}
            </div>
          </>
        )}

        <Arrow />

        {/* Evidence Bundle (current) */}
        <LineageNode
          icon={Shield}
          label="Evidence Bundle"
          value={bundle.id}
          highlight={true}
          subValue={`${bundle.iterationCount} iterations • ${bundle.toolCallCount} tool calls • ${bundle.artifactCount} artifacts`}
        />

        {/* Code Chain */}
        {(lineage.commitSha || lineage.prNumber) && (
          <>
            <Arrow />
            
            <div className="space-y-2">
              {/* Branch */}
              {lineage.branch && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-mono text-sm">{lineage.branch}</p>
                  </div>
                </div>
              )}

              {/* Commit */}
              {lineage.commitSha && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GitCommit className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Commit</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{lineage.commitSha.slice(0, 7)}</code>
                      {lineage.parentCommitSha && (
                        <span className="text-xs text-muted-foreground">
                          ← {lineage.parentCommitSha.slice(0, 7)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PR */}
              {lineage.prNumber && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GitPullRequest className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pull Request</p>
                    <p className="font-medium">#{lineage.prNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Deployment */}
        {lineage.deploymentId && (
          <>
            <Arrow />
            <LineageNode
              icon={Rocket}
              label="Deployment"
              value={lineage.deploymentId}
              subValue={`Deployed to ${lineage.deployedTo} at ${lineage.deployedAt ? new Date(lineage.deployedAt).toLocaleString() : 'unknown'}`}
            />
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-3">Traceability Chain</p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Work Item → Run → Evidence → Code → Deployment</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This chain provides complete traceability from business requirement to production deployment,
          with cryptographic proof at each stage.
        </p>
      </div>
    </div>
  );
}

export default LineageView;
