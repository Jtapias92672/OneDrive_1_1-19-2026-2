'use client';

/**
 * Verification Card
 * Displays test status for Slop Tests, TypeScript, Unit Tests, Integration
 */

import { ChevronRight, CheckSquare, Play, Loader } from 'lucide-react';

type VerificationStatus = 'pass' | 'fail' | 'running';

interface VerificationItem {
  name: string;
  status: VerificationStatus;
  count?: number;
}

interface VerificationCardProps {
  expanded: boolean;
  onToggle: () => void;
}

function StatusBadge({ status, count }: { status: VerificationStatus; count?: number }) {
  const styles = {
    pass: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pass' },
    fail: { bg: 'bg-amber-100', text: 'text-amber-800', label: `${count} fail` },
    running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
  };
  const s = styles[status];

  return (
    <span
      className={`${s.bg} ${s.text} text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1`}
    >
      {status === 'running' && <Loader className="w-3 h-3 animate-spin" />}
      {s.label}
    </span>
  );
}

export function VerificationCard({ expanded, onToggle }: VerificationCardProps) {
  const verificationItems: VerificationItem[] = [
    { name: 'Slop Tests', status: 'pass' },
    { name: 'TypeScript', status: 'pass' },
    { name: 'Unit Tests', status: 'fail', count: 2 },
    { name: 'Integration', status: 'running' },
  ];

  return (
    <div className="mb-5 bg-white rounded-xl p-4 border border-gray-200">
      {/* Header */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between cursor-pointer ${
          expanded ? 'mb-3.5' : ''
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
          <CheckSquare className="w-4 h-4 text-teal-600" />
          Verification
        </h3>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 bg-teal-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-semibold hover:bg-teal-700 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Run All
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="grid grid-cols-2 gap-2.5">
          {verificationItems.map((item) => {
            const bgColor =
              item.status === 'pass'
                ? 'bg-green-50 border-green-200'
                : item.status === 'fail'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-blue-50 border-blue-200';

            return (
              <div
                key={item.name}
                className={`${bgColor} border rounded-[10px] p-3.5 flex flex-col gap-2`}
              >
                <span className="text-xs text-slate-700 font-medium">{item.name}</span>
                <StatusBadge status={item.status} count={item.count} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
