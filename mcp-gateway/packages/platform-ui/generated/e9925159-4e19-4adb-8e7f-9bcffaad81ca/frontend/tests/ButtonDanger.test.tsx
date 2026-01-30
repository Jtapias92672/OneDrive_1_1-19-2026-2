import React from 'react';
import { render, screen } from '@testing-library/react';
import { ButtonDanger } from './ButtonDanger';

describe('ButtonDanger', () => {
  it('renders without crashing', () => {
    render(<ButtonDanger />);
    expect(screen.getByText('ButtonDanger')).toBeInTheDocument();
  });
});
