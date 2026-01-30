import React from 'react';
import { render, screen } from '@testing-library/react';
import { Star } from './Star';

describe('Star', () => {
  it('renders without crashing', () => {
    render(<Star />);
    expect(screen.getByText('Star')).toBeInTheDocument();
  });
});
