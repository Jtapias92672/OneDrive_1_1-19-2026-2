/**
 * FORGE Platform UI - Contracts Library Page
 * @epic 10a - Platform UI Core
 * @task 10a.3.2 - Create contract library
 */

'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import { ContractList } from '@/components/contracts/contract-list';
import { ContractCard } from '@/components/contracts/contract-card';

// Sample contracts data
const sampleContracts = [
  {
    id: 'api-validator',
    name: 'API Response Validator',
    description: 'Validates API responses against schema and semantic requirements',
    version: '1.0.0',
    validators: ['schema', 'semantic', 'rubric'],
    targetScore: 0.95,
    lastRun: '2 hours ago',
    successRate: 94.2,
    runCount: 156,
  },
  {
    id: 'code-review',
    name: 'Code Review Contract',
    description: 'Automated code review with best practices validation',
    version: '2.1.0',
    validators: ['schema', 'semantic', 'computational'],
    targetScore: 0.90,
    lastRun: '1 hour ago',
    successRate: 88.5,
    runCount: 89,
  },
  {
    id: 'doc-summarizer',
    name: 'Document Summarizer',
    description: 'Generates concise summaries of long documents',
    version: '1.2.0',
    validators: ['semantic', 'rubric'],
    targetScore: 0.92,
    lastRun: '30 minutes ago',
    successRate: 96.1,
    runCount: 234,
  },
  {
    id: 'email-generator',
    name: 'Email Template Generator',
    description: 'Creates professional email templates based on context',
    version: '1.0.0',
    validators: ['schema', 'semantic'],
    targetScore: 0.95,
    lastRun: '3 hours ago',
    successRate: 97.8,
    runCount: 67,
  },
];

export default function ContractsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredContracts = sampleContracts.filter(contract =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 mt-14">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground">
            Manage your answer contract definitions
          </p>
        </div>
        
        <button className="forge-button h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="forge-input pl-10"
          />
        </div>

        {/* Filter */}
        <button 
          onClick={() => setFilterOpen(!filterOpen)}
          className={`forge-button h-10 px-3 ${filterOpen ? 'bg-muted' : 'hover:bg-muted'}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>

        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <button
            onClick={() => setView('grid')}
            className={`forge-button h-9 w-9 rounded-r-none ${
              view === 'grid' ? 'bg-muted' : 'hover:bg-muted'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`forge-button h-9 w-9 rounded-l-none border-l ${
              view === 'list' ? 'bg-muted' : 'hover:bg-muted'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contract Display */}
      {view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      ) : (
        <ContractList contracts={filteredContracts} />
      )}

      {/* Empty State */}
      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No contracts found</p>
          <button className="forge-button h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create your first contract
          </button>
        </div>
      )}
    </div>
  );
}
