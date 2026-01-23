/**
 * FORGE Platform UI - Admin Roles Page
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState } from 'react';
import { Plus, Shield, Users, Lock } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { RoleCard } from '@/components/admin/role-card';
import type { Role } from '@/lib/types/auth';

// Sample data
const sampleRoles: Role[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full system access with all permissions',
    permissions: [
      { id: 'p1', resource: 'admin', action: 'admin' },
      { id: 'p2', resource: 'users', action: 'admin' },
      { id: 'p3', resource: 'policies', action: 'admin' },
    ],
    scope: 'global',
    isSystem: true,
    userCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_operator',
    name: 'Operator',
    description: 'Manage runs, approvals, and monitoring',
    permissions: [
      { id: 'p4', resource: 'runs', action: 'admin' },
      { id: 'p5', resource: 'approvals', action: 'approve' },
      { id: 'p6', resource: 'evidence', action: 'read' },
      { id: 'p7', resource: 'policies', action: 'read' },
    ],
    scope: 'global',
    isSystem: true,
    userCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_developer',
    name: 'Developer',
    description: 'Create and execute contracts, view evidence',
    permissions: [
      { id: 'p8', resource: 'contracts', action: 'create' },
      { id: 'p9', resource: 'contracts', action: 'update' },
      { id: 'p10', resource: 'runs', action: 'execute' },
      { id: 'p11', resource: 'runs', action: 'read' },
      { id: 'p12', resource: 'evidence', action: 'read' },
    ],
    scope: 'team',
    isSystem: true,
    userCount: 25,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access to contracts, runs, and evidence',
    permissions: [
      { id: 'p13', resource: 'contracts', action: 'read' },
      { id: 'p14', resource: 'runs', action: 'read' },
      { id: 'p15', resource: 'evidence', action: 'read' },
    ],
    scope: 'team',
    isSystem: true,
    userCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_security',
    name: 'Security Reviewer',
    description: 'Review and approve high-risk operations',
    permissions: [
      { id: 'p16', resource: 'approvals', action: 'approve' },
      { id: 'p17', resource: 'policies', action: 'read' },
      { id: 'p18', resource: 'policies', action: 'update' },
      { id: 'p19', resource: 'evidence', action: 'read' },
    ],
    scope: 'global',
    isSystem: false,
    userCount: 3,
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
];

const resources = ['contracts', 'runs', 'evidence', 'policies', 'approvals', 'users', 'roles', 'settings', 'admin'];
const actions = ['create', 'read', 'update', 'delete', 'execute', 'approve', 'admin'];

export default function AdminRolesPage() {
  const [roles] = useState<Role[]>(sampleRoles);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Admin' }, { label: 'Roles' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Configure roles and permissions for access control
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Roles</p>
              <p className="text-2xl font-bold">{roles.length}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">System Roles</p>
              <p className="text-2xl font-bold">{systemRoles.length}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Custom Roles</p>
          <p className="text-2xl font-bold">{customRoles.length}</p>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Users Assigned</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Roles */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          System Roles
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Built-in roles that cannot be deleted. Permissions can be customized.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {systemRoles.map((role) => (
            <RoleCard 
              key={role.id} 
              role={role} 
              onEdit={() => setSelectedRole(role)}
            />
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Custom Roles</h2>
        {customRoles.length === 0 ? (
          <div className="forge-card text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No custom roles created</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary hover:underline"
            >
              Create your first custom role
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {customRoles.map((role) => (
              <RoleCard 
                key={role.id} 
                role={role}
                onEdit={() => setSelectedRole(role)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Permission Matrix Reference */}
      <div className="forge-card">
        <h3 className="font-semibold mb-4">Permission Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Resource</th>
                {actions.map((action) => (
                  <th key={action} className="text-center p-2 font-medium capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource} className="border-b">
                  <td className="p-2 capitalize">{resource}</td>
                  {actions.map((action) => (
                    <td key={action} className="text-center p-2">
                      {(['create', 'read', 'update', 'delete'].includes(action) && !['admin', 'settings'].includes(resource)) ||
                       (action === 'execute' && resource === 'runs') ||
                       (action === 'approve' && resource === 'approvals') ||
                       (action === 'admin' && ['admin', 'users', 'roles', 'policies', 'runs'].includes(resource))
                        ? '●' : '○'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ● = Available permission • ○ = Not applicable
        </p>
      </div>
    </div>
  );
}
