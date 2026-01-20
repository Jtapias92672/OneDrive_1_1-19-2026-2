/**
 * FORGE Platform UI - Dashboard Page
 * @epic 10a - Platform UI Core
 * @task 10a.2.3 - Create dashboard page
 */

import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentActivity } from '@/components/dashboard/recent-activity';

export default function DashboardPage() {
  return (
    <div className="space-y-6 mt-14">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your FORGE platform activity
        </p>
      </div>

      {/* Stats Grid */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
