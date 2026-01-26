/**
 * FORGE Platform UI - Sidebar
 * @epic 10a - Platform UI Core
 * @task 10a.2.1 - Create app shell
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Play, 
  Settings,
  Users,
  BarChart3,
  Plug
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText },
  { href: '/executions', label: 'Executions', icon: Play },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/integrations', label: 'Integrations', icon: Plug },
];

const adminItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/users', label: 'Users', icon: Users },
];

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  const NavLink = ({ href, label, icon: Icon }: typeof navItems[0]) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive 
            ? 'bg-primary text-primary-foreground' 
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <aside 
      className={`fixed left-0 top-14 bottom-0 z-40 border-r bg-background transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <nav className="flex flex-col h-full p-3">
        {/* Main navigation */}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin section */}
        <div className="border-t pt-3 space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </span>
          )}
          {adminItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
