import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame7 } from './Frame7';

describe('Frame7', () => {
  it('renders without crashing', () => {
    render(<Frame7 />);
    expect(screen.getByText('Frame7')).toBeInTheDocument();
  });
});
