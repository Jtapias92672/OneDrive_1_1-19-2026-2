/**
 * FORGE Platform UI - App Shell
 * @epic 10a - Platform UI Core
 * @task 10a.2.1 - Create app shell
 */

'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} 
        sidebarCollapsed={sidebarCollapsed}
      />
      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} />
        <main 
          className={`flex-1 p-6 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
