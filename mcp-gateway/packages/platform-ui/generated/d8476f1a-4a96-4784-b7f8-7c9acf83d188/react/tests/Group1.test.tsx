import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group1 } from './Group1';

describe('Group1', () => {
  it('renders without crashing', () => {
    render(<Group1 />);
    expect(screen.getByText('Group1')).toBeInTheDocument();
  });
});
