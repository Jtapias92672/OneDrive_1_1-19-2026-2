'use client';

/**
 * FORGE-Cowork Left Sidebar
 * Navigation with epic progress ring
 */

import {
  MessageSquare,
  Folder,
  Layers,
  Target,
  Zap,
  Database,
  CheckSquare,
  Settings,
} from 'lucide-react';

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { name: 'Projects', icon: Layers, badge: 5 },
  { name: 'Chat', icon: MessageSquare, badge: 3 },
  { name: 'Files', icon: Folder, badge: 3 },
  { name: 'Objectives', icon: Target },
  { name: 'Skills', icon: Zap },
  { name: 'Memory', icon: Database },
  { name: 'Tasks', icon: CheckSquare, badge: 2 },
  { name: 'Settings', icon: Settings },
];

function ProgressRing({ progress, size = 56 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#0d9488"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

interface LeftSidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
}

export function LeftSidebar({ activeNav, onNavChange }: LeftSidebarProps) {
  return (
    <aside className="w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-5 flex-shrink-0">
      {/* Epic Progress Ring */}
      <div className="relative mb-1">
        <ProgressRing progress={62} />
        <div className="absolute inset-0 flex items-center justify-center text-teal-600">
          <Layers className="w-6 h-6" />
        </div>
      </div>
      <span className="text-[11px] font-bold text-teal-600">62%</span>
      <span className="text-[10px] text-slate-400 mb-5">Epic 10b</span>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onNavChange(item.name)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-[10px] relative transition-all ${
                isActive
                  ? 'bg-teal-50 text-teal-600'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span
                className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : ''}`}
              >
                {item.name}
              </span>
              {item.badge && (
                <span className="absolute top-1.5 right-1.5 bg-teal-600 text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div className="flex flex-col items-center mt-auto">
        <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-[10px] flex items-center justify-center text-white text-[13px] font-semibold relative">
          JT
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <span className="text-[9px] text-slate-400 mt-1.5 text-center leading-tight">
          forge-
          <br />
          platform-ui
        </span>
      </div>
    </aside>
  );
}
