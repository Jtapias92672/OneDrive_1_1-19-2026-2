import React from 'react';
import { render, screen } from '@testing-library/react';
import { WelcomeToArcFoundry } from './WelcomeToArcFoundry';

describe('WelcomeToArcFoundry', () => {
  it('renders without crashing', () => {
    render(<WelcomeToArcFoundry />);
    expect(screen.getByText('WelcomeToArcFoundry')).toBeInTheDocument();
  });
});
