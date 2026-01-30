/**
 * Frame3
 * Generated from Figma: "Frame 3"
 * Type: FRAME
 */
import React from 'react';

export interface Frame3Props {
  className?: string;
  children?: React.ReactNode;
}

export const Frame3: React.FC<Frame3Props> = ({ className, children }) => {
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
      {children || <span>Frame 3</span>}
    </div>
  );
};

export default Frame3;
