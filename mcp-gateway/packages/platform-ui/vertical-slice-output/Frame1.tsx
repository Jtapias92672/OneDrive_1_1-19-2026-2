/**
 * Frame1
 * Generated from Figma: "Frame 1"
 * Type: FRAME
 */
import React from 'react';

export interface Frame1Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame1: React.FC<Frame1Props> = ({ className, children }) => {
  return (
    <div
      className={className}
      style={{
        width: 1440,
        height: 1024,
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 0,
        boxSizing: 'border-box',
      }}
    >
      {children || <span>Frame 1</span>}
    </div>
  );
};

export default Frame1;
