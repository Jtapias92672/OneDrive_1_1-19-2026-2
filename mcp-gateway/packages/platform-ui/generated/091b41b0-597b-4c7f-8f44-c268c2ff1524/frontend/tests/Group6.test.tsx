import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group6 } from './Group6';

describe('Group6', () => {
  it('renders without crashing', () => {
    render(<Group6 />);
    expect(screen.getByText('Group6')).toBeInTheDocument();
  });
});
