import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group13 } from './Group13';

describe('Group13', () => {
  it('renders without crashing', () => {
    render(<Group13 />);
    expect(screen.getByText('Group13')).toBeInTheDocument();
  });
});
