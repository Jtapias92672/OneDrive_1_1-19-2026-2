/**
 * Frame7
 * Generated from Figma: "Frame 7"
 * Type: FRAME
 */
import React from 'react';

export interface Frame7Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame7: React.FC<Frame7Props> = ({ className, children }) => {
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
      {children || <span>Frame 7</span>}
    </div>
  );
};

export default Frame7;
