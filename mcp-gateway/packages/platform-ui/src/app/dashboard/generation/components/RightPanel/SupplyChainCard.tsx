'use client';

/**
 * Supply Chain Verification Card
 * Displays dependency verification, SLSA level, and signature status
 */

import { ChevronRight, Link, Check, X, Fingerprint, FileText } from 'lucide-react';

interface SupplyChainData {
  totalDeps: number;
  verifiedDeps: number;
  slsaLevel: number;
  signaturesValid: boolean;
  lastAudit: string;
  vulnerabilities: number;
  sbomGenerated: boolean;
}

interface SupplyChainCardProps {
  data?: SupplyChainData;
  expanded: boolean;
  onToggle: () => void;
}

export function SupplyChainCard({
  data,
  expanded,
  onToggle,
}: SupplyChainCardProps) {
  const totalDeps = data?.totalDeps ?? 47;
  const verifiedDeps = data?.verifiedDeps ?? 47;
  const slsaLevel = data?.slsaLevel ?? 3;
  const signaturesValid = data?.signaturesValid ?? true;
  const lastAudit = data?.lastAudit ?? '15 min ago';
  const vulnerabilities = data?.vulnerabilities ?? 0;
  const sbomGenerated = data?.sbomGenerated ?? true;

  const allVerified = verifiedDeps === totalDeps;

  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer ${
          expanded ? 'bg-slate-50 border-b border-gray-200' : ''
        }`}
      >
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span
            className={`text-teal-600 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </span>
          <Link className="w-4 h-4 text-teal-600" />
          Supply Chain
        </h3>
        {vulnerabilities > 0 ? (
          <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
            {vulnerabilities} vuln
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded">
            Secure
          </span>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">Dependencies</div>
              <div
                className={`text-base font-bold ${
                  allVerified ? 'text-teal-600' : 'text-amber-500'
                }`}
              >
                {verifiedDeps}/{totalDeps}
              </div>
              <div className="text-[9px] text-slate-400">verified</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">SLSA Level</div>
              <div
                className={`text-base font-bold ${
                  slsaLevel >= 3 ? 'text-teal-600' : 'text-amber-500'
                }`}
              >
                L{slsaLevel}
              </div>
              <div className="text-[9px] text-slate-400">provenance</div>
            </div>
          </div>

          {/* Status Items */}
          <div className="flex flex-col gap-1.5">
            <div
              className={`flex items-center justify-between p-2.5 rounded-md ${
                signaturesValid ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-slate-600" />
                <span className="text-xs text-slate-700">Signatures Valid</span>
              </div>
              <span className={signaturesValid ? 'text-green-500' : 'text-red-500'}>
                {signaturesValid ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </span>
            </div>

            <div
              className={`flex items-center justify-between p-2.5 rounded-md ${
                sbomGenerated ? 'bg-green-50' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="text-xs text-slate-700">SBOM Generated</span>
              </div>
              <span className={sbomGenerated ? 'text-green-500' : 'text-slate-400'}>
                {sbomGenerated ? <Check className="w-4 h-4" /> : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md">
              <span className="text-xs text-slate-700">Last Audit</span>
              <span className="text-[11px] font-medium text-slate-500">
                {lastAudit}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
