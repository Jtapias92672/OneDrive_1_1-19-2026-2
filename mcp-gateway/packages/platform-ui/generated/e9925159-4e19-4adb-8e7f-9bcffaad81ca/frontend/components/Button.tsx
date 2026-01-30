import React from 'react';

interface ButtonProps {
  disabled?: boolean;
}

export function Button({ onClick, disabled, children }: ButtonProps) {
  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      {/* Generated from Figma component: Button */}
      <span className="text-gray-700">Button</span>
    </div>
  );
}

export default Button;
