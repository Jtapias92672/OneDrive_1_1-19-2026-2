'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PersonaType } from '@/lib/persona/types';
import { forgeSignals } from '@/lib/signals';

interface DashboardOption {
  persona: PersonaType;
  name: string;
  description: string;
  route: string;
  color: string;
  features: string[];
}

const DASHBOARD_OPTIONS: DashboardOption[] = [
  {
    persona: 'disappointed',
    name: 'Reliability Focus',
    description: 'For those who value transparency and understanding what AI can and cannot do.',
    route: '/dashboard/reliability',
    color: 'blue',
    features: ['Reliability indicators', 'Confidence scores', 'Transparent limitations'],
  },
  {
    persona: 'hesitant',
    name: 'Compliance Focus',
    description: 'For teams with security requirements and organizational policies.',
    route: '/dashboard/compliance',
    color: 'green',
    features: ['Compliance status', 'Data classification', 'Audit trails'],
  },
  {
    persona: 'frontier',
    name: 'Capability Focus',
    description: 'For power users exploring AI capabilities and pushing boundaries.',
    route: '/dashboard/capability',
    color: 'purple',
    features: ['Frontier map', 'Calibration quiz', 'Experimental features'],
  },
];

// Mock current persona (would come from user profile in production)
const MOCK_CURRENT_PERSONA: PersonaType = 'disappointed';

export default function DashboardPreferencesPage() {
  const router = useRouter();
  const [currentPersona] = useState<PersonaType>(MOCK_CURRENT_PERSONA);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelect = useCallback((persona: PersonaType) => {
    if (persona !== currentPersona) {
      setSelectedPersona(persona);
      setShowConfirm(true);
    }
  }, [currentPersona]);

  const handleConfirm = useCallback(() => {
    if (!selectedPersona) return;

    const option = DASHBOARD_OPTIONS.find((o) => o.persona === selectedPersona);
    if (!option) return;

    // Emit persona override signal
    forgeSignals.track('persona_override', {
      fromPersona: currentPersona,
      toPersona: selectedPersona,
      dashboardRoute: option.route,
    });

    // In production: Update profile with overridePersona
    // await updateProfile({ dashboardPreferences: { overridePersona: selectedPersona } });

    // Redirect to new dashboard
    router.push(option.route);
  }, [selectedPersona, currentPersona, router]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setSelectedPersona(null);
  }, []);

  const currentOption = DASHBOARD_OPTIONS.find((o) => o.persona === currentPersona);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Preferences</h1>
          <p className="text-gray-600 mt-2">
            Choose the dashboard style that best fits your workflow
          </p>
        </div>

        {/* Current Dashboard */}
        {currentOption && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-500">Current Dashboard</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{currentOption.name}</h2>
            <p className="text-gray-600 mt-1">{currentOption.description}</p>
          </div>
        )}

        {/* Dashboard Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Available Styles</h3>

          <div className="grid gap-4 md:grid-cols-3">
            {DASHBOARD_OPTIONS.map((option) => {
              const isActive = option.persona === currentPersona;
              const colorClasses = {
                blue: 'border-blue-500 bg-blue-50',
                green: 'border-green-500 bg-green-50',
                purple: 'border-purple-500 bg-purple-50',
              }[option.color];

              return (
                <button
                  key={option.persona}
                  onClick={() => handleSelect(option.persona)}
                  disabled={isActive}
                  className={`text-left p-6 rounded-lg border-2 transition-all ${
                    isActive
                      ? `${colorClasses} cursor-default`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Preview Thumbnail */}
                  <div
                    className={`h-24 rounded-md mb-4 flex items-center justify-center ${
                      isActive ? 'bg-white/50' : 'bg-gray-100'
                    }`}
                  >
                    <span className="text-4xl">
                      {option.color === 'blue' && '📊'}
                      {option.color === 'green' && '🔒'}
                      {option.color === 'purple' && '🚀'}
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-900">{option.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{option.description}</p>

                  {/* Features */}
                  <ul className="space-y-1">
                    {option.features.map((feature) => (
                      <li key={feature} className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isActive && (
                    <div className="mt-4 text-sm text-gray-500 font-medium">
                      Currently active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <p className="text-sm text-gray-500 mt-8">
          You can change your dashboard style at any time. Your data and preferences will be preserved.
        </p>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mt-8 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && selectedPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Change Dashboard Style?
            </h3>
            <p className="text-gray-600 mb-6">
              You're about to switch to the{' '}
              <strong>
                {DASHBOARD_OPTIONS.find((o) => o.persona === selectedPersona)?.name}
              </strong>{' '}
              dashboard. Your data and preferences will be preserved.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
