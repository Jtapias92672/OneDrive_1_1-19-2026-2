/**
 * FORGE Platform UI - Role Card
 * @epic 10e - Auth + Admin
 */

'use client';

import { Shield, Users, Lock, Edit, ChevronRight } from 'lucide-react';
import type { Role } from '@/lib/types/auth';

interface RoleCardProps {
  role: Role;
  onEdit?: () => void;
}

export function RoleCard({ role, onEdit }: RoleCardProps) {
  const scopeBadge = (scope: Role['scope']) => {
    const config = {
      global: { class: 'bg-purple-100 text-purple-700', label: 'Global' },
      team: { class: 'bg-blue-100 text-blue-700', label: 'Team' },
      repo: { class: 'bg-green-100 text-green-700', label: 'Repository' },
    };
    const c = config[scope];
    return <span className={`forge-badge ${c.class}`}>{c.label}</span>;
  };

  // Group permissions by resource
  const permissionsByResource = role.permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm.action);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="forge-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-muted' : 'bg-primary/10'}`}>
            {role.isSystem ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{role.name}</h3>
              {scopeBadge(role.scope)}
              {role.isSystem && (
                <span className="forge-badge bg-muted text-xs">System</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="forge-button h-8 w-8 hover:bg-muted"
            title="Edit role"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Permissions Summary */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Permissions</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(permissionsByResource).slice(0, 4).map(([resource, actions]) => (
            <div 
              key={resource}
              className="px-2 py-1 bg-muted rounded text-xs"
              title={actions.join(', ')}
            >
              <span className="capitalize">{resource}</span>
              <span className="text-muted-foreground ml-1">({actions.length})</span>
            </div>
          ))}
          {Object.keys(permissionsByResource).length > 4 && (
            <div className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
              +{Object.keys(permissionsByResource).length - 4} more
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{role.userCount} users</span>
        </div>
        <button
          onClick={onEdit}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default RoleCard;
