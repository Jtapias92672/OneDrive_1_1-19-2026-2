'use client';

/**
 * FORGE-Cowork Dashboard
 * Unified interface for FORGE epic management with Cowork's conversational AI
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { MainContent } from './components/MainContent';
import { EvidencePacksCard } from './components/RightPanel/EvidencePacksCard';
import { CarsFrameworkCard } from './components/RightPanel/CarsFrameworkCard';
import { SupplyChainCard } from './components/RightPanel/SupplyChainCard';
import { AgentMemoryCard } from './components/RightPanel/AgentMemoryCard';
import { VerificationCard } from './components/RightPanel/VerificationCard';

export type DemoMode = 'normal' | 'warning' | 'critical';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ForgeCoworkDashboard() {
  const [demoMode, setDemoMode] = useState<DemoMode>('normal');
  const [activeNav, setActiveNav] = useState('Chat');
  const [expandedSections, setExpandedSections] = useState({
    evidencePacks: true,
    cars: true,
    supplyChain: false,
    memory: true,
    verification: true,
  });

  // Fetch all data sources with demo mode
  const { data: evidencePacks } = useSWR(
    `/api/evidence-packs?demoMode=${demoMode}`,
    fetcher
  );
  const { data: carsStatus } = useSWR(
    `/api/cars?demoMode=${demoMode}`,
    fetcher
  );
  const { data: supplyChain } = useSWR(
    `/api/supply-chain?demoMode=${demoMode}`,
    fetcher
  );
  const { data: tokens } = useSWR(
    `/api/session/tokens?demoMode=${demoMode}`,
    fetcher
  );
  const { data: guardrails } = useSWR(
    `/api/guardrails?demoMode=${demoMode}`,
    fetcher
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header
        evidencePacks={evidencePacks}
        supplyChain={supplyChain}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
        />

        <MainContent />

        {/* Right Panel */}
        <aside className="w-[360px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <EvidencePacksCard
              data={evidencePacks}
              expanded={expandedSections.evidencePacks}
              onToggle={() => toggleSection('evidencePacks')}
            />

            <CarsFrameworkCard
              data={carsStatus}
              expanded={expandedSections.cars}
              onToggle={() => toggleSection('cars')}
            />

            <SupplyChainCard
              data={supplyChain}
              expanded={expandedSections.supplyChain}
              onToggle={() => toggleSection('supplyChain')}
            />

            <AgentMemoryCard
              tokens={tokens}
              guardrails={guardrails}
              demoMode={demoMode}
              onDemoModeChange={setDemoMode}
              expanded={expandedSections.memory}
              onToggle={() => toggleSection('memory')}
            />

            <VerificationCard
              expanded={expandedSections.verification}
              onToggle={() => toggleSection('verification')}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
