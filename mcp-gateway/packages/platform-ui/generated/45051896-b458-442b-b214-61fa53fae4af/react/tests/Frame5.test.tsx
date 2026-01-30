import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame5 } from './Frame5';

describe('Frame5', () => {
  it('renders without crashing', () => {
    render(<Frame5 />);
    expect(screen.getByText('Frame5')).toBeInTheDocument();
  });
});
