/**
 * FORGE Platform UI - Navigation Menu
 * @epic 10a - Platform UI Core
 * @task 10a.2.2 - Create navigation
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  children?: NavItem[];
}

interface NavMenuProps {
  items: NavItem[];
  collapsed?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export function NavMenu({ items, collapsed = false, orientation = 'vertical' }: NavMenuProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (orientation === 'horizontal') {
    return (
      <nav className="flex items-center gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
              {item.badge && (
                <span className="forge-badge forge-badge-success ml-1">
                  {item.badge}
                </span>
              )}
            </span>
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <div key={item.href}>
          <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${isActive(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? item.label : undefined}
          >
            {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="forge-badge forge-badge-success">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
          
          {/* Nested items */}
          {!collapsed && item.children && isActive(item.href) && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`block px-3 py-1.5 rounded-md text-sm transition-colors
                    ${isActive(child.href)
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export default NavMenu;
