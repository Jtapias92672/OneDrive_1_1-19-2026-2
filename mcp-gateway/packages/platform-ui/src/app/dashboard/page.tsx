'use client';

import React, { useState, useCallback, memo, Suspense } from 'react';
import { ErrorBoundary, CardErrorFallback } from '@/components/error-boundary';
import {
  EvidencePacksSkeleton,
  CarsFrameworkSkeleton,
  SupplyChainSkeleton,
  AgentMemorySkeleton,
  VerificationSkeleton,
  MainContentSkeleton,
} from '@/components/skeleton-loaders';
import { useDashboardData } from '@/hooks/use-dashboard-data';

import type {
  DemoMode,
  NavItem,
  ExpandedSections,
  EpicProgress,
  Gate,
} from '@/lib/dashboard';

import { getMockEpicProgress } from '@/lib/dashboard';

// ============================================
// ICONS (memoized for performance)
// ============================================

const Icons = {
  logo: memo(function LogoIcon({ className = 'w-6 h-6' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    );
  }),
  chat: memo(function ChatIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }),
  folder: memo(function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }),
  layers: memo(function LayersIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
      </svg>
    );
  }),
  target: memo(function TargetIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    );
  }),
  zap: memo(function ZapIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    );
  }),
  database: memo(function DatabaseIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    );
  }),
  checkSquare: memo(function CheckSquareIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    );
  }),
  settings: memo(function SettingsIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    );
  }),
  file: memo(function FileIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  }),
  check: memo(function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }),
  play: memo(function PlayIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>;
  }),
  pause: memo(function PauseIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
  }),
  refresh: memo(function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    );
  }),
  send: memo(function SendIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    );
  }),
  sparkles: memo(function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"/><circle cx="12" cy="12" r="4"/>
      </svg>
    );
  }),
  x: memo(function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    );
  }),
  chevronDown: memo(function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    );
  }),
  chevronRight: memo(function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    );
  }),
  paperclip: memo(function PaperclipIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
    );
  }),
  loader: memo(function LoaderIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} animate-spin`}>
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    );
  }),
  shield: memo(function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    );
  }),
  shieldCheck: memo(function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    );
  }),
  cpu: memo(function CpuIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    );
  }),
  activity: memo(function ActivityIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    );
  }),
  alertTriangle: memo(function AlertTriangleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    );
  }),
  package: memo(function PackageIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    );
  }),
  trafficLight: memo(function TrafficLightIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="17" r="2"/>
      </svg>
    );
  }),
  link: memo(function LinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    );
  }),
  award: memo(function AwardIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
    );
  }),
  download: memo(function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    );
  }),
  eye: memo(function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }),
  fingerprint: memo(function FingerprintIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/>
        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
        <path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
        <path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/>
      </svg>
    );
  }),
  menu: memo(function MenuIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    );
  }),
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================

const ProgressRing = memo(function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 4
}: {
  progress: number;
  size?: number;
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}/>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#0d9488" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500"/>
    </svg>
  );
});

const ProgressBar = memo(function ProgressBar({
  progress,
  size = 'md',
  color = 'teal'
}: {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string
}) {
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };
  const colors: Record<string, string> = { teal: 'bg-teal-600', blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className={`w-full bg-gray-100 rounded ${heights[size]} overflow-hidden`}>
      <div className={`${colors[color]} h-full rounded transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}/>
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({
  status,
  count
}: {
  status: 'pass' | 'fail' | 'running';
  count?: number
}) {
  const styles = {
    pass: 'bg-green-100 text-green-800',
    fail: 'bg-amber-100 text-amber-800',
    running: 'bg-blue-100 text-blue-800',
  };
  const labels = {
    pass: 'Pass',
    fail: `${count} fail`,
    running: 'Running',
  };
  return (
    <span className={`${styles[status]} text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1`}>
      {status === 'running' && <Icons.loader />}{labels[status]}
    </span>
  );
});

