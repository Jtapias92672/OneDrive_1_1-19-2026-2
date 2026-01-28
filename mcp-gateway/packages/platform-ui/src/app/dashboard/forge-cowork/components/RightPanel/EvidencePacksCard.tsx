'use client';

/**
 * Evidence Packs Card - THE MOAT
 * Displays CMMC/DFARS compliance status and recent evidence packs
 */

import {
  ChevronRight,
  Package,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Download,
} from 'lucide-react';

interface EvidencePack {
  id: string;
  task: string;
  timestamp: string;
  size: string;
  signed: boolean;
}

interface EvidencePacksData {
  sessionPacks: number;
  epicTotal: number;
  lastGenerated: string;
  cmmcReady: boolean;
  dfarsCompliant: boolean;
  recentPacks: EvidencePack[];
}

interface EvidencePacksCardProps {
  data?: EvidencePacksData;
  expanded: boolean;
  onToggle: () => void;
}

export function EvidencePacksCard({
  data,
  expanded,
  onToggle,
}: EvidencePacksCardProps) {
  const sessionPacks = data?.sessionPacks ?? 3;
  const epicTotal = data?.epicTotal ?? 12;
  const lastGenerated = data?.lastGenerated ?? '2 min ago';
  const cmmcReady = data?.cmmcReady ?? true;
  const dfarsCompliant = data?.dfarsCompliant ?? true;
  const recentPacks = data?.recentPacks ?? [
    { id: 'EP-10b-007', task: 'WebSocket impl', timestamp: '2 min ago', size: '45 KB', signed: true },
    { id: 'EP-10b-006', task: 'Auth middleware', timestamp: '15 min ago', size: '38 KB', signed: true },
    { id: 'EP-10b-005', task: 'API routes', timestamp: '1 hr ago', size: '52 KB', signed: true },
  ];

  return (
    <div className="mb-5 bg-white rounded-xl border-2 border-teal-600 overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200"
      >
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span
            className={`text-teal-600 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </span>
          <Package className="w-4 h-4 text-teal-600" />
          Evidence Packs
          <span className="text-[9px] font-semibold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded ml-1">
            THE MOAT
          </span>
        </h3>
        <span className="text-[11px] font-semibold text-teal-600">
          {sessionPacks} this session
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Compliance Status */}
          <div className="flex gap-2 mb-4">
            <div
              className={`flex-1 p-3 rounded-lg border text-center ${
                cmmcReady
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="text-[10px] text-slate-500 mb-1">CMMC Ready</div>
              <div
                className={`text-sm font-bold ${
                  cmmcReady ? 'text-green-800' : 'text-red-600'
                }`}
              >
                {cmmcReady ? 'YES' : 'NO'}
              </div>
            </div>
            <div
              className={`flex-1 p-3 rounded-lg border text-center ${
                dfarsCompliant
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="text-[10px] text-slate-500 mb-1">DFARS Compliant</div>
              <div
                className={`text-sm font-bold ${
                  dfarsCompliant ? 'text-green-800' : 'text-red-600'
                }`}
              >
                {dfarsCompliant ? 'YES' : 'NO'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between mb-3 py-2 border-b border-gray-200">
            <div>
              <div className="text-[10px] text-slate-500">Epic Total</div>
              <div className="text-base font-bold text-teal-600">{epicTotal}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Last Generated</div>
              <div className="text-xs font-medium text-slate-700">
                {lastGenerated}
              </div>
            </div>
          </div>

          {/* Recent Packs */}
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-slate-700 mb-2">
              Recent Packs
            </div>
            {recentPacks.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md mb-1 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className={pack.signed ? 'text-green-500' : 'text-amber-500'}>
                    {pack.signed ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <div className="text-[11px] font-medium text-slate-700 font-mono">
                      {pack.id}
                    </div>
                    <div className="text-[10px] text-slate-400">{pack.task}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">{pack.size}</div>
                  <div className="text-[9px] text-slate-400">{pack.timestamp}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <Eye className="w-4 h-4" /> View All
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 rounded-md text-[11px] font-semibold text-white hover:bg-teal-700 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
