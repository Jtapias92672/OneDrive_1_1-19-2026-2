/**
 * FORGE Platform UI - User Table
 * @epic 10e - Auth + Admin
 */

'use client';

import Link from 'next/link';
import { 
  Eye, 
  Edit, 
  MoreVertical, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Mail,
  UserX,
  KeyRound
} from 'lucide-react';
import type { User, UserStatus, AuthProvider } from '@/lib/types/auth';

interface UserTableProps {
  users: User[];
}

export function UserTable({ users }: UserTableProps) {
  const statusBadge = (status: UserStatus) => {
    const config: Record<UserStatus, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`forge-badge ${config[status]}`}>
        {status}
      </span>
    );
  };

  const authBadge = (provider: AuthProvider) => {
    const labels: Record<AuthProvider, string> = {
      email: 'Email',
      google: 'Google',
      github: 'GitHub',
      saml: 'SAML',
      oidc: 'OIDC',
    };
    return (
      <span className="forge-badge bg-muted text-xs">
        {labels[provider]}
      </span>
    );
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (users.length === 0) {
    return (
      <div className="forge-card text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left p-4 font-medium">User</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Roles</th>
            <th className="text-left p-4 font-medium">Teams</th>
            <th className="text-left p-4 font-medium">Auth</th>
            <th className="text-left p-4 font-medium">Last Active</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-muted/30 transition-colors">
              {/* User Info */}
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.mfaEnabled && (
                        <ShieldCheck className="h-4 w-4 text-green-500" title="MFA Enabled" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </td>

              {/* Status */}
              <td className="p-4">{statusBadge(user.status)}</td>

              {/* Roles */}
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span key={role} className="forge-badge bg-primary/10 text-primary text-xs capitalize">
                      {role}
                    </span>
                  ))}
                </div>
              </td>

              {/* Teams */}
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {user.teams.length > 0 ? (
                    user.teams.slice(0, 2).map((team) => (
                      <span key={team} className="forge-badge bg-muted text-xs capitalize">
                        {team}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {user.teams.length > 2 && (
                    <span className="forge-badge bg-muted text-xs">
                      +{user.teams.length - 2}
                    </span>
                  )}
                </div>
              </td>

              {/* Auth Provider */}
              <td className="p-4">
                <div className="flex items-center gap-2">
                  {authBadge(user.authProvider)}
                  {!user.emailVerified && (
                    <span className="text-xs text-yellow-600">(unverified)</span>
                  )}
                </div>
              </td>

              {/* Last Active */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatDate(user.lastActivity)}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button className="forge-button h-8 w-8 hover:bg-muted" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <div className="relative group">
                    <button className="forge-button h-8 w-8 hover:bg-muted" title="More">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {/* Dropdown would go here */}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
