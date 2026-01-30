import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame } from './Frame';

describe('Frame', () => {
  it('renders without crashing', () => {
    render(<Frame />);
    expect(screen.getByText('Frame')).toBeInTheDocument();
  });
});
