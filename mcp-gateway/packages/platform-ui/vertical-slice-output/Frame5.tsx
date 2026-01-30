/**
 * Frame5
 * Generated from Figma: "Frame 5"
 * Type: FRAME
 */
import React from 'react';

export interface Frame5Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame5: React.FC<Frame5Props> = ({ className, children }) => {
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
      {children || <span>Frame 5</span>}
    </div>
  );
};

export default Frame5;
