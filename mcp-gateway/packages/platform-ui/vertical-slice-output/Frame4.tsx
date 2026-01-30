/**
 * Frame4
 * Generated from Figma: "Frame 4"
 * Type: FRAME
 */
import React from 'react';

export interface Frame4Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame4: React.FC<Frame4Props> = ({ className, children }) => {
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
      {children || <span>Frame 4</span>}
    </div>
  );
};

export default Frame4;
