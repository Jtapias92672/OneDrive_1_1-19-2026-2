'use client';

/**
 * CARS Framework Card
 * Displays autonomy level, risk assessment, and operation gates
 */

import { ChevronRight, AlertTriangle } from 'lucide-react';

type AutonomyLevel = 'AUTONOMOUS' | 'SUPERVISED' | 'HUMAN_REQUIRED';
type GateStatus = 'auto' | 'supervised' | 'human' | 'blocked';

interface Gate {
  name: string;
  status: GateStatus;
  risk: string;
}

interface CarsStatusData {
  autonomyLevel: AutonomyLevel;
  riskLevel: number;
  maxRisk: number;
  pendingApprovals: number;
  gates: Gate[];
}

interface CarsFrameworkCardProps {
  data?: CarsStatusData;
  expanded: boolean;
  onToggle: () => void;
}

function RiskLevelIndicator({ level, max }: { level: number; max: number }) {
  const colors = ['#10b981', '#84cc16', '#f59e0b', '#ef4444'];
  const labels = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: i < level ? colors[level - 1] : '#e5e7eb',
            }}
          />
        ))}
      </div>
      <span
        className="text-[10px] font-semibold"
        style={{ color: colors[level - 1] }}
      >
        {labels[level - 1]}
      </span>
    </div>
  );
}

// Traffic light icon
function TrafficLight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  );
}

export function CarsFrameworkCard({
  data,
  expanded,
  onToggle,
}: CarsFrameworkCardProps) {
  const autonomyLevel = data?.autonomyLevel ?? 'AUTONOMOUS';
  const riskLevel = data?.riskLevel ?? 1;
  const maxRisk = data?.maxRisk ?? 4;
  const pendingApprovals = data?.pendingApprovals ?? 0;
  const gates = data?.gates ?? [
    { name: 'Code Generation', status: 'auto', risk: 'low' },
    { name: 'File Write', status: 'auto', risk: 'low' },
    { name: 'Deploy', status: 'supervised', risk: 'medium' },
    { name: 'Production Push', status: 'human', risk: 'high' },
  ];

  const autonomyColors: Record<AutonomyLevel, { bg: string; text: string }> = {
    AUTONOMOUS: { bg: 'bg-green-100', text: 'text-green-800' },
    SUPERVISED: { bg: 'bg-amber-100', text: 'text-amber-800' },
    HUMAN_REQUIRED: { bg: 'bg-red-100', text: 'text-red-600' },
  };

  const gateColors: Record<GateStatus, { bg: string; text: string; label: string }> = {
    auto: { bg: 'bg-green-100', text: 'text-green-800', label: 'Auto' },
    supervised: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Supervised' },
    human: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Human' },
    blocked: { bg: 'bg-red-100', text: 'text-red-600', label: 'Blocked' },
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
          <TrafficLight className="w-4 h-4 text-teal-600" />
          CARS Autonomy
        </h3>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            autonomyColors[autonomyLevel].bg
          } ${autonomyColors[autonomyLevel].text}`}
        >
          {autonomyLevel.replace('_', ' ')}
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Risk Level */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium text-slate-700">
              Current Risk Level
            </span>
            <RiskLevelIndicator level={riskLevel} max={maxRisk} />
          </div>

          {/* Pending Approvals Alert */}
          {pendingApprovals > 0 && (
            <div className="p-2.5 bg-amber-100 border border-amber-200 rounded-lg mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  {pendingApprovals} Pending Approval
                  {pendingApprovals > 1 ? 's' : ''}
                </span>
              </div>
              <button className="text-[10px] font-semibold px-2.5 py-1 bg-amber-500 text-white rounded">
                Review
              </button>
            </div>
          )}

          {/* Operation Gates */}
          <div className="text-[11px] font-semibold text-slate-700 mb-2">
            Operation Gates
          </div>
          {gates.map((gate) => (
            <div
              key={gate.name}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <span className="text-xs text-slate-700">{gate.name}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  gateColors[gate.status as GateStatus].bg
                } ${gateColors[gate.status as GateStatus].text}`}
              >
                {gateColors[gate.status as GateStatus].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
