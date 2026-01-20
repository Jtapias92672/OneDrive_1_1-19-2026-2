/**
 * FORGE Platform UI - Recent Activity
 * @epic 10a - Platform UI Core
 * @task 10a.2.3 - Create dashboard page
 */

'use client';

import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Play,
  Settings
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'execution_complete' | 'execution_failed' | 'contract_created' | 'contract_updated' | 'settings_changed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'execution_complete',
    title: 'Execution completed',
    description: 'API Response Validator reached 98.5% score in 2 iterations',
    timestamp: '2 minutes ago',
    metadata: { score: 0.985, iterations: 2 },
  },
  {
    id: '2',
    type: 'execution_failed',
    title: 'Execution failed',
    description: 'Code Review Contract failed to reach target after 5 iterations',
    timestamp: '15 minutes ago',
    metadata: { score: 0.72, iterations: 5 },
  },
  {
    id: '3',
    type: 'contract_created',
    title: 'Contract created',
    description: 'New contract "Email Template Generator" added to library',
    timestamp: '1 hour ago',
  },
  {
    id: '4',
    type: 'execution_complete',
    title: 'Execution completed',
    description: 'Document Summarizer achieved 96.2% score in 3 iterations',
    timestamp: '2 hours ago',
    metadata: { score: 0.962, iterations: 3 },
  },
  {
    id: '5',
    type: 'settings_changed',
    title: 'Settings updated',
    description: 'Default provider changed to Claude 3.5 Sonnet',
    timestamp: '3 hours ago',
  },
  {
    id: '6',
    type: 'contract_updated',
    title: 'Contract updated',
    description: 'Updated validators for "API Response Validator"',
    timestamp: '4 hours ago',
  },
];

const iconMap = {
  execution_complete: { icon: CheckCircle, color: 'text-green-500' },
  execution_failed: { icon: XCircle, color: 'text-red-500' },
  contract_created: { icon: FileText, color: 'text-blue-500' },
  contract_updated: { icon: FileText, color: 'text-yellow-500' },
  settings_changed: { icon: Settings, color: 'text-gray-500' },
};

export function RecentActivity() {
  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">
          View all
        </button>
      </div>
      
      <div className="space-y-4">
        {recentActivity.map((item) => {
          const { icon: Icon, color } = iconMap[item.type];
          
          return (
            <div key={item.id} className="flex gap-3">
              <div className={`mt-0.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {item.description}
                </p>
                
                {item.metadata && (
                  <div className="flex gap-3 mt-1">
                    {item.metadata.score && (
                      <span className="text-xs text-muted-foreground">
                        Score: {(item.metadata.score * 100).toFixed(1)}%
                      </span>
                    )}
                    {item.metadata.iterations && (
                      <span className="text-xs text-muted-foreground">
                        Iterations: {item.metadata.iterations}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {item.timestamp}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentActivity;
