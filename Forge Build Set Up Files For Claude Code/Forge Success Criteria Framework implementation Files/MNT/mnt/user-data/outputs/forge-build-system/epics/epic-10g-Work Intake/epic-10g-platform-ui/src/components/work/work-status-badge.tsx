/**
 * FORGE Platform UI - Work Status Badge
 * @epic 10g - Work Intake
 */

'use client';

import { 
  FileEdit, 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  Ban 
} from 'lucide-react';
import type { WorkStatus } from '@/lib/types/work';

interface WorkStatusBadgeProps {
  status: WorkStatus;
  size?: 'sm' | 'md';
}

export function WorkStatusBadge({ status, size = 'md' }: WorkStatusBadgeProps) {
  const config: Record<WorkStatus, { 
    icon: typeof CheckCircle; 
    color: string; 
    label: string;
  }> = {
    draft: { 
      icon: FileEdit, 
      color: 'bg-gray-100 text-gray-700', 
      label: 'Draft' 
    },
    pending: { 
      icon: Clock, 
      color: 'bg-yellow-100 text-yellow-700', 
      label: 'Pending' 
    },
    running: { 
      icon: Play, 
      color: 'bg-blue-100 text-blue-700', 
      label: 'Running' 
    },
    completed: { 
      icon: CheckCircle, 
      color: 'bg-green-100 text-green-700', 
      label: 'Completed' 
    },
    failed: { 
      icon: XCircle, 
      color: 'bg-red-100 text-red-700', 
      label: 'Failed' 
    },
    cancelled: { 
      icon: Ban, 
      color: 'bg-gray-100 text-gray-500', 
      label: 'Cancelled' 
    },
  };

  const { icon: Icon, color, label } = config[status];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span className={`forge-badge ${color} ${sizeClasses} inline-flex items-center gap-1`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}

export default WorkStatusBadge;
