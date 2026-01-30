import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame3 } from './Frame3';

describe('Frame3', () => {
  it('renders without crashing', () => {
    render(<Frame3 />);
    expect(screen.getByText('Frame3')).toBeInTheDocument();
  });
});
