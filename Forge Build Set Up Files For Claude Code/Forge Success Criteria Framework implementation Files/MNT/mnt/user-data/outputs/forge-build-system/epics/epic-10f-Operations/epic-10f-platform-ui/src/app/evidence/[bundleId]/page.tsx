/**
 * FORGE Platform UI - Evidence Bundle Viewer Page
 * @epic 10c - Evidence Plane
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  FileJson,
  FileText,
  Archive,
  Clock,
  Hash,
  User,
  GitBranch
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { IntegrityBadge } from '@/components/evidence/integrity-badge';
import { ReceiptsList } from '@/components/evidence/receipts-list';
import { ToolInvocationsList } from '@/components/evidence/tool-invocations-list';
import { ArtifactsList } from '@/components/evidence/artifacts-list';
import { LineageView } from '@/components/evidence/lineage-view';
import type { 
  EvidenceBundle, 
  EvidenceReceipt, 
  ToolInvocation, 
  CodeArtifact,
  EvidenceLineage 
} from '@/lib/types/evidence';

type ViewTab = 'overview' | 'receipts' | 'tools' | 'artifacts' | 'lineage';

// Sample data - in production this comes from API
const sampleBundle: EvidenceBundle = {
  id: 'evd_abc123',
  runId: 'run_abc123',
  workId: 'WORK-001',
  contractId: 'api-validator',
  contractName: 'API Response Validator',
  contractVersion: '1.0.0',
  owner: 'alice@forge.dev',
  repo: 'acme/api-service',
  environment: 'prod',
  policyProfile: 'standard',
  status: 'verified',
  contentHash: 'sha256:a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
  hashAlgorithm: 'sha256',
  signature: 'sig_xyz789012345...',
  signedBy: 'forge-signer-prod',
  signedAt: '2025-01-19T14:35:00Z',
  createdAt: '2025-01-19T14:30:00Z',
  completedAt: '2025-01-19T14:32:15Z',
  exportedAt: '2025-01-19T14:40:00Z',
  iterationCount: 3,
  toolCallCount: 8,
  validatorCount: 3,
  artifactCount: 2,
  redactionRules: ['pii', 'secrets'],
  redactedFields: 4,
  exportFormats: ['json', 'pdf', 'zip'],
  exportSize: 245000,
};

const sampleReceipts: EvidenceReceipt[] = [
  {
    id: 'rcpt_001',
    bundleId: 'evd_abc123',
    type: 'iteration',
    sequence: 1,
    timestamp: '2025-01-19T14:30:05Z',
    durationMs: 45000,
    action: 'Iteration 1 completed',
    contentHash: 'sha256:1111...',
    policyAllowed: true,
    redacted: false,
  },
  {
    id: 'rcpt_002',
    bundleId: 'evd_abc123',
    type: 'validation',
    sequence: 2,
    timestamp: '2025-01-19T14:30:50Z',
    durationMs: 1200,
    action: 'Schema validation passed',
    contentHash: 'sha256:2222...',
    previousHash: 'sha256:1111...',
    policyAllowed: true,
    redacted: false,
  },
  {
    id: 'rcpt_003',
    bundleId: 'evd_abc123',
    type: 'tool_call',
    sequence: 3,
    timestamp: '2025-01-19T14:31:00Z',
    durationMs: 350,
    action: 'Tool: http_request',
    contentHash: 'sha256:3333...',
    previousHash: 'sha256:2222...',
    policyAllowed: true,
    redacted: true,
    redactedReason: 'Contains API credentials',
  },
];

const sampleToolInvocations: ToolInvocation[] = [
  {
    id: 'tool_001',
    bundleId: 'evd_abc123',
    iterationNumber: 1,
    sequence: 1,
    toolName: 'http_request',
    toolVersion: '1.0.0',
    input: { url: 'https://api.example.com/users', method: 'GET' },
    inputHash: 'sha256:inp1...',
    output: { status: 200, body: '[REDACTED]' },
    outputHash: 'sha256:out1...',
    startedAt: '2025-01-19T14:30:10Z',
    completedAt: '2025-01-19T14:30:10Z',
    durationMs: 245,
    policyAllowed: true,
    inputRedacted: false,
    outputRedacted: true,
    redactionReason: 'Response contains PII',
  },
  {
    id: 'tool_002',
    bundleId: 'evd_abc123',
    iterationNumber: 1,
    sequence: 2,
    toolName: 'json_parse',
    toolVersion: '1.0.0',
    input: { data: '[REDACTED]' },
    inputHash: 'sha256:inp2...',
    output: { parsed: true, recordCount: 15 },
    outputHash: 'sha256:out2...',
    startedAt: '2025-01-19T14:30:11Z',
    completedAt: '2025-01-19T14:30:11Z',
    durationMs: 12,
    policyAllowed: true,
    inputRedacted: true,
    outputRedacted: false,
  },
];

const sampleArtifacts: CodeArtifact[] = [
  {
    id: 'art_001',
    bundleId: 'evd_abc123',
    type: 'diff',
    name: 'api-response-fix.patch',
    path: 'src/handlers/response.ts',
    contentHash: 'sha256:diff1...',
    mimeType: 'text/x-diff',
    size: 1240,
    commitSha: 'abc123def456',
    createdAt: '2025-01-19T14:32:00Z',
  },
  {
    id: 'art_002',
    bundleId: 'evd_abc123',
    type: 'test_result',
    name: 'test-results.xml',
    contentHash: 'sha256:test1...',
    mimeType: 'application/xml',
    size: 4520,
    createdAt: '2025-01-19T14:32:10Z',
    metadata: { passed: 12, failed: 0, skipped: 1 },
  },
];

const sampleLineage: EvidenceLineage = {
  bundleId: 'evd_abc123',
  workId: 'WORK-001',
  workTitle: 'Fix API response validation',
  runId: 'run_abc123',
  commitSha: 'abc123def456',
  parentCommitSha: '789xyz012abc',
  prNumber: 142,
  branch: 'fix/api-response',
};

export default function EvidenceBundlePage() {
  const params = useParams();
  const bundleId = params.bundleId as string;
  
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [bundle] = useState<EvidenceBundle>(sampleBundle);
  const [receipts] = useState<EvidenceReceipt[]>(sampleReceipts);
  const [toolInvocations] = useState<ToolInvocation[]>(sampleToolInvocations);
  const [artifacts] = useState<CodeArtifact[]>(sampleArtifacts);
  const [lineage] = useState<EvidenceLineage>(sampleLineage);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'pdf' | 'zip') => {
    setIsExporting(true);
    // Simulate export
    await new Promise((r) => setTimeout(r, 2000));
    setIsExporting(false);
    
    // Download logic would go here
    console.log(`Exporting as ${format}`);
  };

  const copyHash = async () => {
    await navigator.clipboard.writeText(bundle.contentHash);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'receipts' as const, label: `Receipts (${receipts.length})` },
    { id: 'tools' as const, label: `Tool Calls (${toolInvocations.length})` },
    { id: 'artifacts' as const, label: `Artifacts (${artifacts.length})` },
    { id: 'lineage' as const, label: 'Lineage' },
  ];

  return (
    <div className="space-y-6 mt-14">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Evidence', href: '/evidence' },
          { label: bundle.contractName },
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link 
            href="/evidence"
            className="forge-button h-9 w-9 hover:bg-muted mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{bundle.contractName}</h1>
              <IntegrityBadge status={bundle.status} signed={!!bundle.signature} />
            </div>
            <p className="text-sm text-muted-foreground">
              Bundle ID: {bundle.id}
              {' • '}
              <Link href={`/runs/${bundle.runId}`} className="text-primary hover:underline">
                Run: {bundle.runId}
              </Link>
              {bundle.workId && (
                <>
                  {' • '}
                  <Link href={`/work/${bundle.workId}`} className="text-primary hover:underline">
                    Work: {bundle.workId}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={() => handleExport('zip')}
            disabled={isExporting}
            className="forge-button h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Archive className="h-4 w-4 mr-2" />
            Full Package
          </button>
        </div>
      </div>

      {/* Integrity Banner */}
      <div className={`p-4 rounded-lg border ${
        bundle.status === 'verified' 
          ? 'bg-green-50 border-green-200' 
          : bundle.status === 'tampered'
          ? 'bg-red-50 border-red-200'
          : 'bg-muted'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bundle.status === 'verified' ? (
              <ShieldCheck className="h-6 w-6 text-green-600" />
            ) : bundle.status === 'tampered' ? (
              <ShieldAlert className="h-6 w-6 text-red-600" />
            ) : (
              <Shield className="h-6 w-6 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {bundle.status === 'verified' 
                  ? 'Integrity Verified' 
                  : bundle.status === 'tampered'
                  ? 'Integrity Compromised'
                  : 'Pending Verification'}
              </p>
              <p className="text-sm text-muted-foreground">
                {bundle.signature 
                  ? `Signed by ${bundle.signedBy} at ${formatDate(bundle.signedAt!)}`
                  : 'Not yet signed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background px-2 py-1 rounded font-mono">
              {bundle.contentHash.slice(0, 20)}...
            </code>
            <button onClick={copyHash} className="forge-button h-8 w-8 hover:bg-muted">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Summary */}
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Bundle Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract</span>
                  <span>{bundle.contractName} v{bundle.contractVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="forge-badge bg-muted">{bundle.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Policy Profile</span>
                  <span>{bundle.policyProfile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Iterations</span>
                  <span>{bundle.iterationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tool Calls</span>
                  <span>{bundle.toolCallCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validators</span>
                  <span>{bundle.validatorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Artifacts</span>
                  <span>{bundle.artifactCount}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Metadata</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Owner:</span>
                  <span>{bundle.owner}</span>
                </div>
                {bundle.repo && (
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Repo:</span>
                    <span>{bundle.repo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(bundle.createdAt)}</span>
                </div>
                {bundle.completedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{formatDate(bundle.completedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Algorithm:</span>
                  <span>{bundle.hashAlgorithm.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Redaction Info */}
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Redaction</h3>
              {bundle.redactionRules.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {bundle.redactionRules.map((rule) => (
                      <span key={rule} className="forge-badge forge-badge-warning">
                        {rule}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {bundle.redactedFields} field(s) redacted based on policy
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No redaction rules applied
                </p>
              )}
            </div>

            {/* Export Info */}
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Export</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {bundle.exportFormats.map((format) => (
                    <span key={format} className="forge-badge bg-muted">
                      {format.toUpperCase()}
                    </span>
                  ))}
                </div>
                {bundle.exportSize && (
                  <p className="text-sm text-muted-foreground">
                    Estimated size: {formatBytes(bundle.exportSize)}
                  </p>
                )}
                {bundle.exportedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last exported: {formatDate(bundle.exportedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <ReceiptsList receipts={receipts} />
        )}

        {activeTab === 'tools' && (
          <ToolInvocationsList invocations={toolInvocations} />
        )}

        {activeTab === 'artifacts' && (
          <ArtifactsList artifacts={artifacts} />
        )}

        {activeTab === 'lineage' && (
          <LineageView lineage={lineage} bundle={bundle} />
        )}
      </div>
    </div>
  );
}
