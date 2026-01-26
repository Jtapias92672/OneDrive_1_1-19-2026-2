/**
 * FORGE Platform UI - Policy Simulator
 * @epic 10d - Governance Console
 */

'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { Policy, PolicySimulation } from '@/lib/types/governance';

interface PolicySimulatorProps {
  policy: Policy;
}

export function PolicySimulator({ policy }: PolicySimulatorProps) {
  const [input, setInput] = useState({
    tool: '',
    repo: '',
    path: '',
    environment: 'dev',
    cost: 0,
    user: '',
  });
  const [result, setResult] = useState<PolicySimulation['result'] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    
    // Simulate policy evaluation
    await new Promise(r => setTimeout(r, 500));
    
    const matchedRules: PolicySimulation['result']['matchedRules'] = [];
    let allowed = true;
    let requiresApproval = false;
    const redactedFields: string[] = [];

    // Evaluate rules (simplified)
    for (const rule of policy.rules.filter(r => r.enabled)) {
      let matches = false;
      
      if (rule.category === 'tool' && input.tool) {
        if (rule.patternType === 'exact') {
          matches = input.tool === rule.pattern;
        } else if (rule.patternType === 'glob') {
          matches = input.tool.includes(rule.pattern.replace('*', ''));
        }
      }
      
      if (rule.category === 'cost' && input.cost > 0) {
        if (rule.conditions?.maxCost && input.cost > rule.conditions.maxCost) {
          matches = true;
        }
      }

      if (rule.category === 'environment') {
        matches = input.environment === rule.pattern || rule.pattern === '*';
      }

      if (matches) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.action,
          action: rule.type,
        });

        if (rule.type === 'deny') {
          allowed = false;
        } else if (rule.type === 'require_approval') {
          requiresApproval = true;
        }
      }
    }

    // Check redaction rules
    for (const redact of policy.redactionRules.filter(r => r.enabled)) {
      if (redact.type === 'pii' && input.user) {
        redactedFields.push('user');
      }
    }

    // If no rules matched, default to allow
    if (matchedRules.length === 0) {
      matchedRules.push({
        ruleId: 'default',
        ruleName: 'Default allow (no rules matched)',
        action: 'allow',
      });
    }

    setResult({
      allowed,
      matchedRules,
      requiresApproval,
      redactedFields,
    });

    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setInput({ tool: '', repo: '', path: '', environment: 'dev', cost: 0, user: '' });
    setResult(null);
  };

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Policy Simulator</h3>
          <p className="text-sm text-muted-foreground">
            Test how this policy evaluates different scenarios
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Simulation Input</h4>
          
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Tool Name</label>
            <input
              type="text"
              value={input.tool}
              onChange={(e) => setInput({ ...input, tool: e.target.value })}
              placeholder="e.g., http_request, shell_exec"
              className="forge-input"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Repository</label>
            <input
              type="text"
              value={input.repo}
              onChange={(e) => setInput({ ...input, repo: e.target.value })}
              placeholder="e.g., org/repo-name"
              className="forge-input"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">File Path</label>
            <input
              type="text"
              value={input.path}
              onChange={(e) => setInput({ ...input, path: e.target.value })}
              placeholder="e.g., src/api/handlers.ts"
              className="forge-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Environment</label>
              <select
                value={input.environment}
                onChange={(e) => setInput({ ...input, environment: e.target.value })}
                className="forge-input"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Estimated Cost ($)</label>
              <input
                type="number"
                value={input.cost}
                onChange={(e) => setInput({ ...input, cost: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.01}
                className="forge-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">User Email</label>
            <input
              type="text"
              value={input.user}
              onChange={(e) => setInput({ ...input, user: e.target.value })}
              placeholder="e.g., alice@forge.dev"
              className="forge-input"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="forge-button px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4 mr-2" />
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>
            <button
              onClick={resetSimulation}
              className="forge-button px-4 py-2 hover:bg-muted"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <h4 className="text-sm font-medium mb-4">Simulation Result</h4>
          
          {!result ? (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Configure inputs and run simulation to see results</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Result */}
              <div className={`p-4 rounded-lg border ${
                result.allowed 
                  ? result.requiresApproval
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  {result.allowed ? (
                    result.requiresApproval ? (
                      <Clock className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      result.allowed 
                        ? result.requiresApproval ? 'text-yellow-900' : 'text-green-900'
                        : 'text-red-900'
                    }`}>
                      {result.allowed 
                        ? result.requiresApproval 
                          ? 'ALLOWED (Approval Required)' 
                          : 'ALLOWED'
                        : 'DENIED'
                      }
                    </p>
                    <p className={`text-sm ${
                      result.allowed 
                        ? result.requiresApproval ? 'text-yellow-700' : 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {result.matchedRules.length} rule(s) evaluated
                    </p>
                  </div>
                </div>
              </div>

              {/* Matched Rules */}
              <div>
                <h5 className="text-sm font-medium mb-2">Matched Rules</h5>
                <div className="space-y-2">
                  {result.matchedRules.map((rule, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        rule.action === 'allow' ? 'bg-green-50 border-green-200' :
                        rule.action === 'deny' ? 'bg-red-50 border-red-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {rule.action === 'allow' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {rule.action === 'deny' && <XCircle className="h-4 w-4 text-red-600" />}
                        {rule.action === 'require_approval' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        <span className="text-sm font-medium">{rule.ruleName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rule ID: {rule.ruleId} • Action: {rule.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Redacted Fields */}
              {result.redactedFields.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Redacted Fields</h5>
                  <div className="flex flex-wrap gap-2">
                    {result.redactedFields.map((field) => (
                      <span key={field} className="forge-badge forge-badge-warning">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PolicySimulator;
