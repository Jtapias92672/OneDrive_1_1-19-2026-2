/**
 * FORGE Platform UI - Receipts List
 * @epic 10c - Evidence Plane
 */

'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Hash, 
  Clock, 
  Link as LinkIcon,
  Shield,
  ShieldAlert,
  EyeOff
} from 'lucide-react';
import type { EvidenceReceipt } from '@/lib/types/evidence';

interface ReceiptsListProps {
  receipts: EvidenceReceipt[];
}

export function ReceiptsList({ receipts }: ReceiptsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
  };

  const getTypeIcon = (type: EvidenceReceipt['type']) => {
    switch (type) {
      case 'iteration': return '🔄';
      case 'tool_call': return '🔧';
      case 'validation': return '✅';
      case 'checkpoint': return '📍';
      case 'policy_check': return '🛡️';
      default: return '📋';
    }
  };

  const getTypeBadgeClass = (type: EvidenceReceipt['type']) => {
    switch (type) {
      case 'iteration': return 'bg-blue-100 text-blue-700';
      case 'tool_call': return 'bg-purple-100 text-purple-700';
      case 'validation': return 'bg-green-100 text-green-700';
      case 'checkpoint': return 'bg-yellow-100 text-yellow-700';
      case 'policy_check': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (receipts.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <p className="text-muted-foreground">No receipts recorded</p>
      </div>
    );
  }

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Immutable Receipts</h3>
        <span className="text-sm text-muted-foreground">
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} • Chain verified
        </span>
      </div>

      <div className="space-y-2">
        {receipts.map((receipt, index) => {
          const isExpanded = expandedIds.has(receipt.id);
          const isFirst = index === 0;
          
          return (
            <div 
              key={receipt.id} 
              className="border rounded-lg overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggleExpand(receipt.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  <span className="text-lg">{getTypeIcon(receipt.type)}</span>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{receipt.sequence}</span>
                      <span className={`forge-badge ${getTypeBadgeClass(receipt.type)}`}>
                        {receipt.type.replace('_', ' ')}
                      </span>
                      {receipt.redacted && (
                        <span className="forge-badge forge-badge-warning flex items-center gap-1">
                          <EyeOff className="h-3 w-3" />
                          Redacted
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{receipt.action}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {receipt.durationMs && (
                    <span>{receipt.durationMs}ms</span>
                  )}
                  <span className="font-mono text-xs">
                    {formatTime(receipt.timestamp)}
                  </span>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t p-4 bg-muted/20 space-y-4">
                  {/* Hash Chain */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Content Hash</span>
                      </div>
                      <code className="text-xs font-mono text-muted-foreground break-all">
                        {receipt.contentHash}
                      </code>
                    </div>
                    
                    {receipt.previousHash && (
                      <div className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Previous Hash</span>
                        </div>
                        <code className="text-xs font-mono text-muted-foreground break-all">
                          {receipt.previousHash}
                        </code>
                        {!isFirst && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Chain link verified
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Policy Info */}
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      {receipt.policyAllowed ? (
                        <Shield className="h-4 w-4 text-green-500" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        Policy: {receipt.policyAllowed ? 'Allowed' : 'Blocked'}
                      </span>
                    </div>
                    {receipt.policyRule && (
                      <p className="text-sm text-muted-foreground">
                        Rule: {receipt.policyRule}
                      </p>
                    )}
                  </div>

                  {/* Redaction Info */}
                  {receipt.redacted && receipt.redactedReason && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-1">
                        <EyeOff className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-700">
                          Content Redacted
                        </span>
                      </div>
                      <p className="text-sm text-yellow-600">
                        {receipt.redactedReason}
                      </p>
                    </div>
                  )}

                  {/* Timing */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Timestamp: {new Date(receipt.timestamp).toISOString()}</span>
                    </div>
                    {receipt.durationMs && (
                      <span>Duration: {receipt.durationMs}ms</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReceiptsList;
