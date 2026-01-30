import React from 'react';
import { render, screen } from '@testing-library/react';
import { RegisterForAccount } from './RegisterForAccount';

describe('RegisterForAccount', () => {
  it('renders without crashing', () => {
    render(<RegisterForAccount />);
    expect(screen.getByText('RegisterForAccount')).toBeInTheDocument();
  });
});
