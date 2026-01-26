/**
 * FORGE Platform UI - Contract Card
 * @epic 10a - Platform UI Core
 * @task 10a.3.2 - Create contract library
 */

'use client';

import Link from 'next/link';
import { Play, Edit, MoreVertical, Target, TrendingUp } from 'lucide-react';

interface Contract {
  id: string;
  name: string;
  description: string;
  version: string;
  validators: string[];
  targetScore: number;
  lastRun: string;
  successRate: number;
  runCount: number;
}

interface ContractCardProps {
  contract: Contract;
}

export function ContractCard({ contract }: ContractCardProps) {
  return (
    <div className="forge-card hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link href={`/contracts/${contract.id}`} className="flex-1">
          <h3 className="font-semibold hover:underline">{contract.name}</h3>
          <p className="text-sm text-muted-foreground">v{contract.version}</p>
        </Link>
        <button className="forge-button h-8 w-8 hover:bg-muted -mr-2 -mt-2">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {contract.description}
      </p>

      {/* Validators */}
      <div className="flex gap-1 flex-wrap mb-4">
        {contract.validators.map(v => (
          <span key={v} className="forge-badge bg-muted text-muted-foreground">
            {v}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {(contract.targetScore * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {contract.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Success</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-xs text-muted-foreground">
          Last run {contract.lastRun}
        </span>
        <div className="flex gap-1">
          <Link 
            href={`/contracts/${contract.id}`}
            className="forge-button h-8 w-8 hover:bg-muted"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button 
            className="forge-button h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            title="Run"
          >
            <Play className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractCard;
