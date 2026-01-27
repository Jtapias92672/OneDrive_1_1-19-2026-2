'use client';

import { EvidencePack, ComplianceFramework } from '@/lib/persona/compliance-types';

interface EvidencePackListProps {
  packs: EvidencePack[];
  onDownload?: (pack: EvidencePack) => void;
  onViewAudit?: (pack: EvidencePack) => void;
  onViewAll?: () => void;
}

const frameworkColors: Record<ComplianceFramework, string> = {
  SOC2: 'bg-blue-100 text-blue-800',
  CMMC: 'bg-green-100 text-green-800',
  HIPAA: 'bg-purple-100 text-purple-800',
  GDPR: 'bg-indigo-100 text-indigo-800',
  ISO27001: 'bg-cyan-100 text-cyan-800',
  FedRAMP: 'bg-red-100 text-red-800',
};

export function EvidencePackList({
  packs,
  onDownload,
  onViewAudit,
  onViewAll,
}: EvidencePackListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Evidence Packs</h3>
      </div>

      <div className="p-4">
        <ul className="space-y-3">
          {packs.slice(0, 4).map((pack) => (
            <EvidencePackItem
              key={pack.id}
              pack={pack}
              onDownload={() => onDownload?.(pack)}
              onViewAudit={() => onViewAudit?.(pack)}
            />
          ))}
        </ul>

        <button
          onClick={onViewAll}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Evidence →
        </button>
      </div>
    </div>
  );
}

interface EvidencePackItemProps {
  pack: EvidencePack;
  onDownload?: () => void;
  onViewAudit?: () => void;
}

function EvidencePackItem({ pack, onDownload, onViewAudit }: EvidencePackItemProps) {
  const formattedDate = new Date(pack.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <PackageIcon />
          <span className="font-mono text-sm text-gray-700">{pack.id}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${frameworkColors[pack.framework]}`}>
          {pack.framework}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{pack.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formattedDate}</span>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50"
          >
            Download
          </button>
          <button
            onClick={onViewAudit}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100"
          >
            View Audit
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