const ComplianceBadge = memo(function ComplianceBadge({
  label,
  status,
  icon
}: {
  label: string;
  status: boolean;
  icon: React.ReactNode
}) {
  const colors = status
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-600 border-red-200';
  return (
    <div className={`flex items-center gap-1 ${colors} border px-2 py-1 rounded-md text-[10px] font-semibold`}>
      {icon}{label}{status ? <Icons.check /> : <Icons.x />}
    </div>
  );
});

const CarsLevelIndicator = memo(function CarsLevelIndicator({
  level,
  max
}: {
  level: number;
  max: number
}) {
  const safeLevel = Math.max(1, Math.min(level, max));
  const colors = ['bg-green-500', 'bg-lime-500', 'bg-amber-500', 'bg-red-500'];
  const textColors = ['text-green-500', 'text-lime-500', 'text-amber-500', 'text-red-500'];
  const labels = ['Low', 'Medium', 'High', 'Critical'];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {[...Array(max)].map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < safeLevel ? colors[safeLevel - 1] : 'bg-gray-200'}`}/>
        ))}
      </div>
      <span className={`text-[10px] font-semibold ${textColors[safeLevel - 1]}`}>{labels[safeLevel - 1]}</span>
    </div>
  );
});

const TokenGauge = memo(function TokenGauge({
  current,
  optimal,
  warning,
  danger
}: {
  current: number;
  optimal: number;
  warning: number;
  danger: number
}) {
  const maxVal = danger * 1.1;
  const optimalPct = (optimal / maxVal) * 100;
  const warningPct = (warning / maxVal) * 100;
  const currentPct = Math.min((current / maxVal) * 100, 100);

  const getStatus = () => {
    if (current <= optimal) return { color: 'text-green-500', label: 'Optimal', bg: 'bg-green-50' };
    if (current <= warning) return { color: 'text-amber-500', label: 'Warning', bg: 'bg-amber-50' };
    return { color: 'text-red-500', label: 'Danger', bg: 'bg-red-50' };
  };
  const status = getStatus();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-teal-600"><Icons.activity /></span>
          <span className="text-xs font-semibold text-gray-700">Session Tokens</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold ${status.color}`}>{(current / 1000).toFixed(1)}K</span>
          <span className={`text-[10px] font-semibold ${status.color} ${status.bg} px-2 py-0.5 rounded`}>{status.label}</span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded overflow-hidden">
        <div className="absolute left-0 top-0 h-full bg-green-100 border-r border-green-500" style={{ width: `${optimalPct}%` }}/>
        <div className="absolute top-0 h-full bg-amber-100 border-r border-amber-500" style={{ left: `${optimalPct}%`, width: `${warningPct - optimalPct}%` }}/>
        <div className="absolute top-0 h-full bg-red-100" style={{ left: `${warningPct}%`, width: `${100 - warningPct}%` }}/>
        <div className={`absolute top-[-2px] w-[3px] h-3 ${status.color.replace('text', 'bg')} rounded transform -translate-x-1/2 shadow`} style={{ left: `${currentPct}%` }}/>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-green-500">0</span>
        <span className="text-[9px] text-green-500">{(optimal/1000)}K optimal</span>
        <span className="text-[9px] text-amber-500">{(warning/1000)}K warning</span>
        <span className="text-[9px] text-red-500">{(danger/1000)}K rot</span>
      </div>
    </div>
  );
});

const GuardrailBadge = memo(function GuardrailBadge({
  id, name, status, target, current, critical, onAction, acknowledged
}: {
  id: string; name: string; status: string; target?: number; current?: number; critical?: boolean; onAction?: (id: string) => void; acknowledged?: boolean;
}) {
  const styles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    pass: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', icon: <Icons.check /> },
    safe: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', icon: <Icons.check /> },
    warning: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800', icon: <Icons.alertTriangle /> },
    fail: { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-600', icon: <Icons.x /> }
  };
  const s = styles[status] || styles.pass;
  const needsAction = (status === 'warning' || status === 'fail') && !acknowledged;

  return (
    <div className={`p-3 ${s.bg} border ${s.border} rounded-lg mb-1.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={s.text}>{s.icon}</span>
          <span className="text-xs font-medium text-gray-700">{name}</span>
          {critical && <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">CRITICAL</span>}
        </div>
        <div className="flex items-center gap-2">
          {target !== undefined && <span className={`text-[11px] font-semibold ${s.text}`}>{current !== undefined ? `${current}%` : ''} {target ? `≥${target}%` : ''}</span>}
          {acknowledged && <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Acknowledged</span>}
        </div>
      </div>
      {needsAction && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => onAction && onAction(id)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md text-white ${status === 'fail' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'} transition-colors`}
          >
            {status === 'fail' ? 'Review Required' : 'Acknowledge'}
          </button>
        </div>
      )}
    </div>
  );
});

