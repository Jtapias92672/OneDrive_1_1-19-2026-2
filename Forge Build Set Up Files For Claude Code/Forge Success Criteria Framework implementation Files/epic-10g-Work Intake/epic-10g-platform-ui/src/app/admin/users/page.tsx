/**
 * FORGE Platform UI - Admin Users Page
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Plus, UserPlus, Upload, Download } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { UserTable } from '@/components/admin/user-table';
import { InviteUserModal } from '@/components/admin/invite-user-modal';
import type { User, UserFilters } from '@/lib/types/auth';

// Sample data
const sampleUsers: User[] = [
  {
    id: 'usr_001',
    email: 'alice@forge.dev',
    name: 'Alice Chen',
    status: 'active',
    emailVerified: true,
    mfaEnabled: true,
    authProvider: 'google',
    lastLogin: '2025-01-19T14:00:00Z',
    lastActivity: '2025-01-19T15:30:00Z',
    roles: ['admin'],
    teams: ['platform', 'security'],
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-19T14:00:00Z',
  },
  {
    id: 'usr_002',
    email: 'bob@forge.dev',
    name: 'Bob Martinez',
    status: 'active',
    emailVerified: true,
    mfaEnabled: false,
    authProvider: 'github',
    lastLogin: '2025-01-19T10:00:00Z',
    lastActivity: '2025-01-19T12:45:00Z',
    roles: ['developer'],
    teams: ['frontend'],
    limits: { maxConcurrentRuns: 5, maxDailyCost: 50 },
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'usr_003',
    email: 'charlie@forge.dev',
    name: 'Charlie Kim',
    status: 'active',
    emailVerified: true,
    mfaEnabled: true,
    authProvider: 'saml',
    lastLogin: '2025-01-18T16:00:00Z',
    lastActivity: '2025-01-18T18:00:00Z',
    roles: ['operator'],
    teams: ['devops'],
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
  },
  {
    id: 'usr_004',
    email: 'dana@forge.dev',
    name: 'Dana Williams',
    status: 'pending',
    emailVerified: false,
    mfaEnabled: false,
    authProvider: 'email',
    roles: ['viewer'],
    teams: [],
    createdAt: '2025-01-18T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z',
  },
  {
    id: 'usr_005',
    email: 'eve@forge.dev',
    name: 'Eve Johnson',
    status: 'suspended',
    emailVerified: true,
    mfaEnabled: false,
    authProvider: 'google',
    lastLogin: '2025-01-10T00:00:00Z',
    roles: ['developer'],
    teams: ['backend'],
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

export default function AdminUsersPage() {
  const [users] = useState<User[]>(sampleUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({});
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (filters.status?.length && !filters.status.includes(user.status)) {
        return false;
      }
      if (filters.role?.length && !user.roles.some(r => filters.role!.includes(r))) {
        return false;
      }
      return true;
    });
  }, [users, searchQuery, filters]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    mfaEnabled: users.filter(u => u.mfaEnabled).length,
  }), [users]);

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Admin' }, { label: 'Users' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="forge-button h-9 px-3 hover:bg-muted">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button className="forge-button h-9 px-3 hover:bg-muted">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Pending Invites</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">MFA Enabled</p>
          <p className="text-2xl font-bold">{stats.mfaEnabled}/{stats.total}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="forge-input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`forge-button h-10 px-3 ${showFilters ? 'bg-muted' : 'hover:bg-muted'}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="forge-card">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['active', 'inactive', 'pending', 'suspended'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      const current = filters.status || [];
                      const updated = current.includes(status as any)
                        ? current.filter(s => s !== status)
                        : [...current, status as any];
                      setFilters({ ...filters, status: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                      filters.status?.includes(status as any)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                {['admin', 'operator', 'developer', 'viewer'].map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      const current = filters.role || [];
                      const updated = current.includes(role)
                        ? current.filter(r => r !== role)
                        : [...current, role];
                      setFilters({ ...filters, role: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                      filters.role?.includes(role)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Table */}
      <UserTable users={filteredUsers} />

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}
