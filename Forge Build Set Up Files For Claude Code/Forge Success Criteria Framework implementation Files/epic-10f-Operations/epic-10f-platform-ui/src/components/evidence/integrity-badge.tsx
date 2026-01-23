/**
 * FORGE Platform UI - Integrity Badge
 * @epic 10c - Evidence Plane
 */

'use client';

import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { EvidenceStatus } from '@/lib/types/evidence';

interface IntegrityBadgeProps {
  status: EvidenceStatus;
  signed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IntegrityBadge({ status, signed = false, size = 'md' }: IntegrityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: ShieldCheck,
          label: 'Verified',
          className: 'bg-green-100 text-green-700 border-green-200',
        };
      case 'tampered':
        return {
          icon: ShieldAlert,
          label: 'Tampered',
          className: 'bg-red-100 text-red-700 border-red-200',
        };
      case 'exported':
        return {
          icon: Shield,
          label: 'Exported',
          className: 'bg-blue-100 text-blue-700 border-blue-200',
        };
      case 'complete':
        return {
          icon: signed ? ShieldCheck : Shield,
          label: signed ? 'Signed' : 'Complete',
          className: signed 
            ? 'bg-green-50 text-green-600 border-green-200' 
            : 'bg-gray-100 text-gray-700 border-gray-200',
        };
      default:
        return {
          icon: ShieldQuestion,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses[size]} ${config.className}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

export default IntegrityBadge;
