/**
 * FORGE Platform UI - Policy Rule Editor
 * @epic 10d - Governance Console
 */

'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  GripVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { PolicyRule } from '@/lib/types/governance';

interface PolicyRuleEditorProps {
  rule: PolicyRule;
  onUpdate: (updates: Partial<PolicyRule>) => void;
  onDelete: () => void;
}

export function PolicyRuleEditor({ rule, onUpdate, onDelete }: PolicyRuleEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = {
    allow: { icon: ShieldCheck, class: 'text-green-600 bg-green-50 border-green-200' },
    deny: { icon: ShieldAlert, class: 'text-red-600 bg-red-50 border-red-200' },
    require_approval: { icon: Shield, class: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  };

  const config = typeConfig[rule.type];
  const Icon = config.icon;

  const categoryOptions = [
    { value: 'tool', label: 'Tool' },
    { value: 'repo', label: 'Repository' },
    { value: 'path', label: 'File Path' },
    { value: 'environment', label: 'Environment' },
    { value: 'cost', label: 'Cost' },
    { value: 'time', label: 'Time Window' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className={`border rounded-lg overflow-hidden ${config.class}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-white/80">
        <button className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <Icon className="h-5 w-5" />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <select
              value={rule.type}
              onChange={(e) => onUpdate({ type: e.target.value as PolicyRule['type'] })}
              className="text-sm font-medium bg-transparent border-none p-0 pr-6 focus:ring-0 cursor-pointer"
            >
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
              <option value="require_approval">Require Approval</option>
            </select>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm">{rule.category}</span>
            <span className="text-muted-foreground">•</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {rule.pattern || '(no pattern)'}
            </code>
          </div>
          {rule.action && (
            <p className="text-sm text-muted-foreground">{rule.action}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Priority: {rule.priority}
          </span>
          
          <button
            onClick={() => onUpdate({ enabled: !rule.enabled })}
            className={`p-1 rounded ${rule.enabled ? 'text-green-600' : 'text-muted-foreground'}`}
            title={rule.enabled ? 'Enabled' : 'Disabled'}
          >
            {rule.enabled ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            title="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white border-t space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={rule.category}
                onChange={(e) => onUpdate({ category: e.target.value as PolicyRule['category'] })}
                className="forge-input"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Pattern Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Pattern Type</label>
              <select
                value={rule.patternType}
                onChange={(e) => onUpdate({ patternType: e.target.value as PolicyRule['patternType'] })}
                className="forge-input"
              >
                <option value="exact">Exact Match</option>
                <option value="glob">Glob Pattern</option>
                <option value="regex">Regular Expression</option>
              </select>
            </div>
          </div>

          {/* Pattern */}
          <div>
            <label className="block text-sm font-medium mb-1">Pattern</label>
            <input
              type="text"
              value={rule.pattern}
              onChange={(e) => onUpdate({ pattern: e.target.value })}
              placeholder={
                rule.patternType === 'exact' ? 'tool_name' :
                rule.patternType === 'glob' ? 'src/**/*.ts' :
                '^api_.*'
              }
              className="forge-input font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {rule.patternType === 'exact' && 'Matches exactly this value'}
              {rule.patternType === 'glob' && 'Use * for single segment, ** for multiple segments'}
              {rule.patternType === 'regex' && 'JavaScript regular expression'}
            </p>
          </div>

          {/* Action Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Action Description</label>
            <input
              type="text"
              value={rule.action}
              onChange={(e) => onUpdate({ action: e.target.value })}
              placeholder="What this rule does..."
              className="forge-input"
            />
          </div>

          {/* Message (for deny rules) */}
          {rule.type === 'deny' && (
            <div>
              <label className="block text-sm font-medium mb-1">Denial Message</label>
              <input
                type="text"
                value={rule.message || ''}
                onChange={(e) => onUpdate({ message: e.target.value })}
                placeholder="Message shown when this rule blocks an action..."
                className="forge-input"
              />
            </div>
          )}

          {/* Conditions */}
          {(rule.category === 'cost' || rule.type === 'require_approval') && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Conditions</label>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Cost ($)</label>
                  <input
                    type="number"
                    value={rule.conditions?.maxCost || ''}
                    onChange={(e) => onUpdate({ 
                      conditions: { 
                        ...rule.conditions, 
                        maxCost: e.target.value ? parseFloat(e.target.value) : undefined 
                      } 
                    })}
                    className="forge-input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Iterations</label>
                  <input
                    type="number"
                    value={rule.conditions?.maxIterations || ''}
                    onChange={(e) => onUpdate({ 
                      conditions: { 
                        ...rule.conditions, 
                        maxIterations: e.target.value ? parseInt(e.target.value) : undefined 
                      } 
                    })}
                    className="forge-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Duration (s)</label>
                  <input
                    type="number"
                    value={rule.conditions?.maxDuration || ''}
                    onChange={(e) => onUpdate({ 
                      conditions: { 
                        ...rule.conditions, 
                        maxDuration: e.target.value ? parseInt(e.target.value) : undefined 
                      } 
                    })}
                    className="forge-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-4">
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Priority</label>
              <input
                type="number"
                value={rule.priority}
                onChange={(e) => onUpdate({ priority: parseInt(e.target.value) })}
                min={1}
                className="forge-input"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              Lower numbers = higher priority. Rules are evaluated in priority order.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PolicyRuleEditor;
