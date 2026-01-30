import React from 'react';
import { render, screen } from '@testing-library/react';
import { Frame4 } from './Frame4';

describe('Frame4', () => {
  it('renders without crashing', () => {
    render(<Frame4 />);
    expect(screen.getByText('Frame4')).toBeInTheDocument();
  });
});
