'use client';

/**
 * Agent Memory Card
 * Displays token gauge, guardrails status (DP-09, DP-10), and demo mode toggle
 */

import { useState } from 'react';
import { ChevronRight, Cpu, Activity, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';
import type { DemoMode } from '../../page';

interface TokensData {
  current: number;
  optimal: number;
  warning: number;
  danger: number;
  status: 'optimal' | 'warning' | 'danger';
}

interface Guardrail {
  name: string;
  target: number;
  current: number;
  status: 'pass' | 'warning' | 'fail';
  critical: boolean;
}

interface GuardrailsData {
  dp09: Guardrail;
  dp10: Guardrail;
}

interface AgentMemoryCardProps {
  tokens?: TokensData;
  guardrails?: GuardrailsData;
  demoMode: DemoMode;
  onDemoModeChange: (mode: DemoMode) => void;
  expanded: boolean;
  onToggle: () => void;
}

function TokenGauge({
  current,
  optimal,
  warning,
  danger,
}: {
  current: number;
  optimal: number;
  warning: number;
  danger: number;
}) {
  const maxVal = danger * 1.1;
  const optimalPct = (optimal / maxVal) * 100;
  const warningPct = (warning / maxVal) * 100;
  const currentPct = Math.min((current / maxVal) * 100, 100);

  const getStatus = () => {
    if (current <= optimal) return { color: '#10b981', label: 'Optimal', bg: '#ecfdf5' };
    if (current <= warning) return { color: '#f59e0b', label: 'Warning', bg: '#fffbeb' };
    return { color: '#ef4444', label: 'Danger', bg: '#fef2f2' };
  };

  const status = getStatus();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-semibold text-slate-700">Session Tokens</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-lg font-bold"
            style={{ color: status.color }}
          >
            {(current / 1000).toFixed(1)}K
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-100 rounded overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-green-100 border-r border-green-500"
          style={{ width: `${optimalPct}%` }}
        />
        <div
          className="absolute top-0 h-full bg-amber-100 border-r border-amber-500"
          style={{ left: `${optimalPct}%`, width: `${warningPct - optimalPct}%` }}
        />
        <div
          className="absolute top-0 h-full bg-red-100"
          style={{ left: `${warningPct}%`, width: `${100 - warningPct}%` }}
        />
        <div
          className="absolute top-[-2px] w-0.5 h-3 rounded"
          style={{
            left: `${currentPct}%`,
            backgroundColor: status.color,
            transform: 'translateX(-50%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-green-500">0</span>
        <span className="text-[9px] text-green-500">{optimal / 1000}K optimal</span>
        <span className="text-[9px] text-amber-500">{warning / 1000}K warning</span>
        <span className="text-[9px] text-red-500">{danger / 1000}K rot</span>
      </div>
    </div>
  );
}

function GuardrailBadge({
  id,
  name,
  status,
  target,
  current,
  critical,
  onAcknowledge,
  acknowledged,
}: {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  target: number;
  current: number;
  critical: boolean;
  onAcknowledge: (id: string) => void;
  acknowledged: boolean;
}) {
  const styles = {
    pass: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800' },
    warning: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800' },
    fail: { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-600' },
  };
  const s = styles[status];

  const needsAction = (status === 'warning' || status === 'fail') && !acknowledged;

  return (
    <div className={`p-2.5 ${s.bg} border ${s.border} rounded-lg mb-1.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={s.text}>
            {status === 'pass' ? (
              <Check className="w-3.5 h-3.5" />
            ) : status === 'fail' ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="text-xs font-medium text-slate-700">{name}</span>
          {critical && (
            <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1 py-0.5 rounded">
              CRITICAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold ${s.text}`}>
            {current}% ≥{target}%
          </span>
          {acknowledged && (
            <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Acknowledged
            </span>
          )}
        </div>
      </div>
      {needsAction && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => onAcknowledge(id)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md text-white ${
              status === 'fail' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
            } transition-colors`}
          >
            {status === 'fail' ? 'Review Required' : 'Acknowledge'}
          </button>
        </div>
      )}
    </div>
  );
}

export function AgentMemoryCard({
  tokens,
  guardrails,
  demoMode,
  onDemoModeChange,
  expanded,
  onToggle,
}: AgentMemoryCardProps) {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const tokenData = tokens ?? {
    current: 8200,
    optimal: 15000,
    warning: 30000,
    danger: 40000,
    status: 'optimal' as const,
  };

  const guardrailData = guardrails ?? {
    dp09: { name: 'PII Recall', target: 99, current: 99.2, status: 'pass' as const, critical: true },
    dp10: { name: 'Secret Recall', target: 100, current: 100, status: 'pass' as const, critical: true },
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledged((prev) => ({ ...prev, [id]: true }));
  };

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
          <Cpu className="w-4 h-4 text-teal-600" />
          Agent Memory
        </h3>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            tokenData.status === 'optimal'
              ? 'text-green-500 bg-green-50'
              : tokenData.status === 'warning'
              ? 'text-amber-500 bg-amber-50'
              : 'text-red-500 bg-red-50'
          }`}
        >
          {(tokenData.current / 1000).toFixed(1)}K tokens
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4 border border-dashed border-slate-300">
            <span className="text-[10px] text-slate-500 font-medium">Demo Mode:</span>
            <div className="flex gap-1">
              {(['normal', 'warning', 'critical'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onDemoModeChange(mode)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                    demoMode === mode
                      ? mode === 'normal'
                        ? 'bg-green-500 text-white'
                        : mode === 'warning'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-gray-200 text-slate-500'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Token Gauge */}
          <TokenGauge
            current={tokenData.current}
            optimal={tokenData.optimal}
            warning={tokenData.warning}
            danger={tokenData.danger}
          />

          {/* Guardrails */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-slate-700">Guardrails</span>
            </div>
            <GuardrailBadge
              id="dp09"
              name={guardrailData.dp09.name}
              status={guardrailData.dp09.status}
              target={guardrailData.dp09.target}
              current={guardrailData.dp09.current}
              critical={guardrailData.dp09.critical}
              onAcknowledge={handleAcknowledge}
              acknowledged={acknowledged['dp09'] ?? false}
            />
            <GuardrailBadge
              id="dp10"
              name={guardrailData.dp10.name}
              status={guardrailData.dp10.status}
              target={guardrailData.dp10.target}
              current={guardrailData.dp10.current}
              critical={guardrailData.dp10.critical}
              onAcknowledge={handleAcknowledge}
              acknowledged={acknowledged['dp10'] ?? false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
