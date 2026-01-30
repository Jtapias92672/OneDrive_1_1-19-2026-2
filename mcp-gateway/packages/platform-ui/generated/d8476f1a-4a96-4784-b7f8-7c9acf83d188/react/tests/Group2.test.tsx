import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group2 } from './Group2';

describe('Group2', () => {
  it('renders without crashing', () => {
    render(<Group2 />);
    expect(screen.getByText('Group2')).toBeInTheDocument();
  });
});
