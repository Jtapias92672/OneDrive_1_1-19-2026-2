import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group8 } from './Group8';

describe('Group8', () => {
  it('renders without crashing', () => {
    render(<Group8 />);
    expect(screen.getByText('Group8')).toBeInTheDocument();
  });
});
