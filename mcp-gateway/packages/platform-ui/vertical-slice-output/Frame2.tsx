/**
 * Frame2
 * Generated from Figma: "Frame 2"
 * Type: FRAME
 */
import React from 'react';

export interface Frame2Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame2: React.FC<Frame2Props> = ({ className, children }) => {
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
      {children || <span>Frame 2</span>}
    </div>
  );
};

export default Frame2;
