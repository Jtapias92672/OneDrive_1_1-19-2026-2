/**
 * FORGE Platform UI - Policy Table
 * @epic 10d - Governance Console
 */

'use client';

import Link from 'next/link';
import { Eye, Edit, MoreVertical, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Policy, PolicyStatus, RiskTier } from '@/lib/types/governance';

interface PolicyTableProps {
  policies: Policy[];
}

export function PolicyTable({ policies }: PolicyTableProps) {
  const statusBadge = (status: PolicyStatus) => {
    const config: Record<PolicyStatus, { class: string; icon?: React.ReactNode }> = {
      draft: { class: 'bg-gray-100 text-gray-700' },
      review: { class: 'bg-blue-100 text-blue-700' },
      active: { class: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
      deprecated: { class: 'bg-yellow-100 text-yellow-700' },
      archived: { class: 'bg-gray-100 text-gray-500' },
    };
    const c = config[status];
    return (
      <span className={`forge-badge flex items-center gap-1 ${c.class}`}>
        {c.icon}
        {status}
      </span>
    );
  };

  const riskBadge = (tier: RiskTier) => {
    const config: Record<RiskTier, { class: string; icon?: React.ReactNode }> = {
      low: { class: 'bg-green-100 text-green-700' },
      medium: { class: 'bg-yellow-100 text-yellow-700' },
      high: { class: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="h-3 w-3" /> },
      critical: { class: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const c = config[tier];
    return (
      <span className={`forge-badge flex items-center gap-1 ${c.class}`}>
        {c.icon}
        {tier}
      </span>
    );
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (policies.length === 0) {
    return (
      <div className="forge-card text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No policies found</p>
      </div>
    );
  }

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left p-4 font-medium">Policy</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Risk</th>
            <th className="text-left p-4 font-medium">Scope</th>
            <th className="text-left p-4 font-medium">Rules</th>
            <th className="text-left p-4 font-medium">Updated</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {policies.map((policy) => (
            <tr key={policy.id} className="hover:bg-muted/30 transition-colors">
              {/* Policy Info */}
              <td className="p-4">
                <Link href={`/governance/policies/${policy.id}`} className="block">
                  <div className="flex items-center gap-2">
                    <p className="font-medium hover:underline">{policy.name}</p>
                    {policy.requiresApproval && (
                      <span className="forge-badge bg-purple-100 text-purple-700 text-xs">
                        Approval Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {policy.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    v{policy.version} • {policy.owner}
                  </p>
                </Link>
              </td>

              {/* Status */}
              <td className="p-4">{statusBadge(policy.status)}</td>

              {/* Risk */}
              <td className="p-4">{riskBadge(policy.riskTier)}</td>

              {/* Scope */}
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {policy.scope.environments.map((env) => (
                    <span key={env} className="forge-badge bg-muted text-xs">
                      {env}
                    </span>
                  ))}
                </div>
                {policy.scope.repos && policy.scope.repos.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {policy.scope.repos.length} repo(s)
                  </p>
                )}
              </td>

              {/* Rules */}
              <td className="p-4">
                <span className="text-sm">{policy.rules.length} rules</span>
                {policy.redactionRules.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {policy.redactionRules.length} redaction
                  </p>
                )}
              </td>

              {/* Updated */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatDate(policy.updatedAt)}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/governance/policies/${policy.id}`}
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/governance/policies/${policy.id}`}
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button className="forge-button h-8 w-8 hover:bg-muted" title="More">
                    <MoreVertical className="h-4 w-4" />
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

export default PolicyTable;
