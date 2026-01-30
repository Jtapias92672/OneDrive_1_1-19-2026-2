import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame6 } from './Frame6';

describe('Frame6', () => {
  it('renders without crashing', () => {
    render(<Frame6 />);
    expect(screen.getByText('Frame6')).toBeInTheDocument();
  });
});
