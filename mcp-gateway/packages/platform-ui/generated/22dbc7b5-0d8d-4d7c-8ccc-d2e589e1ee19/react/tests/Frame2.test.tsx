import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame2 } from './Frame2';

describe('Frame2', () => {
  it('renders without crashing', () => {
    render(<Frame2 />);
    expect(screen.getByText('Frame2')).toBeInTheDocument();
  });
});
