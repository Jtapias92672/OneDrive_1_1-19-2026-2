/**
 * FORGE Platform UI - Artifacts List
 * @epic 10c - Evidence Plane
 */

'use client';

import { 
  FileCode, 
  FileText, 
  FileImage, 
  GitCommit, 
  GitPullRequest,
  TestTube,
  Download,
  ExternalLink,
  Hash,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';
import type { CodeArtifact } from '@/lib/types/evidence';

interface ArtifactsListProps {
  artifacts: CodeArtifact[];
}

export function ArtifactsList({ artifacts }: ArtifactsListProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getTypeIcon = (type: CodeArtifact['type']) => {
    switch (type) {
      case 'diff': return FileCode;
      case 'file': return FileText;
      case 'commit': return GitCommit;
      case 'pr': return GitPullRequest;
      case 'test_result': return TestTube;
      case 'screenshot': return FileImage;
      default: return FileText;
    }
  };

  const getTypeBadgeClass = (type: CodeArtifact['type']) => {
    switch (type) {
      case 'diff': return 'bg-orange-100 text-orange-700';
      case 'file': return 'bg-blue-100 text-blue-700';
      case 'commit': return 'bg-purple-100 text-purple-700';
      case 'pr': return 'bg-green-100 text-green-700';
      case 'test_result': return 'bg-cyan-100 text-cyan-700';
      case 'screenshot': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (artifacts.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <p className="text-muted-foreground">No artifacts recorded</p>
      </div>
    );
  }

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Code Artifacts</h3>
        <span className="text-sm text-muted-foreground">
          {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {artifacts.map((artifact) => {
          const Icon = getTypeIcon(artifact.type);
          
          return (
            <div 
              key={artifact.id} 
              className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-muted rounded-lg">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{artifact.name}</span>
                      <span className={`forge-badge ${getTypeBadgeClass(artifact.type)}`}>
                        {artifact.type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {artifact.path && (
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        {artifact.path}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatBytes(artifact.size)}</span>
                      <span>{artifact.mimeType}</span>
                      <span>{formatDate(artifact.createdAt)}</span>
                    </div>

                    {/* Git info */}
                    {(artifact.commitSha || artifact.prNumber) && (
                      <div className="flex items-center gap-3 mt-2">
                        {artifact.commitSha && (
                          <span className="flex items-center gap-1 text-xs">
                            <GitCommit className="h-3 w-3" />
                            <code className="font-mono">{artifact.commitSha.slice(0, 7)}</code>
                          </span>
                        )}
                        {artifact.prNumber && (
                          <span className="flex items-center gap-1 text-xs">
                            <GitPullRequest className="h-3 w-3" />
                            #{artifact.prNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Test result metadata */}
                    {artifact.type === 'test_result' && artifact.metadata && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-green-600">
                          ✓ {artifact.metadata.passed} passed
                        </span>
                        {artifact.metadata.failed > 0 && (
                          <span className="text-xs text-red-600">
                            ✗ {artifact.metadata.failed} failed
                          </span>
                        )}
                        {artifact.metadata.skipped > 0 && (
                          <span className="text-xs text-yellow-600">
                            ○ {artifact.metadata.skipped} skipped
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hash */}
                    <div className="flex items-center gap-2 mt-2">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs text-muted-foreground font-mono">
                        {artifact.contentHash.slice(0, 24)}...
                      </code>
                      <button 
                        onClick={() => copyHash(artifact.contentHash)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedHash === artifact.contentHash ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {artifact.externalUrl && (
                    <a
                      href={artifact.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="forge-button h-8 w-8 hover:bg-muted"
                      title="Open external"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArtifactsList;
