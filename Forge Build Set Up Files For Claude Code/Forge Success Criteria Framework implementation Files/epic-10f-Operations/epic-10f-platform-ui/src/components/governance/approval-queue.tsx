/**
 * FORGE Platform UI - Approval Queue
 * @epic 10d - Governance Console
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  User,
  MessageSquare,
  ExternalLink,
  Play,
  FileText,
  Shield
} from 'lucide-react';
import type { ApprovalRequest, RiskTier } from '@/lib/types/governance';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
}

export function ApprovalQueue({ approvals }: ApprovalQueueProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 1000));
    setProcessingId(null);
    setComment('');
    console.log('Approved:', id, comment);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 1000));
    setProcessingId(null);
    setComment('');
    console.log('Rejected:', id, comment);
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatExpiry = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m remaining`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h remaining`;
    return `${Math.floor(diff / 86400000)}d remaining`;
  };

  const riskBadge = (tier: RiskTier) => {
    const config: Record<RiskTier, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`forge-badge ${config[tier]}`}>
        {tier}
      </span>
    );
  };

  const typeIcon = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'run': return <Play className="h-4 w-4" />;
      case 'policy_change': return <Shield className="h-4 w-4" />;
      case 'exception': return <AlertTriangle className="h-4 w-4" />;
      case 'deployment': return <ExternalLink className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'pending':
        return <span className="forge-badge bg-yellow-100 text-yellow-700">Pending</span>;
      case 'approved':
        return <span className="forge-badge forge-badge-success">Approved</span>;
      case 'rejected':
        return <span className="forge-badge forge-badge-error">Rejected</span>;
      case 'expired':
        return <span className="forge-badge bg-gray-100 text-gray-500">Expired</span>;
    }
  };

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => {
        const isExpanded = expandedIds.has(approval.id);
        const isPending = approval.status === 'pending';
        const currentApprovals = approval.approvals.filter(a => a.decision === 'approved').length;
        const isProcessing = processingId === approval.id;
        
        return (
          <div 
            key={approval.id}
            className={`forge-card p-0 overflow-hidden ${
              isPending ? 'border-yellow-200' : ''
            }`}
          >
            {/* Header */}
            <div 
              className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                isPending ? 'bg-yellow-50/50' : ''
              }`}
              onClick={() => toggleExpand(approval.id)}
            >
              <button className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              <div className="p-2 bg-muted rounded-lg">
                {typeIcon(approval.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{approval.title}</span>
                  {statusBadge(approval.status)}
                  {riskBadge(approval.riskTier)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {approval.description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {approval.requestedBy}
                  </span>
                  <span>{formatTime(approval.requestedAt)}</span>
                  {isPending && (
                    <span className={`flex items-center gap-1 ${
                      new Date(approval.expiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000
                        ? 'text-orange-600'
                        : ''
                    }`}>
                      <Clock className="h-3 w-3" />
                      {formatExpiry(approval.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {Array.from({ length: approval.minApprovals }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full ${
                        idx < currentApprovals ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentApprovals}/{approval.minApprovals} approvals
                </p>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t p-4 space-y-4">
                {/* Risk Factors */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Risk Factors</h4>
                  <div className="flex flex-wrap gap-2">
                    {approval.riskFactors.map((factor, idx) => (
                      <span key={idx} className="forge-badge bg-muted">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div className="flex gap-4">
                  {approval.runId && (
                    <Link 
                      href={`/runs/${approval.runId}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      View Run
                    </Link>
                  )}
                  {approval.policyId && (
                    <Link 
                      href={`/governance/policies/${approval.policyId}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Shield className="h-3 w-3" />
                      View Policy
                    </Link>
                  )}
                </div>

                {/* Previous Approvals */}
                {approval.approvals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Approval History</h4>
                    <div className="space-y-2">
                      {approval.approvals.map((apv) => (
                        <div 
                          key={apv.id}
                          className={`p-3 rounded-lg ${
                            apv.decision === 'approved' 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {apv.decision === 'approved' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">{apv.approver}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(apv.decidedAt)}
                            </span>
                          </div>
                          {apv.comment && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                              <MessageSquare className="h-3 w-3 mt-0.5" />
                              {apv.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons (for pending) */}
                {isPending && (
                  <div className="pt-4 border-t">
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Comment (optional)</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a comment for your decision..."
                        rows={2}
                        className="forge-input resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={isProcessing}
                        className="forge-button px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        disabled={isProcessing}
                        className="forge-button px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                      <span className="text-xs text-muted-foreground">
                        Requires {approval.minApprovals - currentApprovals} more approval(s)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ApprovalQueue;
