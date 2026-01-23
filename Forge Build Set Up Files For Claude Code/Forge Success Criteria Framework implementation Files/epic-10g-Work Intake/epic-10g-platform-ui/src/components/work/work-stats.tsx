/**
 * FORGE Platform UI - Work Stats
 * @epic 10g - Work Intake
 */

'use client';

import { 
  Inbox, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play,
  TrendingUp
} from 'lucide-react';
import type { WorkStats as WorkStatsType } from '@/lib/types/work';

interface WorkStatsProps {
  stats: WorkStatsType;
}

export function WorkStats({ stats }: WorkStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Total */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.byStatus.pending + stats.byStatus.draft}
            </p>
          </div>
        </div>
      </div>

      {/* Running */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm text-muted-foreground">Running</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus.running}</p>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus.completed}</p>
          </div>
        </div>
      </div>

      {/* Failed */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</p>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">
              <span className="text-green-600">+{stats.createdToday}</span>
              {' / '}
              <span className="text-purple-600">{stats.completedToday}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkStats;
