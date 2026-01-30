import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group16 } from './Group16';

describe('Group16', () => {
  it('renders without crashing', () => {
    render(<Group16 />);
    expect(screen.getByText('Group16')).toBeInTheDocument();
  });
});
