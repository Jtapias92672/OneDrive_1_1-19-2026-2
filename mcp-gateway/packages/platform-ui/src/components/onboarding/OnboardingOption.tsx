'use client';

interface OnboardingOptionProps {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
}

export function OnboardingOption({ value, label, selected, onSelect }: OnboardingOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`
        w-full p-4 rounded-lg border-2 text-left transition-all duration-200
        ${selected
          ? 'border-blue-600 bg-blue-50 text-blue-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center">
        <div
          className={`
            w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
            ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}
          `}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="font-medium">{label}</span>
      </div>
    </button>
  );
}
