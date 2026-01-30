import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group4 } from './Group4';

describe('Group4', () => {
  it('renders without crashing', () => {
    render(<Group4 />);
    expect(screen.getByText('Group4')).toBeInTheDocument();
  });
});