const ActionButton = memo(function ActionButton({
  children,
  variant = 'secondary',
  icon: Icon,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: React.FC<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white border-transparent disabled:bg-teal-300',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 disabled:bg-gray-100 disabled:text-gray-400',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 ${styles[variant]} border rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed`}
    >
      {Icon && <Icon className="w-4 h-4" />}{children}
    </button>
  );
});

// ============================================
// CARD COMPONENTS WITH ERROR BOUNDARIES
// ============================================

interface EvidencePacksCardProps {
  evidencePacks: NonNullable<ReturnType<typeof useDashboardData>['evidencePacks']>;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
}

const EvidencePacksCard = memo(function EvidencePacksCard({
  evidencePacks,
  expanded,
  onToggle,
  onExport,
}: EvidencePacksCardProps) {
  return (
    <div className="mb-5 bg-white rounded-xl border-2 border-teal-600 overflow-hidden">
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200"
      >
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className={`text-teal-600 transition-transform ${expanded ? 'rotate-90' : ''}`}><Icons.chevronRight /></span>
          <span className="text-teal-600"><Icons.package /></span>
          Evidence Packs
          <span className="text-[9px] font-semibold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded ml-1">THE MOAT</span>
        </h3>
        <span className="text-[11px] font-semibold text-teal-600">{evidencePacks.sessionPacks} this session</span>
      </div>
      {expanded && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <div className={`flex-1 p-3 ${evidencePacks.cmmcReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg text-center`}>
              <div className="text-[10px] text-slate-500 mb-1">CMMC Ready</div>
              <div className={`text-sm font-bold ${evidencePacks.cmmcReady ? 'text-green-800' : 'text-red-600'}`}>{evidencePacks.cmmcReady ? 'YES' : 'NO'}</div>
            </div>
            <div className={`flex-1 p-3 ${evidencePacks.dfarsCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg text-center`}>
              <div className="text-[10px] text-slate-500 mb-1">DFARS Compliant</div>
              <div className={`text-sm font-bold ${evidencePacks.dfarsCompliant ? 'text-green-800' : 'text-red-600'}`}>{evidencePacks.dfarsCompliant ? 'YES' : 'NO'}</div>
            </div>
          </div>
          <div className="flex justify-between mb-3 py-2 border-b border-gray-200">
            <div><div className="text-[10px] text-slate-500">Epic Total</div><div className="text-base font-bold text-teal-600">{evidencePacks.epicTotal}</div></div>
            <div className="text-right"><div className="text-[10px] text-slate-500">Last Generated</div><div className="text-xs font-medium text-slate-700">{evidencePacks.lastGenerated}</div></div>
          </div>
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-slate-700 mb-2">Recent Packs</div>
            {evidencePacks.recentPacks.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md mb-1 border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className={pack.signed ? 'text-green-500' : 'text-amber-500'}>{pack.signed ? <Icons.shieldCheck /> : <Icons.alertTriangle />}</span>
                  <div><div className="text-[11px] font-medium text-slate-700 font-mono">{pack.id}</div><div className="text-[10px] text-slate-400">{pack.task}</div></div>
                </div>
                <div className="text-right"><div className="text-[10px] text-slate-500">{pack.size}</div><div className="text-[9px] text-slate-400">{pack.timestamp}</div></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-[11px] font-semibold py-2 px-3 rounded-md border border-gray-200 bg-white text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"><Icons.eye /> View All</button>
            <button onClick={onExport} className="flex-1 text-[11px] font-semibold py-2 px-3 rounded-md bg-teal-600 text-white flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors"><Icons.download /> Export</button>
          </div>
        </div>
      )}
    </div>
  );
});

interface CarsFrameworkCardProps {
  carsStatus: NonNullable<ReturnType<typeof useDashboardData>['carsStatus']>;
  expanded: boolean;
  onToggle: () => void;
}

const CarsFrameworkCard = memo(function CarsFrameworkCard({
  carsStatus,
  expanded,
  onToggle
}: CarsFrameworkCardProps) {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer ${expanded ? 'bg-slate-50 border-b border-gray-200' : ''}`}
      >
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className={`text-teal-600 transition-transform ${expanded ? 'rotate-90' : ''}`}><Icons.chevronRight /></span>
          <span className="text-teal-600"><Icons.trafficLight /></span>
          CARS Autonomy
        </h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
          carsStatus.autonomyLevel === 'AUTONOMOUS' ? 'text-green-800 bg-green-100' :
          carsStatus.autonomyLevel === 'SUPERVISED' ? 'text-amber-800 bg-amber-100' : 'text-red-600 bg-red-100'
        }`}>
          {carsStatus.autonomyLevel.replace('_', ' ')}
        </span>
      </div>
      {expanded && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium text-slate-700">Current Risk Level</span>
            <CarsLevelIndicator level={carsStatus.riskLevel} max={carsStatus.maxRisk} />
          </div>
          {carsStatus.pendingApprovals > 0 && (
            <div className="p-2.5 bg-amber-100 border border-amber-200 rounded-lg mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Icons.alertTriangle /><span className="text-xs font-medium text-amber-800">{carsStatus.pendingApprovals} Pending Approval{carsStatus.pendingApprovals > 1 ? 's' : ''}</span></div>
              <button className="text-[10px] font-semibold px-2.5 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors">Review</button>
            </div>
          )}
          <div className="text-[11px] font-semibold text-slate-700 mb-2">Operation Gates</div>
          {carsStatus.gates.map((gate: Gate) => {
            const gateColors: Record<Gate['status'], string> = {
              auto: 'text-green-800 bg-green-100',
              supervised: 'text-amber-800 bg-amber-100',
              human: 'text-indigo-800 bg-indigo-100',
              blocked: 'text-red-600 bg-red-100'
            };
            const labels: Record<Gate['status'], string> = { auto: 'Auto', supervised: 'Supervised', human: 'Human', blocked: 'Blocked' };
            return (
              <div key={gate.name} className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-700">{gate.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${gateColors[gate.status]}`}>{labels[gate.status]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

interface SupplyChainCardProps {
  supplyChain: NonNullable<ReturnType<typeof useDashboardData>['supplyChain']>;
  expanded: boolean;
  onToggle: () => void;
}

const SupplyChainCard = memo(function SupplyChainCard({
  supplyChain,
  expanded,
  onToggle
}: SupplyChainCardProps) {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer ${expanded ? 'bg-slate-50 border-b border-gray-200' : ''}`}
      >
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className={`text-teal-600 transition-transform ${expanded ? 'rotate-90' : ''}`}><Icons.chevronRight /></span>
          <span className="text-teal-600"><Icons.link /></span>
          Supply Chain
        </h3>
        {supplyChain.vulnerabilities > 0 ? (
          <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">{supplyChain.vulnerabilities} vuln</span>
        ) : (
          <span className="text-[10px] font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded">Secure</span>
        )}
      </div>
      {expanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">Dependencies</div>
              <div className={`text-base font-bold ${supplyChain.verifiedDeps === supplyChain.totalDeps ? 'text-teal-600' : 'text-amber-500'}`}>{supplyChain.verifiedDeps}/{supplyChain.totalDeps}</div>
              <div className="text-[9px] text-slate-400">verified</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">SLSA Level</div>
              <div className={`text-base font-bold ${supplyChain.slsaLevel >= 3 ? 'text-teal-600' : 'text-amber-500'}`}>L{supplyChain.slsaLevel}</div>
              <div className="text-[9px] text-slate-400">provenance</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={`flex items-center justify-between p-2.5 rounded-md ${supplyChain.signaturesValid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2"><Icons.fingerprint /><span className="text-xs text-slate-700">Signatures Valid</span></div>
              <span className={supplyChain.signaturesValid ? 'text-green-500' : 'text-red-500'}>{supplyChain.signaturesValid ? <Icons.check /> : <Icons.x />}</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-md ${supplyChain.sbomGenerated ? 'bg-green-50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2"><Icons.file /><span className="text-xs text-slate-700">SBOM Generated</span></div>
              <span className={supplyChain.sbomGenerated ? 'text-green-500' : 'text-slate-400'}>{supplyChain.sbomGenerated ? <Icons.check /> : '—'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md">
              <span className="text-xs text-slate-700">Last Audit</span>
              <span className="text-[11px] font-medium text-slate-500">{supplyChain.lastAudit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// MAIN DASHBOARD
// ============================================

export default function ForgeDashboard() {
  const [activeNav, setActiveNav] = useState('Chat');
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    evidencePacks: true, cars: true, supplyChain: false, memory: true, verification: true,
  });
  const [guardrailActions, setGuardrailActions] = useState<{ acknowledged: Record<string, boolean> }>({ acknowledged: {} });
  const [demoMode, setDemoMode] = useState<DemoMode>('normal');
  const [messageInput, setMessageInput] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Fetch dashboard data with loading/error states
  const {
    epicProgress: fetchedEpicProgress,
    agentMemory,
    evidencePacks,
    carsStatus,
    supplyChain,
    verification,
    isLoading,
    errors,
    refreshSection,
  } = useDashboardData(demoMode, false); // Use Gateway API, not mocks

  // Fallback to mock data if fetch fails
  const epicProgress: EpicProgress = fetchedEpicProgress || getMockEpicProgress(demoMode);

  const toggleSection = useCallback((section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleAcknowledge = useCallback((guardrailId: string) => {
    setGuardrailActions(prev => ({ ...prev, acknowledged: { ...prev.acknowledged, [guardrailId]: true } }));
  }, []);

  // Sanitize user input to prevent XSS
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic XSS prevention - strip HTML tags
    const sanitized = e.target.value.replace(/<[^>]*>/g, '');
    setMessageInput(sanitized);
  }, []);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;

    try {
      // POST to message API endpoint
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageInput, timestamp: new Date().toISOString() }),
      });

      if (response.ok) {
        setMessageInput(''); // Clear input on success
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [messageInput]);

  // Export dashboard data handler
  const handleExport = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      epicProgress,
      agentMemory,
      evidencePacks,
      carsStatus,
      supplyChain,
      verification,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [epicProgress, agentMemory, evidencePacks, carsStatus, supplyChain, verification]);

  // File upload handler
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('File uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const navItems: NavItem[] = [
    { name: 'Projects', icon: Icons.layers, badge: 5 },
    { name: 'Chat', icon: Icons.chat, badge: 3 },
    { name: 'Files', icon: Icons.folder, badge: 3 },
    { name: 'Objectives', icon: Icons.target, badge: null },
    { name: 'Skills', icon: Icons.zap, badge: null },
    { name: 'Memory', icon: Icons.database, badge: null },
    { name: 'Tasks', icon: Icons.checkSquare, badge: 2 },
    { name: 'Settings', icon: Icons.settings, badge: null },
  ];

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header - Responsive */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white">
              <Icons.logo className="w-4 h-4" />
            </div>
            <span className="font-bold text-[17px] text-slate-900 tracking-tight">FORGE</span>
            <span className="text-slate-200 font-light text-xl hidden sm:inline">|</span>
            <span className="font-medium text-sm text-slate-500 hidden sm:inline">Cowork</span>
            <div className="flex items-center gap-1.5 ml-2 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-xs font-medium text-green-600">Active</span>
            </div>
            {/* Compliance badges - hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5 ml-4">
              {evidencePacks && (
                <>
                  <ComplianceBadge label="CMMC" status={evidencePacks.cmmcReady} icon={<Icons.shield />} />
                  <ComplianceBadge label="DFARS" status={evidencePacks.dfarsCompliant} icon={<Icons.shieldCheck />} />
                </>
              )}
              {supplyChain && supplyChain.slsaLevel >= 3 && (
                <ComplianceBadge label={`SLSA L${supplyChain.slsaLevel}`} status={true} icon={<Icons.award />} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile menu toggle for right panel */}
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle panel"
            >
              <Icons.menu />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-500">Claude Opus</span>
              <Icons.chevronDown />
            </div>
            <button className="flex items-center gap-1.5 bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors">
              <span className="text-base">+</span> <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Hidden on mobile */}
          <aside className="hidden sm:flex w-[72px] bg-white border-r border-gray-200 flex-col items-center py-5 shrink-0">
            <div className="relative mb-1">
              <ProgressRing progress={epicProgress.percentage} />
              <div className="absolute inset-0 flex items-center justify-center text-teal-600"><Icons.logo /></div>
            </div>
            <span className="text-[11px] font-bold text-teal-600">{epicProgress.percentage}%</span>
            <span className="text-[10px] text-slate-400 mb-5">{epicProgress.id}</span>
            <nav className="flex-1 flex flex-col gap-0.5 w-full px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveNav(item.name)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl relative transition-colors ${isActive ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <Icon /><span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : ''}`}>{item.name}</span>
                    {item.badge && <span className="absolute top-1.5 right-1.5 bg-teal-600 text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">{item.badge}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="flex flex-col items-center mt-auto">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold relative">
                JT<span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1.5 text-center leading-tight">forge-<br/>platform-ui</span>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-sm font-semibold text-teal-600 truncate">forge-platform-ui</span>
                <span className="text-slate-200 hidden sm:inline">|</span>
                <span className="text-sm font-semibold text-slate-900 truncate hidden sm:inline">{epicProgress.id}: {epicProgress.name}</span>
                {epicProgress.phase && (
                  <>
                    <span className="text-slate-200 hidden md:inline">•</span>
                    <span className="text-sm text-slate-500 hidden md:inline">{epicProgress.phase}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <ActionButton variant="secondary" icon={Icons.pause}>
                  <span className="hidden sm:inline">Pause</span>
                </ActionButton>
                <ActionButton variant="secondary" icon={Icons.refresh}>
                  <span className="hidden sm:inline">Run Tests</span>
                </ActionButton>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-start">
              {isLoading ? (
                <MainContentSkeleton />
              ) : (
                <div className="w-full max-w-[900px]">
                  <div className="flex justify-end mb-5">
                    <div className="bg-teal-600 text-white px-4 py-3 rounded-2xl rounded-br-sm max-w-[70%] text-sm leading-relaxed">
                      Continue working on {epicProgress.id} - {epicProgress.name}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full">
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
                      <div className="text-teal-600"><Icons.sparkles /></div>
                      <span className="font-semibold text-teal-700">Session Restored</span>
                      <span className="ml-auto text-xs text-slate-500">2 hours ago</span>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-slate-50 rounded-xl p-3.5">
                          <div className="text-xs text-slate-500 mb-1">Completed</div>
                          <div className="text-[15px] font-semibold text-green-500">3 tasks</div>
                        </div>
                        <div className="bg-teal-50 rounded-xl p-3.5 border border-teal-200">
                          <div className="text-xs text-slate-500 mb-1">In Progress</div>
                          <div className="text-[15px] font-semibold text-teal-600">Task 10b.2.1</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3.5">
                          <div className="text-xs text-slate-500 mb-1">Remaining</div>
                          <div className="text-[15px] font-semibold text-slate-500">4 tasks</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 mb-5">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-teal-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md">CURRENT</span>
                            <span className="font-semibold text-slate-900">{epicProgress.id} - {epicProgress.name}</span>
                          </div>
                          <span className="text-xl font-bold text-teal-600">{epicProgress.percentage}%</span>
                        </div>
                        <ProgressBar progress={epicProgress.percentage} size="lg" />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-amber-800 text-sm">Should I proceed with this implementation?</span>
                        <div className="flex gap-2">
                          <ActionButton variant="primary">Yes, continue</ActionButton>
                          <ActionButton variant="secondary">Let me review</ActionButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-slate-50 py-4 px-4 sm:px-8 flex justify-start">
              <div className="w-full max-w-[900px] flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-slate-200 shadow-sm">
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.go,.rs"
                  aria-label="Upload file"
                />
                <button onClick={handleAttachClick} className="text-slate-500 hover:text-slate-700 p-1 rounded-md transition-colors"><Icons.paperclip /></button>
                <input
                  id="message-input"
                  name="message-input"
                  type="text"
                  value={messageInput}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Message FORGE..."
                  className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
                  maxLength={4000}
                  autoComplete="off"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">⌘ Enter</span>
                  <button onClick={handleSendMessage} className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white hover:bg-teal-700 transition-colors"><Icons.send /></button>
                </div>
              </div>
            </div>
          </main>

          {/* Right Panel - Collapsible on mobile */}
          <aside className={`
            ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            right-0 top-14 lg:top-0
            h-[calc(100vh-3.5rem)] lg:h-auto
            w-[320px] sm:w-[360px]
            bg-white border-l border-gray-200
            flex flex-col shrink-0 overflow-hidden
            transition-transform duration-300 ease-in-out
            z-40
          `}>
            <div className="flex-1 overflow-auto p-4">

              {/* Evidence Packs Card */}
              <ErrorBoundary fallback={<CardErrorFallback title="Evidence Packs" onRetry={() => refreshSection('evidencePacks')} />}>
                {isLoading ? (
                  <EvidencePacksSkeleton />
                ) : evidencePacks ? (
                  <EvidencePacksCard
                    evidencePacks={evidencePacks}
                    expanded={expandedSections.evidencePacks}
                    onToggle={() => toggleSection('evidencePacks')}
                    onExport={handleExport}
                  />
                ) : errors.evidencePacks ? (
                  <CardErrorFallback title="Evidence Packs" onRetry={() => refreshSection('evidencePacks')} />
                ) : null}
              </ErrorBoundary>

              {/* CARS Framework Card */}
              <ErrorBoundary fallback={<CardErrorFallback title="CARS Autonomy" onRetry={() => refreshSection('carsStatus')} />}>
                {isLoading ? (
                  <CarsFrameworkSkeleton />
                ) : carsStatus ? (
                  <CarsFrameworkCard
                    carsStatus={carsStatus}
                    expanded={expandedSections.cars}
                    onToggle={() => toggleSection('cars')}
                  />
                ) : errors.carsStatus ? (
                  <CardErrorFallback title="CARS Autonomy" onRetry={() => refreshSection('carsStatus')} />
                ) : null}
              </ErrorBoundary>

              {/* Supply Chain Card */}
              <ErrorBoundary fallback={<CardErrorFallback title="Supply Chain" onRetry={() => refreshSection('supplyChain')} />}>
                {isLoading ? (
                  <SupplyChainSkeleton />
                ) : supplyChain ? (
                  <SupplyChainCard
                    supplyChain={supplyChain}
                    expanded={expandedSections.supplyChain}
                    onToggle={() => toggleSection('supplyChain')}
                  />
                ) : errors.supplyChain ? (
                  <CardErrorFallback title="Supply Chain" onRetry={() => refreshSection('supplyChain')} />
                ) : null}
              </ErrorBoundary>

              {/* Agent Memory Card */}
              <ErrorBoundary fallback={<CardErrorFallback title="Agent Memory" onRetry={() => refreshSection('agentMemory')} />}>
                {isLoading ? (
                  <AgentMemorySkeleton />
                ) : agentMemory ? (
                  <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div
                      onClick={() => toggleSection('memory')}
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer ${expandedSections.memory ? 'bg-slate-50 border-b border-gray-200' : ''}`}
                    >
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className={`text-teal-600 transition-transform ${expandedSections.memory ? 'rotate-90' : ''}`}><Icons.chevronRight /></span>
                        <span className="text-teal-600"><Icons.cpu /></span>
                        Agent Memory
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${agentMemory.session.current <= agentMemory.session.optimal ? 'text-green-500 bg-green-50' : 'text-amber-500 bg-amber-50'}`}>
                        {(agentMemory.session.current / 1000).toFixed(1)}K tokens
                      </span>
                    </div>
                    {expandedSections.memory && (
                      <div className="p-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4 border border-dashed border-slate-300">
                          <span className="text-[10px] text-slate-500 font-medium">Demo Mode:</span>
                          <div className="flex gap-1">
                            {(['normal', 'warning', 'critical'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setDemoMode(mode)}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded capitalize transition-colors ${
                                  demoMode === mode
                                    ? mode === 'normal' ? 'bg-green-500 text-white' : mode === 'warning' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-slate-500 hover:bg-gray-300'
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                        <TokenGauge current={agentMemory.session.current} optimal={agentMemory.session.optimal} warning={agentMemory.session.warning} danger={agentMemory.session.danger} />
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-teal-600"><Icons.shieldCheck /></span>
                            <span className="text-xs font-semibold text-slate-700">Guardrails</span>
                          </div>
                          <GuardrailBadge id="dp09" name={agentMemory.guardrails.dp09.name} status={agentMemory.guardrails.dp09.status} target={agentMemory.guardrails.dp09.target} current={agentMemory.guardrails.dp09.current} critical={agentMemory.guardrails.dp09.critical} onAction={handleAcknowledge} acknowledged={guardrailActions.acknowledged['dp09']} />
                          <GuardrailBadge id="dp10" name={agentMemory.guardrails.dp10.name} status={agentMemory.guardrails.dp10.status} target={agentMemory.guardrails.dp10.target} current={agentMemory.guardrails.dp10.current} critical={agentMemory.guardrails.dp10.critical} onAction={handleAcknowledge} acknowledged={guardrailActions.acknowledged['dp10']} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : errors.agentMemory ? (
                  <CardErrorFallback title="Agent Memory" onRetry={() => refreshSection('agentMemory')} />
                ) : null}
              </ErrorBoundary>

              {/* Verification Card */}
              <ErrorBoundary fallback={<CardErrorFallback title="Verification" onRetry={() => refreshSection('verification')} />}>
                {isLoading ? (
                  <VerificationSkeleton />
                ) : verification ? (
                  <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
                    <div onClick={() => toggleSection('verification')} className="flex items-center justify-between mb-3.5 cursor-pointer">
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className={`text-teal-600 transition-transform ${expandedSections.verification ? 'rotate-90' : ''}`}><Icons.chevronRight /></span>
                        <span className="text-teal-600"><Icons.checkSquare /></span>
                        Verification
                      </h3>
                      <button onClick={(e) => e.stopPropagation()} className="bg-teal-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 hover:bg-teal-700 transition-colors">
                        <Icons.play /> Run All
                      </button>
                    </div>
                    {expandedSections.verification && (
                      <div className="grid grid-cols-2 gap-2.5">
                        {verification.map((item) => (
                          <div
                            key={item.name}
                            className={`rounded-xl p-3.5 flex flex-col gap-2 border ${
                              item.status === 'pass' ? 'bg-green-50 border-green-200' :
                              item.status === 'fail' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <span className="text-xs text-slate-700 font-medium">{item.name}</span>
                            <StatusBadge status={item.status} count={item.count} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : errors.verification ? (
                  <CardErrorFallback title="Verification" onRetry={() => refreshSection('verification')} />
                ) : null}
              </ErrorBoundary>

            </div>
          </aside>

          {/* Mobile overlay when right panel is open */}
          {rightPanelOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => setRightPanelOpen(false)}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
