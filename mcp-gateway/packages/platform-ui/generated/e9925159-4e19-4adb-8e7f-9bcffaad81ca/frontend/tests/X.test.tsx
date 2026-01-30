import React from 'react';
import { render, screen } from '@testing-library/react';
import { X } from './X';

describe('X', () => {
  it('renders without crashing', () => {
    render(<X />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
