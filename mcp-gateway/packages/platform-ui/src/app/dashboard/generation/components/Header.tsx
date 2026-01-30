'use client';

/**
 * FORGE Generation Dashboard Header
 * Displays logo, compliance badges, and generation controls
 */

import { ChevronDown, Shield, ShieldCheck, Award, Check, X } from 'lucide-react';

interface HeaderProps {
  evidencePacks?: {
    cmmcReady: boolean;
    dfarsCompliant: boolean;
  };
  supplyChain?: {
    slsaLevel: number;
  };
}

function ComplianceBadge({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const colors = status
    ? { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
    : { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' };

  return (
    <div
      className={`flex items-center gap-1 ${colors.bg} ${colors.text} border ${colors.border} px-2 py-1 rounded-md text-[10px] font-semibold`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {status ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </div>
  );
}

export function Header({ evidencePacks, supplyChain }: HeaderProps) {
  const cmmcReady = evidencePacks?.cmmcReady ?? true;
  const dfarsCompliant = evidencePacks?.dfarsCompliant ?? true;
  const slsaLevel = supplyChain?.slsaLevel ?? 3;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        {/* Logo */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-teal-600"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="font-bold text-[17px] text-slate-900 tracking-tight">
          FORGE
        </span>
        <span className="text-slate-200 font-light text-xl">|</span>
        <span className="font-medium text-sm text-slate-500">Generation</span>

        {/* Active Status */}
        <div className="flex items-center gap-1.5 ml-2 bg-green-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-xs font-medium text-green-600">Active</span>
        </div>

        {/* Compliance Badges */}
        <div className="flex items-center gap-1.5 ml-4">
          <ComplianceBadge label="CMMC" status={cmmcReady} icon={Shield} />
          <ComplianceBadge label="DFARS" status={dfarsCompliant} icon={ShieldCheck} />
          {slsaLevel >= 3 && (
            <ComplianceBadge label={`SLSA L${slsaLevel}`} status={true} icon={Award} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Internal Dev Dashboard Link */}
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-slate-100 transition-colors border border-slate-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Internal Dev</span>
        </a>

        {/* Model Selector */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-[13px] text-slate-500">Claude Opus</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>

        {/* New Chat Button */}
        <button className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-teal-700 transition-colors">
          <span className="text-base">+</span> New Chat
        </button>
      </div>
    </header>
  );
}
