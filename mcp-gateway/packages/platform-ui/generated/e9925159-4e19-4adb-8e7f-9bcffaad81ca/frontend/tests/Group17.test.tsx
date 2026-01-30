import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group17 } from './Group17';

describe('Group17', () => {
  it('renders without crashing', () => {
    render(<Group17 />);
    expect(screen.getByText('Group17')).toBeInTheDocument();
  });
});
