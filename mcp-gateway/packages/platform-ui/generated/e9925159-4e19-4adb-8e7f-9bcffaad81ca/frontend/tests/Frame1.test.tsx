import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame1 } from './Frame1';

describe('Frame1', () => {
  it('renders without crashing', () => {
    render(<Frame1 />);
    expect(screen.getByText('Frame1')).toBeInTheDocument();
  });
});
