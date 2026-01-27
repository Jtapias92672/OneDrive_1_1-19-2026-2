'use client';

import { FrontierMapData } from '@/lib/persona/capability-types';

interface FrontierMapProps {
  data: FrontierMapData;
  onExpandMap?: () => void;
  onTakeQuiz?: () => void;
}

export function FrontierMap({ data, onExpandMap, onTakeQuiz }: FrontierMapProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-purple-200">
        <h3 className="font-semibold text-gray-900">
          Frontier Map: What AI Does Well vs. Where You Add Value
        </h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {data.zones.map((zone) => (
            <ZoneCard key={zone.zone} zone={zone} />
          ))}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={onExpandMap}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Expand Map
          </button>
          <button
            onClick={onTakeQuiz}
            className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Take Calibration Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

interface ZoneCardProps {
  zone: FrontierMapData['zones'][0];
}

function ZoneCard({ zone }: ZoneCardProps) {
  const bgColors: Record<string, string> = {
    'ai-alone': 'bg-green-50 border-green-200',
    hybrid: 'bg-purple-100 border-purple-300',
    'human-alone': 'bg-amber-50 border-amber-200',
  };

  const headerColors: Record<string, string> = {
    'ai-alone': 'text-green-700',
    hybrid: 'text-purple-700',
    'human-alone': 'text-amber-700',
  };

  return (
    <div className={`${bgColors[zone.zone]} border rounded-lg p-3`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`font-semibold text-sm ${headerColors[zone.zone]}`}>
          {zone.name}
        </span>
        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded">
          {zone.reliabilityRange}
        </span>
      </div>
      <ul className="space-y-1">
        {zone.examples.slice(0, 4).map((example, idx) => (
          <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
            <span className="text-gray-400">•</span>
            {example}
          </li>
        ))}
      </ul>
    </div>
  );
}
