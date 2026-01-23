/**
 * FORGE Platform UI - Invite User Modal
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState } from 'react';
import { X, UserPlus, Mail, Loader2 } from 'lucide-react';

interface InviteUserModalProps {
  onClose: () => void;
}

const availableRoles = [
  { id: 'admin', name: 'Admin', description: 'Full system access' },
  { id: 'operator', name: 'Operator', description: 'Manage runs and approvals' },
  { id: 'developer', name: 'Developer', description: 'Create and execute contracts' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access' },
];

const availableTeams = [
  { id: 'platform', name: 'Platform' },
  { id: 'security', name: 'Security' },
  { id: 'frontend', name: 'Frontend' },
  { id: 'backend', name: 'Backend' },
  { id: 'devops', name: 'DevOps' },
];

export function InviteUserModal({ onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['viewer']);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(t => t !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('At least one role is required');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    console.log('Inviting user:', { email, roles: selectedRoles, teams: selectedTeams, customMessage });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Invite User</h2>
              <p className="text-sm text-muted-foreground">Send an invitation to join FORGE</p>
            </div>
          </div>
          <button onClick={onClose} className="forge-button h-9 w-9 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="forge-input pl-10"
                required
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Roles <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRoles.includes(role.id)
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Teams */}
          <div>
            <label className="block text-sm font-medium mb-2">Teams (optional)</label>
            <div className="flex flex-wrap gap-2">
              {availableTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    selectedTeams.includes(team.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium mb-2">Personal Message (optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to the invitation..."
              rows={3}
              className="forge-input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="forge-button px-4 py-2 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="forge-button px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteUserModal;
