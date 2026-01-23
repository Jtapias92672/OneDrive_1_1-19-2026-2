/**
 * FORGE Platform UI - Contract Editor Page
 * @epic 10a - Platform UI Core
 * @task 10a.3.1 - Create contract editor
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Save, Play, ArrowLeft, Copy, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ContractEditor } from '@/components/contracts/contract-editor';
import { YamlEditor } from '@/components/contracts/yaml-editor';

// Sample contract data
const sampleContract = {
  id: 'api-validator',
  name: 'API Response Validator',
  version: '1.0.0',
  yaml: `name: api-response-validator
version: 1.0.0
description: Validates API responses against schema

schema:
  type: object
  required:
    - data
    - status
  properties:
    data:
      type: object
    status:
      type: integer
      minimum: 200
      maximum: 599

validators:
  - id: schema
    type: schema
    weight: 0.4
  - id: semantic
    type: semantic
    weight: 0.3
    config:
      criteria:
        - Response is well-formed JSON
        - Status code matches expected range
  - id: completeness
    type: rubric
    weight: 0.3

target_score: 0.95
max_iterations: 5`,
};

export default function ContractEditorPage() {
  const params = useParams();
  const contractId = params.id as string;
  
  const [contract, setContract] = useState(sampleContract);
  const [yaml, setYaml] = useState(sampleContract.yaml);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleYamlChange = (newYaml: string) => {
    setYaml(newYaml);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsDirty(false);
    setIsSaving(false);
  };

  const handleRun = () => {
    // Navigate to execution
    window.location.href = `/executions/new?contract=${contractId}`;
  };

  return (
    <div className="space-y-6 mt-14">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Contracts', href: '/contracts' },
          { label: contract.name },
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="forge-button h-9 w-9 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{contract.name}</h1>
            <p className="text-sm text-muted-foreground">
              Version {contract.version} • ID: {contractId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="forge-button h-9 px-3 hover:bg-muted">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </button>
          <button className="forge-button h-9 px-3 hover:bg-muted text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
          <button 
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="forge-button h-9 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={handleRun}
            className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            Run
          </button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* YAML Editor */}
        <div className="forge-card p-0 overflow-hidden">
          <div className="border-b px-4 py-3 bg-muted/30">
            <h3 className="font-medium">Contract Definition</h3>
            <p className="text-xs text-muted-foreground">Edit the YAML contract</p>
          </div>
          <YamlEditor value={yaml} onChange={handleYamlChange} />
        </div>

        {/* Preview Panel */}
        <div className="forge-card">
          <ContractEditor yaml={yaml} />
        </div>
      </div>
    </div>
  );
}
