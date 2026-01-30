import React from 'react';
import { render, screen } from '@testing-library/react';
import { PasswordConfirmation } from './PasswordConfirmation';

describe('PasswordConfirmation', () => {
  it('renders without crashing', () => {
    render(<PasswordConfirmation />);
    expect(screen.getByText('PasswordConfirmation')).toBeInTheDocument();
  });
});
