/**
 * FORGE Platform UI - Stats Cards
 * @epic 10a - Platform UI Core
 * @task 10a.2.3 - Create dashboard page
 */

'use client';

import { 
  FileText, 
  Play, 
  CheckCircle, 
  TrendingUp,
  Zap,
  DollarSign
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  description?: string;
}

const stats: StatCard[] = [
  {
    title: 'Total Contracts',
    value: 24,
    change: '+3 this week',
    changeType: 'positive',
    icon: FileText,
    description: 'Active contract definitions',
  },
  {
    title: 'Executions Today',
    value: 156,
    change: '+12% vs yesterday',
    changeType: 'positive',
    icon: Play,
    description: 'Convergence runs today',
  },
  {
    title: 'Success Rate',
    value: '94.2%',
    change: '+2.1% this week',
    changeType: 'positive',
    icon: CheckCircle,
    description: 'Target score achieved',
  },
  {
    title: 'Avg Iterations',
    value: 2.4,
    change: '-0.3 vs last week',
    changeType: 'positive',
    icon: TrendingUp,
    description: 'Iterations to convergence',
  },
  {
    title: 'Tokens Used',
    value: '1.2M',
    change: '+8% this week',
    changeType: 'neutral',
    icon: Zap,
    description: 'Total tokens consumed',
  },
  {
    title: 'Est. Cost',
    value: '$142.50',
    change: '+$12.30 today',
    changeType: 'neutral',
    icon: DollarSign,
    description: 'Estimated API costs',
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.title} className="forge-card">
          <div className="flex items-center justify-between">
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            {stat.change && (
              <span 
                className={`text-xs font-medium ${
                  stat.changeType === 'positive' 
                    ? 'text-green-600' 
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                }`}
              >
                {stat.change}
              </span>
            )}
          </div>
          
          <div className="mt-3">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </div>
          
          {stat.description && (
            <p className="mt-2 text-xs text-muted-foreground">
              {stat.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
