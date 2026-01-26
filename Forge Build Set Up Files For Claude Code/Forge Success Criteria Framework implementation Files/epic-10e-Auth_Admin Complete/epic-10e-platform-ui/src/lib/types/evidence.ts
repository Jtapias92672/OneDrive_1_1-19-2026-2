/**
 * FORGE Platform UI - Evidence Types
 * @epic 10c - Evidence Plane
 */

export type EvidenceStatus = 'pending' | 'complete' | 'exported' | 'verified' | 'tampered';

export interface EvidenceBundle {
  id: string;
  runId: string;
  workId?: string;
  contractId: string;
  contractName: string;
  contractVersion: string;
  
  // Ownership & Context
  owner: string;
  repo?: string;
  environment: 'dev' | 'staging' | 'prod';
  policyProfile: string;
  
  // Integrity
  status: EvidenceStatus;
  contentHash: string;
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  signature?: string;
  signedBy?: string;
  signedAt?: string;
  
  // Timestamps
  createdAt: string;
  completedAt?: string;
  exportedAt?: string;
  
  // Content summary
  iterationCount: number;
  toolCallCount: number;
  validatorCount: number;
  artifactCount: number;
  
  // Redaction
  redactionRules: string[];
  redactedFields: number;
  
  // Export
  exportFormats: ('json' | 'pdf' | 'zip')[];
  exportSize?: number;
}

export interface EvidenceReceipt {
  id: string;
  bundleId: string;
  type: 'iteration' | 'tool_call' | 'validation' | 'checkpoint' | 'policy_check';
  sequence: number;
  
  // Timing
  timestamp: string;
  durationMs?: number;
  
  // Content
  action: string;
  input?: any;
  output?: any;
  
  // Integrity
  contentHash: string;
  previousHash?: string;
  
  // Policy
  policyAllowed: boolean;
  policyRule?: string;
  redacted: boolean;
  redactedReason?: string;
}

export interface ToolInvocation {
  id: string;
  bundleId: string;
  iterationNumber: number;
  sequence: number;
  
  // Tool info
  toolName: string;
  toolVersion?: string;
  
  // Invocation
  input: any;
  inputHash: string;
  output?: any;
  outputHash?: string;
  error?: string;
  
  // Timing
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  
  // Policy
  policyAllowed: boolean;
  policyRule?: string;
  
  // Redaction
  inputRedacted: boolean;
  outputRedacted: boolean;
  redactionReason?: string;
}

export interface ValidationResult {
  id: string;
  bundleId: string;
  iterationNumber: number;
  
  // Validator info
  validatorId: string;
  validatorType: 'schema' | 'semantic' | 'computational' | 'rubric' | 'custom';
  validatorVersion: string;
  
  // Result
  score: number;
  weight: number;
  weightedScore: number;
  passed: boolean;
  
  // Details
  feedback?: string;
  details?: Record<string, any>;
  
  // Integrity
  inputHash: string;
  outputHash: string;
  timestamp: string;
}

export interface CodeArtifact {
  id: string;
  bundleId: string;
  
  // Artifact info
  type: 'diff' | 'file' | 'commit' | 'pr' | 'test_result' | 'screenshot';
  name: string;
  path?: string;
  
  // Content
  content?: string;
  contentHash: string;
  mimeType: string;
  size: number;
  
  // Links
  externalUrl?: string;
  commitSha?: string;
  prNumber?: number;
  
  // Metadata
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface TestResult {
  id: string;
  bundleId: string;
  artifactId: string;
  
  // Test info
  framework: 'jest' | 'junit' | 'pytest' | 'mocha' | 'custom';
  suiteName: string;
  testName: string;
  
  // Result
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  
  // Details
  message?: string;
  stackTrace?: string;
  screenshot?: string;
  
  timestamp: string;
}

export interface EvidenceLineage {
  bundleId: string;
  
  // Work chain
  workId?: string;
  workTitle?: string;
  
  // Run chain
  runId: string;
  parentRunId?: string;
  forkPoint?: number;
  
  // Code chain
  commitSha?: string;
  parentCommitSha?: string;
  prNumber?: number;
  branch?: string;
  
  // Deployment chain
  deploymentId?: string;
  deployedAt?: string;
  deployedTo?: string;
}

export interface EvidenceExport {
  id: string;
  bundleId: string;
  
  // Export info
  format: 'json' | 'pdf' | 'zip';
  status: 'pending' | 'generating' | 'complete' | 'failed';
  
  // File info
  filename?: string;
  size?: number;
  downloadUrl?: string;
  expiresAt?: string;
  
  // Metadata
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  
  // Options
  includeRedacted: boolean;
  includeArtifacts: boolean;
  includeScreenshots: boolean;
}

export interface EvidenceFilters {
  runId?: string;
  workId?: string;
  contractId?: string;
  repo?: string;
  environment?: string[];
  policyProfile?: string[];
  status?: EvidenceStatus[];
  dateFrom?: string;
  dateTo?: string;
}
