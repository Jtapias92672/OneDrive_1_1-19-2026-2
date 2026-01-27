'use client';

import { PersonaType } from '@/lib/persona/types';

interface OnboardingCompleteProps {
  persona: PersonaType;
  onContinue: () => void;
}

const personaInfo: Record<PersonaType, { title: string; description: string; icon: string }> = {
  disappointed: {
    title: 'Reliability Dashboard',
    description: "We'll show you proven templates and track your success rate to rebuild your trust in AI tools.",
    icon: '🎯',
  },
  hesitant: {
    title: 'Compliance Dashboard',
    description: "We'll prioritize security, audit trails, and evidence packs so you can work with confidence.",
    icon: '🔒',
  },
  frontier: {
    title: 'Capability Dashboard',
    description: "We'll help you understand AI boundaries with our frontier map and calibration tools.",
    icon: '🧭',
  },
  beginner: {
    title: 'Guided Dashboard',
    description: "We'll walk you through everything with tutorials and helpful tips along the way.",
    icon: '🚀',
  },
  unclassified: {
    title: 'Default Dashboard',
    description: "You can customize your experience anytime in settings.",
    icon: '✨',
  },
};

export function OnboardingComplete({ persona, onContinue }: OnboardingCompleteProps) {
  const info = personaInfo[persona];

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="text-6xl mb-6">{info.icon}</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to Forge!
      </h2>
      <p className="text-lg text-gray-600 mb-2">
        Based on your answers, we&apos;ve set up your
      </p>
      <p className="text-xl font-semibold text-blue-600 mb-4">{info.title}</p>
      <p className="text-gray-600 mb-8">{info.description}</p>

      <button
        onClick={onContinue}
        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>

      <p className="text-sm text-gray-500 mt-6">
        You can change your dashboard style anytime in Settings
      </p>
    </div>
  );
}
