/**
 * Frame6
 * Generated from Figma: "Frame 6"
 * Type: FRAME
 */
import React from 'react';

export interface Frame6Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame6: React.FC<Frame6Props> = ({ className, children }) => {
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
      {children || <span>Frame 6</span>}
    </div>
  );
};

export default Frame6;
