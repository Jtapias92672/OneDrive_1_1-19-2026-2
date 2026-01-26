/**
 * FORGE Platform UI - Breadcrumbs
 * @epic 10a - Platform UI Core
 * @task 10a.2.2 - Create navigation
 */

'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link 
            href="/dashboard" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link 
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
