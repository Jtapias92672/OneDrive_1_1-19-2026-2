/**
 * FORGE Platform UI - Contract List
 * @epic 10a - Platform UI Core
 * @task 10a.3.2 - Create contract library
 */

'use client';

import Link from 'next/link';
import { Play, MoreVertical, Edit, Copy, Trash2 } from 'lucide-react';

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

interface ContractListProps {
  contracts: Contract[];
}

export function ContractList({ contracts }: ContractListProps) {
  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Contract</th>
            <th className="text-left p-4 font-medium">Validators</th>
            <th className="text-left p-4 font-medium">Target</th>
            <th className="text-left p-4 font-medium">Success Rate</th>
            <th className="text-left p-4 font-medium">Last Run</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {contracts.map((contract) => (
            <tr key={contract.id} className="hover:bg-muted/30 transition-colors">
              <td className="p-4">
                <Link href={`/contracts/${contract.id}`} className="block">
                  <p className="font-medium hover:underline">{contract.name}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-xs">
                    {contract.description}
                  </p>
                </Link>
              </td>
              <td className="p-4">
                <div className="flex gap-1 flex-wrap">
                  {contract.validators.map(v => (
                    <span key={v} className="forge-badge bg-muted text-muted-foreground">
                      {v}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-4">
                <span className="font-medium">
                  {(contract.targetScore * 100).toFixed(0)}%
                </span>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${contract.successRate}%` }}
                    />
                  </div>
                  <span className="text-sm">{contract.successRate.toFixed(1)}%</span>
                </div>
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {contract.lastRun}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  <button 
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="Run"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button 
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContractList;
