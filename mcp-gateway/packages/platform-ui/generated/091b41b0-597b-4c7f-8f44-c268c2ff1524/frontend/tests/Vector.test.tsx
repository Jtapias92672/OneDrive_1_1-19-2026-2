import React from 'react';
import { render, screen } from '@testing-library/react';
import { Vector } from './Vector';

describe('Vector', () => {
  it('renders without crashing', () => {
    render(<Vector />);
    expect(screen.getByText('Vector')).toBeInTheDocument();
  });
});
