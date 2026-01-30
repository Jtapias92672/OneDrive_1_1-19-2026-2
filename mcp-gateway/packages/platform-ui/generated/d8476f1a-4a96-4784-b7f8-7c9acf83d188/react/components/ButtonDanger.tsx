import React from 'react';

interface ButtonDangerProps {
  disabled?: boolean;
}

export function ButtonDanger({ onClick, disabled }: ButtonDangerProps) {
  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      {/* Generated from Figma component: Button Danger */}
      <span className="text-gray-700">ButtonDanger</span>
    </div>
  );
}

export default ButtonDanger;
