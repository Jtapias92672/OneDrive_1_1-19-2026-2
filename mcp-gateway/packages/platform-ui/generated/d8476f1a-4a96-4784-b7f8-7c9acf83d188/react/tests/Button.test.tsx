import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders without crashing', () => {
    render(<Button />);
    expect(screen.getByText('Button')).toBeInTheDocument();
  });
});
