/**
 * FORGE Platform UI - Contract Editor Preview
 * @epic 10a - Platform UI Core
 * @task 10a.3.1 - Create contract editor
 */

'use client';

import { useMemo, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Target,
  Repeat,
  Scale
} from 'lucide-react';
import * as yaml from 'yaml';

interface ContractEditorProps {
  yaml: string;
}

interface ParsedContract {
  name?: string;
  version?: string;
  description?: string;
  schema?: Record<string, any>;
  validators?: Array<{
    id: string;
    type: string;
    weight: number;
    config?: Record<string, any>;
  }>;
  target_score?: number;
  max_iterations?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function ContractEditor({ yaml: yamlContent }: ContractEditorProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'validation'>('preview');

  const { parsed, validation } = useMemo(() => {
    let parsed: ParsedContract | null = null;
    const validation: ValidationResult = { valid: true, errors: [], warnings: [] };

    try {
      parsed = yaml.parse(yamlContent) as ParsedContract;
      
      // Validate required fields
      if (!parsed.name) {
        validation.errors.push('Contract name is required');
        validation.valid = false;
      }
      
      if (!parsed.validators || parsed.validators.length === 0) {
        validation.errors.push('At least one validator is required');
        validation.valid = false;
      }
      
      // Check validator weights sum to 1
      if (parsed.validators) {
        const totalWeight = parsed.validators.reduce((sum, v) => sum + (v.weight || 0), 0);
        if (Math.abs(totalWeight - 1) > 0.01) {
          validation.warnings.push(`Validator weights sum to ${totalWeight.toFixed(2)}, should be 1.0`);
        }
      }
      
      // Check target score
      if (!parsed.target_score) {
        validation.warnings.push('No target score defined, defaulting to 0.95');
      }
      
    } catch (e: any) {
      validation.valid = false;
      validation.errors.push(`YAML parse error: ${e.message}`);
    }

    return { parsed, validation };
  }, [yamlContent]);

  return (
    <div className="h-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'preview' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'validation' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Validation
          {validation.valid ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </button>
      </div>

      {activeTab === 'preview' && parsed && (
        <div className="space-y-6">
          {/* Contract Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Contract Info</h4>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{parsed.name || 'Unnamed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>{parsed.version || '1.0.0'}</span>
              </div>
              {parsed.description && (
                <p className="text-muted-foreground mt-1">{parsed.description}</p>
              )}
            </div>
          </div>

          {/* Validators */}
          {parsed.validators && parsed.validators.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Validators ({parsed.validators.length})</h4>
              </div>
              <div className="space-y-2">
                {parsed.validators.map((validator, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{validator.id}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {validator.type}
                      </span>
                    </div>
                    <span className="forge-badge forge-badge-success">
                      {(validator.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Convergence Settings */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Convergence</h4>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Score</span>
                <span className="font-medium">
                  {((parsed.target_score || 0.95) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Iterations</span>
                <span>{parsed.max_iterations || 5}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-4">
          {/* Status */}
          <div className={`p-3 rounded-md ${
            validation.valid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
          }`}>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Contract is valid
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-300">
                    Contract has errors
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Errors</h4>
              <ul className="space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContractEditor;
