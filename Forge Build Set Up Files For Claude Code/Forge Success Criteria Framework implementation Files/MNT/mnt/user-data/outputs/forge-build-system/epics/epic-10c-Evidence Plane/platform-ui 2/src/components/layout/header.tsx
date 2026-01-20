/**
 * FORGE Platform UI - Header
 * @epic 10a - Platform UI Core
 * @task 10a.2.1 - Create app shell
 */

'use client';

import { Menu, Search, Bell, User, Settings } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="forge-button h-9 w-9 hover:bg-muted"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">FORGE</span>
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search contracts, executions..."
              className="forge-input pl-10 h-9"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button className="forge-button h-9 w-9 hover:bg-muted relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </button>
          
          <button className="forge-button h-9 w-9 hover:bg-muted">
            <Settings className="h-5 w-5" />
          </button>
          
          <button className="forge-button h-9 w-9 hover:bg-muted rounded-full bg-muted">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
