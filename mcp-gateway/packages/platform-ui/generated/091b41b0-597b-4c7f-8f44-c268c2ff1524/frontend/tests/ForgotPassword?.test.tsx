import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForgotPassword? } from './ForgotPassword?';

describe('ForgotPassword?', () => {
  it('renders without crashing', () => {
    render(<ForgotPassword? />);
    expect(screen.getByText('ForgotPassword?')).toBeInTheDocument();
  });
});
