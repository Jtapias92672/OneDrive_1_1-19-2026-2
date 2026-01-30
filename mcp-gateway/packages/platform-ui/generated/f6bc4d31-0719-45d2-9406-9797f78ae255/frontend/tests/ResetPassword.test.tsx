import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResetPassword } from './ResetPassword';

describe('ResetPassword', () => {
  it('renders without crashing', () => {
    render(<ResetPassword />);
    expect(screen.getByText('ResetPassword')).toBeInTheDocument();
  });
});
