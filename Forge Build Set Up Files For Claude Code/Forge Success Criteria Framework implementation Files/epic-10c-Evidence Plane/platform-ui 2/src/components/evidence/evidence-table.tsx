/**
 * FORGE Platform UI - Evidence Table
 * @epic 10c - Evidence Plane
 */

'use client';

import Link from 'next/link';
import { 
  Eye, 
  Download, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  ExternalLink 
} from 'lucide-react';
import type { EvidenceBundle, EvidenceStatus } from '@/lib/types/evidence';

interface EvidenceTableProps {
  bundles: EvidenceBundle[];
}

export function EvidenceTable({ bundles }: EvidenceTableProps) {
  const getStatusBadge = (status: EvidenceStatus, signed: boolean) => {
    if (status === 'verified') {
      return (
        <span className="forge-badge forge-badge-success flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </span>
      );
    }
    if (status === 'tampered') {
      return (
        <span className="forge-badge forge-badge-error flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          Tampered
        </span>
      );
    }
    if (status === 'exported') {
      return (
        <span className="forge-badge bg-blue-100 text-blue-700">
          Exported
        </span>
      );
    }
    return (
      <span className="forge-badge bg-muted text-muted-foreground flex items-center gap-1">
        <Shield className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left p-4 font-medium">Bundle</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Links</th>
            <th className="text-left p-4 font-medium">Contents</th>
            <th className="text-left p-4 font-medium">Redacted</th>
            <th className="text-left p-4 font-medium">Created</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="hover:bg-muted/30 transition-colors">
              {/* Bundle Info */}
              <td className="p-4">
                <Link href={`/evidence/${bundle.id}`} className="block">
                  <p className="font-medium hover:underline">{bundle.contractName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {bundle.id}
                  </p>
                </Link>
              </td>

              {/* Status */}
              <td className="p-4">
                {getStatusBadge(bundle.status, !!bundle.signature)}
              </td>

              {/* Links */}
              <td className="p-4">
                <div className="flex flex-col gap-1 text-xs">
                  <Link 
                    href={`/runs/${bundle.runId}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Run <ExternalLink className="h-3 w-3" />
                  </Link>
                  {bundle.workId && (
                    <Link 
                      href={`/work/${bundle.workId}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {bundle.workId} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </td>

              {/* Contents */}
              <td className="p-4">
                <div className="flex gap-3 text-sm">
                  <span title="Iterations">{bundle.iterationCount} iter</span>
                  <span title="Tool calls">{bundle.toolCallCount} tools</span>
                  <span title="Artifacts">{bundle.artifactCount} files</span>
                </div>
              </td>

              {/* Redacted */}
              <td className="p-4">
                {bundle.redactedFields > 0 ? (
                  <span className="forge-badge forge-badge-warning">
                    {bundle.redactedFields} fields
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </td>

              {/* Created */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatDate(bundle.createdAt)}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/evidence/${bundle.id}`}
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EvidenceTable;
