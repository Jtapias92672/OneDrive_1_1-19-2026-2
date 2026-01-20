/**
 * FORGE Platform UI - Kill Switch Panel
 * @epic 10d - Governance Console
 */

'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  Power, 
  PowerOff, 
  Globe, 
  Server, 
  GitBranch, 
  FileText,
  Play,
  Clock
} from 'lucide-react';
import type { KillSwitch } from '@/lib/types/governance';

interface KillSwitchPanelProps {
  killSwitches: KillSwitch[];
  onClose: () => void;
}

type KillScope = 'global' | 'environment' | 'repo' | 'contract' | 'run';

export function KillSwitchPanel({ killSwitches, onClose }: KillSwitchPanelProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [selectedScope, setSelectedScope] = useState<KillScope>('global');
  const [scopeValue, setScopeValue] = useState('');
  const [reason, setReason] = useState('');
  const [autoDeactivate, setAutoDeactivate] = useState(false);
  const [autoDeactivateHours, setAutoDeactivateHours] = useState(1);

  const globalSwitch = killSwitches.find(ks => ks.scope === 'global');
  const isGlobalActive = globalSwitch?.active || false;

  const handleActivate = async () => {
    if (!reason.trim()) return;
    setIsActivating(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setIsActivating(false);
    // In production, this would activate the kill switch
    console.log('Kill switch activated:', { scope: selectedScope, scopeValue, reason, autoDeactivate, autoDeactivateHours });
  };

  const handleDeactivate = async () => {
    setIsActivating(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsActivating(false);
    console.log('Kill switch deactivated');
  };

  const scopeIcons: Record<KillScope, React.ReactNode> = {
    global: <Globe className="h-5 w-5" />,
    environment: <Server className="h-5 w-5" />,
    repo: <GitBranch className="h-5 w-5" />,
    contract: <FileText className="h-5 w-5" />,
    run: <Play className="h-5 w-5" />,
  };

  const scopeDescriptions: Record<KillScope, string> = {
    global: 'Stop ALL executions across the entire platform',
    environment: 'Stop executions in a specific environment (dev/staging/prod)',
    repo: 'Stop executions for a specific repository',
    contract: 'Stop executions of a specific contract',
    run: 'Kill a specific running execution',
  };

  return (
    <div className="forge-card border-red-200 bg-red-50/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">Kill Switch Control</h3>
            <p className="text-sm text-red-700">
              Emergency stop for AI agent executions
            </p>
          </div>
        </div>
        <button onClick={onClose} className="forge-button h-8 w-8 hover:bg-red-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current Status */}
      {isGlobalActive && (
        <div className="mb-4 p-4 bg-red-100 rounded-lg border border-red-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PowerOff className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">GLOBAL KILL SWITCH ACTIVE</p>
                <p className="text-sm text-red-700">
                  Activated by {globalSwitch?.activatedBy} at{' '}
                  {globalSwitch?.activatedAt ? new Date(globalSwitch.activatedAt).toLocaleString() : 'unknown'}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Reason: {globalSwitch?.reason}
                </p>
              </div>
            </div>
            <button
              onClick={handleDeactivate}
              disabled={isActivating}
              className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 font-medium"
            >
              {isActivating ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        </div>
      )}

      {/* Activation Form */}
      {!isGlobalActive && (
        <div className="space-y-4">
          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-red-900">
              Kill Switch Scope
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['global', 'environment', 'repo', 'contract', 'run'] as KillScope[]).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    selectedScope === scope
                      ? 'bg-red-100 border-red-300 text-red-900'
                      : 'bg-white border-gray-200 hover:border-red-200'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {scopeIcons[scope]}
                    <span className="text-xs font-medium capitalize">{scope}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-sm text-red-700 mt-2">
              {scopeDescriptions[selectedScope]}
            </p>
          </div>

          {/* Scope Value (if not global) */}
          {selectedScope !== 'global' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-red-900">
                {selectedScope === 'environment' && 'Environment'}
                {selectedScope === 'repo' && 'Repository'}
                {selectedScope === 'contract' && 'Contract ID'}
                {selectedScope === 'run' && 'Run ID'}
              </label>
              {selectedScope === 'environment' ? (
                <select
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  className="forge-input"
                >
                  <option value="">Select environment...</option>
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="prod">Production</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  placeholder={
                    selectedScope === 'repo' ? 'org/repo-name' :
                    selectedScope === 'contract' ? 'contract-id' :
                    'run_abc123'
                  }
                  className="forge-input"
                />
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2 text-red-900">
              Reason (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you're activating the kill switch..."
              rows={2}
              className="forge-input resize-none"
            />
          </div>

          {/* Auto-deactivate */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoDeactivate}
                onChange={(e) => setAutoDeactivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-red-900">Auto-deactivate after</span>
            </label>
            {autoDeactivate && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={autoDeactivateHours}
                  onChange={(e) => setAutoDeactivateHours(parseInt(e.target.value))}
                  className="forge-input w-20"
                />
                <span className="text-sm text-red-700">hours</span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Caution</p>
                <p>
                  {selectedScope === 'global' 
                    ? 'This will immediately terminate ALL running executions and prevent new ones from starting.'
                    : `This will terminate affected executions and prevent new ones in the selected ${selectedScope}.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Activate Button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-red-600">
              This action will be logged and requires re-authentication
            </p>
            <button
              onClick={handleActivate}
              disabled={isActivating || !reason.trim() || (selectedScope !== 'global' && !scopeValue)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              {isActivating ? 'Activating...' : 'Activate Kill Switch'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default KillSwitchPanel;
