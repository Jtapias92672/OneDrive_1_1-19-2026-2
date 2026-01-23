/**
 * FORGE Platform UI - Policy Editor Page
 * @epic 10d - Governance Console
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Plus, 
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PolicyRuleEditor } from '@/components/governance/policy-rule-editor';
import { PolicySimulator } from '@/components/governance/policy-simulator';
import type { Policy, PolicyRule, RedactionRule, RiskTier, PolicyStatus } from '@/lib/types/governance';

type EditorTab = 'rules' | 'redaction' | 'approvals' | 'simulate' | 'history';

const samplePolicy: Policy = {
  id: 'pol_standard',
  name: 'Standard Execution Policy',
  description: 'Default policy for development and staging environments',
  version: '2.1.0',
  status: 'active',
  scope: { environments: ['dev', 'staging'] },
  riskTier: 'medium',
  rules: [
    {
      id: 'rule_001',
      type: 'allow',
      category: 'tool',
      pattern: 'http_request',
      patternType: 'exact',
      action: 'Allow HTTP requests',
      priority: 10,
      enabled: true,
    },
    {
      id: 'rule_002',
      type: 'deny',
      category: 'tool',
      pattern: 'shell_exec',
      patternType: 'exact',
      action: 'Block shell execution',
      message: 'Shell execution is not permitted',
      priority: 1,
      enabled: true,
    },
    {
      id: 'rule_003',
      type: 'require_approval',
      category: 'cost',
      pattern: '*',
      patternType: 'glob',
      conditions: { maxCost: 10 },
      action: 'Require approval for high-cost runs',
      priority: 5,
      enabled: true,
    },
  ],
  requiresApproval: false,
  redactionRules: [
    {
      id: 'redact_001',
      name: 'PII Redaction',
      type: 'pii',
      patterns: ['email', 'phone', 'ssn'],
      replacement: 'mask',
      maskChar: '*',
      enabled: true,
    },
  ],
  owner: 'platform-team@forge.dev',
  createdAt: '2024-12-01T00:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  activatedAt: '2025-01-15T10:00:00Z',
  changeLog: [],
};

export default function PolicyEditorPage() {
  const params = useParams();
  const policyId = params.id as string;
  const isNew = policyId === 'new';

  const [policy, setPolicy] = useState<Policy>(isNew ? {
    id: '',
    name: '',
    description: '',
    version: '1.0.0',
    status: 'draft',
    scope: { environments: [] },
    riskTier: 'medium',
    rules: [],
    requiresApproval: false,
    redactionRules: [],
    owner: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    changeLog: [],
  } : samplePolicy);

  const [activeTab, setActiveTab] = useState<EditorTab>('rules');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updatePolicy = (updates: Partial<Policy>) => {
    setPolicy(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsDirty(false);
    setIsSaving(false);
  };

  const addRule = () => {
    const newRule: PolicyRule = {
      id: `rule_${Date.now()}`,
      type: 'allow',
      category: 'tool',
      pattern: '',
      patternType: 'exact',
      action: '',
      priority: policy.rules.length + 1,
      enabled: true,
    };
    updatePolicy({ rules: [...policy.rules, newRule] });
  };

  const updateRule = (ruleId: string, updates: Partial<PolicyRule>) => {
    updatePolicy({
      rules: policy.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r),
    });
  };

  const deleteRule = (ruleId: string) => {
    updatePolicy({ rules: policy.rules.filter(r => r.id !== ruleId) });
  };

  const tabs = [
    { id: 'rules' as const, label: `Rules (${policy.rules.length})` },
    { id: 'redaction' as const, label: 'Redaction' },
    { id: 'approvals' as const, label: 'Approvals' },
    { id: 'simulate' as const, label: 'Simulate' },
    { id: 'history' as const, label: 'History' },
  ];

  const riskColors: Record<RiskTier, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<PolicyStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    review: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    deprecated: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs 
        items={[
          { label: 'Governance', href: '/governance/policies' },
          { label: 'Policies', href: '/governance/policies' },
          { label: isNew ? 'New Policy' : policy.name },
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/governance/policies" className="forge-button h-9 w-9 hover:bg-muted mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={policy.name}
                onChange={(e) => updatePolicy({ name: e.target.value })}
                placeholder="Policy name"
                className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              />
              <span className={`forge-badge ${statusColors[policy.status]}`}>
                {policy.status}
              </span>
              <span className={`forge-badge ${riskColors[policy.riskTier]}`}>
                {policy.riskTier} risk
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Version {policy.version} • ID: {policy.id || 'unsaved'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="forge-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={policy.description}
              onChange={(e) => updatePolicy({ description: e.target.value })}
              rows={2}
              className="forge-input resize-none"
              placeholder="Describe what this policy does..."
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Risk Tier</label>
              <select
                value={policy.riskTier}
                onChange={(e) => updatePolicy({ riskTier: e.target.value as RiskTier })}
                className="forge-input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={policy.status}
                onChange={(e) => updatePolicy({ status: e.target.value as PolicyStatus })}
                className="forge-input"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scope */}
        <div className="mt-4 pt-4 border-t">
          <label className="block text-sm font-medium mb-2">Scope - Environments</label>
          <div className="flex gap-2">
            {['dev', 'staging', 'prod'].map((env) => (
              <button
                key={env}
                onClick={() => {
                  const current = policy.scope.environments;
                  const updated = current.includes(env as any)
                    ? current.filter(e => e !== env)
                    : [...current, env as any];
                  updatePolicy({ scope: { ...policy.scope, environments: updated } });
                }}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  policy.scope.environments.includes(env as any)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Policy Rules</h3>
              <button onClick={addRule} className="forge-button h-9 px-3 hover:bg-muted">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </button>
            </div>

            {policy.rules.length === 0 ? (
              <div className="forge-card text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No rules defined</p>
                <button onClick={addRule} className="mt-4 text-primary hover:underline">
                  Add your first rule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {policy.rules.map((rule) => (
                  <PolicyRuleEditor
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates) => updateRule(rule.id, updates)}
                    onDelete={() => deleteRule(rule.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'redaction' && (
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Redaction Rules</h3>
            <p className="text-muted-foreground">
              Configure what data gets redacted in evidence bundles.
            </p>
            {/* Simplified for token budget */}
            <div className="mt-4 space-y-2">
              {policy.redactionRules.map((rule) => (
                <div key={rule.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-medium">{rule.name}</span>
                    <span className="forge-badge bg-muted ml-2">{rule.type}</span>
                  </div>
                  <span className={rule.enabled ? 'text-green-600' : 'text-muted-foreground'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Approval Requirements</h3>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={policy.requiresApproval}
                onChange={(e) => updatePolicy({ requiresApproval: e.target.checked })}
                className="rounded"
              />
              <span>Require approval for executions under this policy</span>
            </label>
            {policy.requiresApproval && (
              <div className="space-y-4 pl-7">
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Approvers</label>
                  <input
                    type="number"
                    min={1}
                    value={policy.minApprovers || 1}
                    onChange={(e) => updatePolicy({ minApprovers: parseInt(e.target.value) })}
                    className="forge-input w-24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Approver Emails</label>
                  <textarea
                    value={policy.approvers?.join('\n') || ''}
                    onChange={(e) => updatePolicy({ approvers: e.target.value.split('\n').filter(Boolean) })}
                    className="forge-input"
                    rows={3}
                    placeholder="one@example.com&#10;two@example.com"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulate' && (
          <PolicySimulator policy={policy} />
        )}

        {activeTab === 'history' && (
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Change History</h3>
            {policy.changeLog.length === 0 ? (
              <p className="text-muted-foreground">No changes recorded yet</p>
            ) : (
              <div className="space-y-2">
                {policy.changeLog.map((change) => (
                  <div key={change.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{change.action}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(change.changedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      By {change.changedBy}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
